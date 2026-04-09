from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship

from database import get_db, Base
from routers.partner_application import (
    PartnerApplication, _verify_password_for,
    send_approval_email, _send, SMTP_USER, FROM_NAME,
    ADMIN_EMAIL, FRONTEND_BASE
)

router = APIRouter(prefix="/api/subscription", tags=["Subscription"])

# ── Plan definitions ──────────────────────────────────────────
PLANS = {
    "1month":  {"days": 30,  "amount": 20,  "label": "1 Month"},
    "3months": {"days": 90,  "amount": 50,  "label": "3 Months"},
    "6months": {"days": 180, "amount": 110, "label": "6 Months"},
    "1year":   {"days": 365, "amount": 220, "label": "1 Year"},
}

# Payment info shown to partners
PAYMENT_INFO = {
    "card_number": "5614 6835 1480 7353",
    "card_holder": "Hamzayev Temurbek",
    "bank":        "Anor Bank",
    "note":        "Send payment and upload screenshot as proof"
}


# ── DB Model ─────────────────────────────────────────────────

class RenewalRequest(Base):
    __tablename__ = "renewal_requests"

    id                = Column(Integer, primary_key=True, index=True)
    application_id    = Column(Integer, ForeignKey("partner_applications.id"), nullable=False)
    business_name     = Column(String(255), nullable=False)
    business_type     = Column(String(50),  nullable=False)
    email             = Column(String(255), nullable=False)
    plan              = Column(String(50),  nullable=False)
    plan_amount       = Column(Integer,     nullable=False)
    payment_proof_url = Column(String(500), nullable=True)
    status            = Column(String(20),  nullable=False, default="pending")
    requested_at      = Column(DateTime,    default=datetime.utcnow)
    reviewed_at       = Column(DateTime,    nullable=True)
    reviewed_by       = Column(String(100), nullable=True)
    rejection_reason  = Column(Text,        nullable=True)


# ── Schemas ──────────────────────────────────────────────────

class RenewalSubmit(BaseModel):
    email:             str
    plan:              str
    payment_proof_url: Optional[str] = None

class RenewalReview(BaseModel):
    status:           str            # "approved" or "rejected"
    rejection_reason: Optional[str] = None
    admin_email:      Optional[str] = "admin"


# ── PARTNER ENDPOINTS ─────────────────────────────────────────

@router.get("/status")
async def get_subscription_status(email: str, db: Session = Depends(get_db)):
    """
    Returns subscription info for a partner.
    Called by the partner dashboard on load.
    """
    app = db.query(PartnerApplication).filter(
        PartnerApplication.email == email,
        PartnerApplication.status == "approved"
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="No approved account found for this email.")

    now = datetime.utcnow()

    # Calculate days remaining
    days_remaining  = None
    in_grace_period = False
    is_expired      = False

    if app.plan_end_date:
        delta = (app.plan_end_date - now).days
        if delta > 0:
            days_remaining = delta
        elif app.grace_period_end and now < app.grace_period_end:
            in_grace_period = True
            days_remaining  = 0
        else:
            is_expired     = True
            days_remaining = 0

    # Check for pending renewal request
    pending_renewal = db.query(RenewalRequest).filter(
        RenewalRequest.email  == email,
        RenewalRequest.status == "pending"
    ).first()

    return {
        "plan":              app.plan,
        "plan_amount":       app.plan_amount,
        "plan_status":       app.plan_status or "active",
        "plan_start_date":   app.plan_start_date.isoformat() if app.plan_start_date else None,
        "plan_end_date":     app.plan_end_date.isoformat()   if app.plan_end_date   else None,
        "grace_period_end":  app.grace_period_end.isoformat() if app.grace_period_end else None,
        "days_remaining":    days_remaining,
        "in_grace_period":   in_grace_period,
        "is_expired":        is_expired,
        "renewal_pending":   pending_renewal is not None,
        "available_plans":   PLANS,
        "payment_info":      PAYMENT_INFO,
    }


@router.get("/plans")
async def get_plans():
    """Return available plans and payment info — shown before renewal form."""
    return {"plans": PLANS, "payment_info": PAYMENT_INFO}


@router.post("/renew")
async def submit_renewal(
    data: RenewalSubmit,
    bg:   BackgroundTasks,
    db:   Session = Depends(get_db)
):
    """
    Partner submits a renewal request with payment proof.
    """
    if data.plan not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan selected.")

    app = db.query(PartnerApplication).filter(
        PartnerApplication.email  == data.email,
        PartnerApplication.status == "approved"
    ).first()

    if not app:
        raise HTTPException(status_code=404, detail="Account not found.")

    # Block duplicate pending requests
    existing = db.query(RenewalRequest).filter(
        RenewalRequest.email  == data.email,
        RenewalRequest.status == "pending"
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending renewal request.")

    plan_info = PLANS[data.plan]

    renewal = RenewalRequest(
        application_id    = app.id,
        business_name     = app.business_name,
        business_type     = app.business_type,
        email             = data.email,
        plan              = data.plan,
        plan_amount       = plan_info["amount"],
        payment_proof_url = data.payment_proof_url,
        status            = "pending",
    )
    db.add(renewal)
    db.commit()
    db.refresh(renewal)

    # Notify admin
    _notify_admin_renewal(app, plan_info, renewal.id, bg)

    return {
        "success": True,
        "message": "Renewal request submitted. Admin will review your payment and activate your plan.",
        "renewal_id": renewal.id
    }


# ── CEO ENDPOINTS ─────────────────────────────────────────────

@router.get("/admin/renewals")
async def list_renewal_requests(
    status: Optional[str] = None,
    db:     Session = Depends(get_db)
):
    """CEO sees all renewal requests."""
    q = db.query(RenewalRequest)
    if status:
        q = q.filter(RenewalRequest.status == status)
    renewals = q.order_by(RenewalRequest.requested_at.desc()).all()

    return [_renewal_dict(r) for r in renewals]


@router.post("/admin/renewals/{renewal_id}/approve")
async def approve_renewal(
    renewal_id: int,
    body:       RenewalReview,
    bg:         BackgroundTasks,
    db:         Session = Depends(get_db)
):
    """CEO approves a renewal — extends the partner's plan."""
    renewal = _get_renewal(renewal_id, db)

    app = db.query(PartnerApplication).filter(
        PartnerApplication.id == renewal.application_id
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="Partner application not found.")

    plan_info = PLANS.get(renewal.plan, {"days": 30})
    now       = datetime.utcnow()

    # Extend from current end date if still active, otherwise from today
    base_date = app.plan_end_date if app.plan_end_date and app.plan_end_date > now else now

    app.plan             = renewal.plan
    app.plan_amount      = renewal.plan_amount
    app.plan_start_date  = now
    app.plan_end_date    = base_date + timedelta(days=plan_info["days"])
    app.grace_period_end = app.plan_end_date + timedelta(days=3)
    app.plan_status      = "active"

    renewal.status      = "approved"
    renewal.reviewed_at = now
    renewal.reviewed_by = body.admin_email or "admin"

    db.commit()

    # Notify partner
    _notify_partner_renewal_approved(app, renewal, bg)

    return {
        "success":      True,
        "message":      f"Renewal approved. Plan extended to {app.plan_end_date.strftime('%Y-%m-%d')}.",
        "new_end_date": app.plan_end_date.isoformat()
    }


@router.post("/admin/renewals/{renewal_id}/reject")
async def reject_renewal(
    renewal_id: int,
    body:       RenewalReview,
    bg:         BackgroundTasks,
    db:         Session = Depends(get_db)
):
    """CEO rejects a renewal request."""
    renewal = _get_renewal(renewal_id, db)

    app = db.query(PartnerApplication).filter(
        PartnerApplication.id == renewal.application_id
    ).first()

    renewal.status           = "rejected"
    renewal.reviewed_at      = datetime.utcnow()
    renewal.reviewed_by      = body.admin_email or "admin"
    renewal.rejection_reason = body.rejection_reason
    db.commit()

    if app:
        _notify_partner_renewal_rejected(app, renewal, body.rejection_reason or "", bg)

    return {"success": True, "message": "Renewal rejected."}


# ── EXPIRY CHECK (call daily via scheduler or manual endpoint) ──

@router.post("/admin/check-expiry")
async def check_expiry(bg: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Check all partners for expiry.
    - Send reminder emails at 7 days, 3 days, 1 day before expiry
    - Delete data after grace period ends
    Call this endpoint daily from a cron job.
    """
    now      = datetime.utcnow()
    results  = {"reminders_sent": 0, "deleted": 0}

    approved = db.query(PartnerApplication).filter(
        PartnerApplication.status     == "approved",
        PartnerApplication.plan_end_date != None
    ).all()

    for app in approved:
        days_left = (app.plan_end_date - now).days

        # Send reminders
        if days_left in (7, 3, 1):
            _send_expiry_reminder(app, days_left, bg)
            results["reminders_sent"] += 1

        # Grace period expired → delete data
        if app.grace_period_end and now > app.grace_period_end and app.plan_status != "deleted":
            _delete_partner_data(app, db)
            app.plan_status = "deleted"
            app.status      = "expired"
            db.commit()
            results["deleted"] += 1

    return results


# ── INTERNAL HELPERS ──────────────────────────────────────────

def _get_renewal(renewal_id: int, db: Session) -> RenewalRequest:
    r = db.query(RenewalRequest).filter(RenewalRequest.id == renewal_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Renewal request not found.")
    return r


def _renewal_dict(r: RenewalRequest) -> dict:
    return {
        "id":                r.id,
        "application_id":    r.application_id,
        "business_name":     r.business_name,
        "business_type":     r.business_type,
        "email":             r.email,
        "plan":              r.plan,
        "plan_amount":       r.plan_amount,
        "plan_label":        PLANS.get(r.plan, {}).get("label", r.plan),
        "payment_proof_url": r.payment_proof_url,
        "status":            r.status,
        "requested_at":      r.requested_at.isoformat() if r.requested_at else None,
        "reviewed_at":       r.reviewed_at.isoformat()  if r.reviewed_at  else None,
        "rejection_reason":  r.rejection_reason,
    }


def _delete_partner_data(app: PartnerApplication, db: Session):
    """Delete all business data for an expired partner."""
    from models.restaurant import Restaurant, RestaurantMenu, Review
    from models.hotel      import Hotel, HotelRoom, HotelReview

    if app.business_type == "restaurant" and app.linked_record_id:
        db.query(RestaurantMenu).filter(RestaurantMenu.restaurant_id == app.linked_record_id).delete()
        db.query(Review).filter(Review.restaurant_id == app.linked_record_id).delete()
        db.query(Restaurant).filter(Restaurant.id == app.linked_record_id).delete()

    elif app.business_type == "hotel" and app.linked_record_id:
        db.query(HotelRoom).filter(HotelRoom.hotel_id == app.linked_record_id).delete()
        db.query(HotelReview).filter(HotelReview.hotel_id == app.linked_record_id).delete()
        db.query(Hotel).filter(Hotel.id == app.linked_record_id).delete()


def _send_expiry_reminder(app: PartnerApplication, days_left: int, bg: BackgroundTasks):
    subject = f"⚠️ Your Discover Uzbekistan plan expires in {days_left} day{'s' if days_left > 1 else ''}!"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#fff;border-radius:12px">
        <h2 style="color:#d97706">⚠️ Plan Expiring Soon</h2>
        <p>Hi <strong>{app.contact_name}</strong>,</p>
        <p>Your <strong>{app.business_name}</strong> listing on <strong>Discover Uzbekistan</strong>
           will expire in <strong>{days_left} day{'s' if days_left > 1 else ''}</strong>.</p>
        <div style="background:#fef3c7;border:2px solid #fcd34d;border-radius:10px;padding:20px;margin:20px 0">
            <p style="color:#92400e;margin:0"><strong>⏰ After expiry you have 3 days grace period.</strong><br>
            If not renewed, your listing and all data will be permanently deleted.</p>
        </div>
        <p>To renew, log in to your dashboard and click <strong>Renew Plan</strong>.</p>
        <a href="{FRONTEND_BASE}/partner-login.html"
           style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px">
            → Renew Now
        </a>
    </div>"""
    bg.add_task(_send, app.email, app.contact_name, subject, html)


def _notify_admin_renewal(app: PartnerApplication, plan_info: dict, renewal_id: int, bg: BackgroundTasks):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#fff;border-radius:12px">
        <h2 style="color:#4f46e5">💳 New Renewal Request</h2>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr><td style="padding:8px;color:#888">Business</td><td style="padding:8px"><strong>{app.business_name}</strong></td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Email</td><td style="padding:8px">{app.email}</td></tr>
            <tr><td style="padding:8px;color:#888">Plan</td><td style="padding:8px">{plan_info['label']} — ${plan_info['amount']}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Renewal ID</td><td style="padding:8px">#{renewal_id}</td></tr>
        </table>
        <a href="{FRONTEND_BASE}/admin.html#renewals"
           style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:bold">
            → Review in Admin Panel
        </a>
    </div>"""
    bg.add_task(_send, ADMIN_EMAIL, "Admin", f"💳 Renewal Request: {app.business_name}", html)


def _notify_partner_renewal_approved(app: PartnerApplication, renewal: RenewalRequest, bg: BackgroundTasks):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#fff;border-radius:12px">
        <h2 style="color:#059669">✅ Renewal Approved!</h2>
        <p>Hi <strong>{app.contact_name}</strong>,</p>
        <p>Your <strong>{renewal.plan.replace('month','month ').replace('year',' year')}</strong> plan
           for <strong>{app.business_name}</strong> has been activated.</p>
        <div style="background:#d1fae5;border:2px solid #6ee7b7;border-radius:10px;padding:20px;margin:20px 0">
            <p style="color:#065f46;margin:0">
                <strong>New expiry date:</strong> {app.plan_end_date.strftime('%d %B %Y') if app.plan_end_date else 'N/A'}
            </p>
        </div>
        <a href="{FRONTEND_BASE}/partner-login.html"
           style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px">
            → Go to Dashboard
        </a>
    </div>"""
    bg.add_task(_send, app.email, app.contact_name, "✅ Your Plan Has Been Renewed — Discover Uzbekistan", html)


def _notify_partner_renewal_rejected(app: PartnerApplication, renewal: RenewalRequest, reason: str, bg: BackgroundTasks):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;background:#fff;border-radius:12px">
        <h2 style="color:#dc2626">❌ Renewal Request Rejected</h2>
        <p>Hi <strong>{app.contact_name}</strong>,</p>
        <p>Unfortunately your renewal request for <strong>{app.business_name}</strong> was not approved.</p>
        {f'<div style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px;border-radius:4px;margin:20px 0"><p style="color:#991b1b;margin:0"><strong>Reason:</strong> {reason}</p></div>' if reason else ''}
        <p>Please resubmit with correct payment proof or contact us for help.</p>
        <a href="{FRONTEND_BASE}/partner-login.html"
           style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                  text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px">
            → Try Again
        </a>
    </div>"""
    bg.add_task(_send, app.email, app.contact_name, "❌ Renewal Request Update — Discover Uzbekistan", html)
    
    
@router.delete("/admin/delete-partner/{app_id}")
async def delete_partner(app_id: int, db: Session = Depends(get_db)):
    """CEO force-deletes a partner and all their data."""
    app = db.query(PartnerApplication).filter(PartnerApplication.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found.")
    _delete_partner_data(app, db)
    app.plan_status = "deleted"
    app.status      = "expired"
    db.commit()
    return {"success": True, "message": f"Partner {app.business_name} deleted."}