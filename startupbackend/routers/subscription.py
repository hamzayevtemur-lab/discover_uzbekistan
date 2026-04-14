"""
subscription.py
===============
Manages partner subscription lifecycle:
  - Status check        GET  /api/subscription/status?email=…
  - Available plans     GET  /api/subscription/plans
  - Submit renewal      POST /api/subscription/renew
  - Admin: list         GET  /api/subscription/admin/renewals
  - Admin: approve      POST /api/subscription/admin/renewals/{id}/approve
  - Admin: reject       POST /api/subscription/admin/renewals/{id}/reject
  - Admin: check expiry POST /api/subscription/admin/check-expiry
  - Admin: force delete DELETE /api/subscription/admin/delete-partner/{id}
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Session

from database import Base, get_db
from routers.partner_application import (
    ADMIN_EMAIL,
    FRONTEND_BASE,
    PartnerApplication,
    _send_email,
)


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 1 — CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/subscription", tags=["Subscription"])

# Plan catalogue — single source of truth
PLANS: dict[str, dict] = {
    "1month":  {"days": 30,  "amount": 20,  "label": "1 Month"},
    "3months": {"days": 90,  "amount": 50,  "label": "3 Months"},
    "6months": {"days": 180, "amount": 110, "label": "6 Months"},
    "1year":   {"days": 365, "amount": 220, "label": "1 Year"},
}

# Default fallback used when a plan key is unknown (avoids KeyError in approve_renewal)
_PLAN_FALLBACK: dict = {"days": 30, "amount": 0, "label": "Unknown"}

# Payment info shown to partners on the renewal form
PAYMENT_INFO: dict = {
    "card_number": "5614 6835 1480 7353",
    "card_holder": "Hamzayev Temurbek",
    "bank":        "Anor Bank",
    "note":        "Send payment and upload screenshot as proof",
}


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 2 — DATABASE MODEL
# ══════════════════════════════════════════════════════════════════════════════

class RenewalRequest(Base):
    __tablename__ = "renewal_requests"

    id                = Column(Integer, primary_key=True, index=True)
    application_id    = Column(Integer, ForeignKey("partner_applications.id"), nullable=False)

    # Denormalised for easy display without a JOIN
    business_name     = Column(String(255), nullable=False)
    business_type     = Column(String(50),  nullable=False)
    email             = Column(String(255), nullable=False, index=True)   # FIX: added index

    plan              = Column(String(50),  nullable=False)
    plan_amount       = Column(Integer,     nullable=False)
    payment_proof_url = Column(String(500), nullable=True)

    status            = Column(String(20),  nullable=False, default="pending", index=True)  # FIX: added index
    requested_at      = Column(DateTime,    default=datetime.utcnow)
    reviewed_at       = Column(DateTime,    nullable=True)
    reviewed_by       = Column(String(100), nullable=True)
    rejection_reason  = Column(Text,        nullable=True)


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 3 — PYDANTIC SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class RenewalSubmit(BaseModel):
    email:             str
    plan:              str
    payment_proof_url: Optional[str] = None


class RenewalReview(BaseModel):
    status:           str                    # "approved" or "rejected"
    rejection_reason: Optional[str] = None
    admin_email:      Optional[str] = None   # FIX: was = "admin" (wrong default for Optional)


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 4 — SERIALISATION HELPER
# ══════════════════════════════════════════════════════════════════════════════

def _renewal_dict(r: RenewalRequest) -> dict:
    return {
        "id":                r.id,
        "application_id":    r.application_id,
        "business_name":     r.business_name,
        "business_type":     r.business_type,
        "email":             r.email,
        "plan":              r.plan,
        "plan_amount":       r.plan_amount,
        "plan_label":        PLANS.get(r.plan, _PLAN_FALLBACK)["label"],
        "payment_proof_url": r.payment_proof_url,
        "status":            r.status,
        "requested_at":      r.requested_at.isoformat() if r.requested_at else None,
        "reviewed_at":       r.reviewed_at.isoformat()  if r.reviewed_at  else None,
        "reviewed_by":       r.reviewed_by,              # FIX: was missing
        "rejection_reason":  r.rejection_reason,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 5 — INTERNAL HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _get_renewal_or_404(renewal_id: int, db: Session) -> RenewalRequest:
    r = db.query(RenewalRequest).filter(RenewalRequest.id == renewal_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Renewal request not found.")
    return r


def _get_app_or_404(app_id: int, db: Session) -> PartnerApplication:
    app = db.query(PartnerApplication).filter(PartnerApplication.id == app_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Partner application not found.")
    return app


def _delete_partner_data(app: PartnerApplication, db: Session) -> None:
    """Delete all business data for an expired or force-deleted partner."""
    from models.restaurant import Restaurant, RestaurantMenu, Review
    from models.hotel import Hotel, HotelRoom, HotelReview

    rid = app.linked_record_id

    if app.business_type == "restaurant" and rid:
        db.query(RestaurantMenu).filter(RestaurantMenu.restaurant_id == rid).delete()
        db.query(Review).filter(Review.restaurant_id == rid).delete()
        db.query(Restaurant).filter(Restaurant.id == rid).delete()

    elif app.business_type == "hotel" and rid:
        db.query(HotelRoom).filter(HotelRoom.hotel_id == rid).delete()
        db.query(HotelReview).filter(HotelReview.hotel_id == rid).delete()
        db.query(Hotel).filter(Hotel.id == rid).delete()

    elif app.business_type == "travel_agency" and rid:
        # FIX: travel_agency was completely missing from deletion logic
        from models.travel_agency import TravelAgency, Tour
        db.query(Tour).filter(Tour.agency_id == rid).delete()
        db.query(TravelAgency).filter(TravelAgency.id == rid).delete()


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 6 — EMAIL HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _send_expiry_reminder(app: PartnerApplication, days_left: int, bg: BackgroundTasks) -> None:
    plural  = "s" if days_left > 1 else ""
    subject = f"⚠️ Your Discover Uzbekistan plan expires in {days_left} day{plural}!"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;
                background:#fff;border-radius:12px">
      <h2 style="color:#d97706">⚠️ Plan Expiring Soon</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Your <strong>{app.business_name}</strong> listing on <strong>Discover Uzbekistan</strong>
         will expire in <strong>{days_left} day{plural}</strong>.</p>
      <div style="background:#fef3c7;border:2px solid #fcd34d;border-radius:10px;
                  padding:20px;margin:20px 0">
        <p style="color:#92400e;margin:0">
          <strong>⏰ After expiry you have a 3-day grace period.</strong><br>
          If not renewed, your listing and all data will be permanently deleted.
        </p>
      </div>
      <p>To renew, log in to your dashboard and click <strong>Renew Plan</strong>.</p>
      <a href="{FRONTEND_BASE}/partner-login.html"
         style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px">
        → Renew Now
      </a>
    </div>"""
    bg.add_task(_send_email, app.email, app.contact_name, subject, html)


def _notify_admin_renewal(
    app: PartnerApplication,
    plan_info: dict,
    renewal_id: int,
    bg: BackgroundTasks,
) -> None:
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;
                background:#fff;border-radius:12px">
      <h2 style="color:#4f46e5">💳 New Renewal Request</h2>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr>
          <td style="padding:8px;color:#888">Business</td>
          <td style="padding:8px"><strong>{app.business_name}</strong></td>
        </tr>
        <tr style="background:#f9f9f9">
          <td style="padding:8px;color:#888">Email</td>
          <td style="padding:8px">{app.email}</td>
        </tr>
        <tr>
          <td style="padding:8px;color:#888">Plan</td>
          <td style="padding:8px">{plan_info['label']} — ${plan_info['amount']}</td>
        </tr>
        <tr style="background:#f9f9f9">
          <td style="padding:8px;color:#888">Renewal ID</td>
          <td style="padding:8px">#{renewal_id}</td>
        </tr>
      </table>
      <a href="{FRONTEND_BASE}/admin.html#renewals"
         style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                text-decoration:none;border-radius:8px;font-weight:bold">
        → Review in Admin Panel
      </a>
    </div>"""
    bg.add_task(_send_email, ADMIN_EMAIL, "Admin", f"💳 Renewal Request: {app.business_name}", html)


def _notify_partner_renewal_approved(
    app: PartnerApplication,
    renewal: RenewalRequest,
    bg: BackgroundTasks,
) -> None:
    expiry_str = app.plan_end_date.strftime("%d %B %Y") if app.plan_end_date else "N/A"
    plan_label = PLANS.get(renewal.plan, _PLAN_FALLBACK)["label"]
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;
                background:#fff;border-radius:12px">
      <h2 style="color:#059669">✅ Renewal Approved!</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Your <strong>{plan_label}</strong> plan for
         <strong>{app.business_name}</strong> has been activated.</p>
      <div style="background:#d1fae5;border:2px solid #6ee7b7;border-radius:10px;
                  padding:20px;margin:20px 0">
        <p style="color:#065f46;margin:0">
          <strong>New expiry date:</strong> {expiry_str}
        </p>
      </div>
      <a href="{FRONTEND_BASE}/partner-login.html"
         style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px">
        → Go to Dashboard
      </a>
    </div>"""
    bg.add_task(
        _send_email, app.email, app.contact_name,
        "✅ Your Plan Has Been Renewed — Discover Uzbekistan", html
    )


def _notify_partner_renewal_rejected(
    app: PartnerApplication,
    renewal: RenewalRequest,
    reason: str,
    bg: BackgroundTasks,
) -> None:
    reason_block = (
        f'<div style="background:#fee2e2;border-left:4px solid #ef4444;padding:16px;'
        f'border-radius:4px;margin:20px 0">'
        f'<p style="color:#991b1b;margin:0"><strong>Reason:</strong> {reason}</p></div>'
        if reason else ""
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:40px;
                background:#fff;border-radius:12px">
      <h2 style="color:#dc2626">❌ Renewal Request Rejected</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Unfortunately your renewal request for <strong>{app.business_name}</strong>
         was not approved.</p>
      {reason_block}
      <p>Please resubmit with the correct payment proof, or reply to this email for help.</p>
      <a href="{FRONTEND_BASE}/partner-login.html"
         style="display:inline-block;padding:14px 32px;background:#4f46e5;color:#fff;
                text-decoration:none;border-radius:8px;font-weight:bold;margin-top:16px">
        → Try Again
      </a>
    </div>"""
    bg.add_task(
        _send_email, app.email, app.contact_name,
        "❌ Renewal Request Update — Discover Uzbekistan", html
    )


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 7 — ROUTER  (all endpoints)
# ══════════════════════════════════════════════════════════════════════════════

# ── PARTNER ENDPOINTS ─────────────────────────────────────────────────────────

@router.get("/status", summary="Get subscription status for a partner")
async def get_subscription_status(email: str, db: Session = Depends(get_db)):
    app = db.query(PartnerApplication).filter(
        PartnerApplication.email  == email,
        PartnerApplication.status == "approved",
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="No approved account found for this email.")

    now             = datetime.utcnow()
    days_remaining  = None
    in_grace_period = False
    is_expired      = False

    if app.plan_end_date:
        delta = (app.plan_end_date - now).days
        if delta > 0:
            days_remaining = delta
        elif app.grace_period_end and now < app.grace_period_end:
            # FIX: days_remaining was potentially left as negative when grace_period_end is None
            in_grace_period = True
            days_remaining  = 0
        else:
            is_expired     = True
            days_remaining = 0   # FIX: guaranteed 0, never negative

    pending_renewal = db.query(RenewalRequest).filter(
        RenewalRequest.email  == email,
        RenewalRequest.status == "pending",
    ).first()

    return {
        "plan":             app.plan,
        "plan_amount":      app.plan_amount,
        "plan_status":      app.plan_status or "active",
        "plan_start_date":  app.plan_start_date.isoformat()  if app.plan_start_date  else None,
        "plan_end_date":    app.plan_end_date.isoformat()    if app.plan_end_date    else None,
        "grace_period_end": app.grace_period_end.isoformat() if app.grace_period_end else None,
        "days_remaining":   days_remaining,
        "in_grace_period":  in_grace_period,
        "is_expired":       is_expired,
        "renewal_pending":  pending_renewal is not None,
        "available_plans":  PLANS,
        "payment_info":     PAYMENT_INFO,
    }


@router.get("/plans", summary="Return available plans and payment info")
async def get_plans():
    return {"plans": PLANS, "payment_info": PAYMENT_INFO}


@router.post("/renew", summary="Partner submits a renewal request with payment proof")
async def submit_renewal(
    data: RenewalSubmit,
    bg:   BackgroundTasks,
    db:   Session = Depends(get_db),
):
    if data.plan not in PLANS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid plan '{data.plan}'. Valid options: {', '.join(PLANS)}."
        )

    app = db.query(PartnerApplication).filter(
        PartnerApplication.email  == data.email,
        PartnerApplication.status == "approved",
    ).first()
    if not app:
        raise HTTPException(status_code=404, detail="No approved account found for this email.")

    existing = db.query(RenewalRequest).filter(
        RenewalRequest.email  == data.email,
        RenewalRequest.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already have a pending renewal request.")

    plan_info = PLANS[data.plan]
    renewal   = RenewalRequest(
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

    _notify_admin_renewal(app, plan_info, renewal.id, bg)
    return {
        "success":    True,
        "message":    "Renewal request submitted. Admin will review your payment and activate your plan.",
        "renewal_id": renewal.id,
    }


# ── ADMIN ENDPOINTS ───────────────────────────────────────────────────────────

@router.get("/admin/renewals", summary="List all renewal requests (admin)")
async def list_renewal_requests(
    status: Optional[str] = None,
    db:     Session = Depends(get_db),
):
    q = db.query(RenewalRequest)
    if status:
        q = q.filter(RenewalRequest.status == status)
    return [_renewal_dict(r) for r in q.order_by(RenewalRequest.requested_at.desc()).all()]


@router.post("/admin/renewals/{renewal_id}/approve", summary="Approve a renewal request")
async def approve_renewal(
    renewal_id: int,
    body:       RenewalReview,
    bg:         BackgroundTasks,
    db:         Session = Depends(get_db),
):
    renewal = _get_renewal_or_404(renewal_id, db)

    if renewal.status == "approved":
        raise HTTPException(status_code=400, detail="Renewal is already approved.")

    app = _get_app_or_404(renewal.application_id, db)

    # FIX: PLANS.get fallback had only "days" key — now uses full _PLAN_FALLBACK
    plan_info = PLANS.get(renewal.plan, _PLAN_FALLBACK)
    now       = datetime.utcnow()

    # Extend from current end date if still active, otherwise from today
    base_date = (
        app.plan_end_date
        if app.plan_end_date and app.plan_end_date > now
        else now
    )

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

    _notify_partner_renewal_approved(app, renewal, bg)
    return {
        "success":      True,
        "message":      f"Renewal approved. Plan extended to {app.plan_end_date.strftime('%Y-%m-%d')}.",
        "new_end_date": app.plan_end_date.isoformat(),
    }


@router.post("/admin/renewals/{renewal_id}/reject", summary="Reject a renewal request")
async def reject_renewal(
    renewal_id: int,
    body:       RenewalReview,
    bg:         BackgroundTasks,
    db:         Session = Depends(get_db),
):
    renewal = _get_renewal_or_404(renewal_id, db)

    if renewal.status == "rejected":
        raise HTTPException(status_code=400, detail="Renewal is already rejected.")

    app = db.query(PartnerApplication).filter(
        PartnerApplication.id == renewal.application_id
    ).first()  # Optional — don't 404 here, partner record might be partially deleted

    renewal.status           = "rejected"
    renewal.reviewed_at      = datetime.utcnow()
    renewal.reviewed_by      = body.admin_email or "admin"
    renewal.rejection_reason = body.rejection_reason
    db.commit()

    if app:
        _notify_partner_renewal_rejected(app, renewal, body.rejection_reason or "", bg)
    return {"success": True, "message": "Renewal rejected."}


@router.post("/admin/check-expiry", summary="Check all partners for expiry (call daily via cron)")
async def check_expiry(bg: BackgroundTasks, db: Session = Depends(get_db)):
    """
    Runs expiry logic for all active partners:
      - Sends reminder emails at 7, 3, and 1 days before expiry
      - Marks plan_status as 'grace' when inside the grace window
      - Permanently deletes data after grace period ends
    Call this endpoint from a daily cron/scheduler.
    """
    now     = datetime.utcnow()
    results = {"reminders_sent": 0, "grace_set": 0, "deleted": 0}

    # FIX: was 'plan_end_date != None' — SQLAlchemy requires .isnot(None)
    approved = db.query(PartnerApplication).filter(
        PartnerApplication.status == "approved",
        PartnerApplication.plan_end_date.isnot(None),
    ).all()

    for app in approved:
        days_left = (app.plan_end_date - now).days

        # Send reminders before expiry
        if days_left in (7, 3, 1):
            _send_expiry_reminder(app, days_left, bg)
            results["reminders_sent"] += 1

        # FIX: set plan_status to 'grace' when inside grace window
        if days_left <= 0 and app.grace_period_end and now < app.grace_period_end:
            if app.plan_status != "grace":
                app.plan_status = "grace"
                db.commit()
                results["grace_set"] += 1

        # Grace period ended → delete all partner data
        if (
            app.grace_period_end
            and now > app.grace_period_end
            and app.plan_status != "deleted"
        ):
            _delete_partner_data(app, db)
            app.plan_status = "deleted"
            app.status      = "expired"
            db.commit()
            results["deleted"] += 1

    return results


@router.delete(
    "/admin/delete-partner/{app_id}",
    summary="Force-delete a partner and all their data (admin)"
)
async def delete_partner(app_id: int, db: Session = Depends(get_db)):
    app = db.query(PartnerApplication).filter(PartnerApplication.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found.")

    # FIX: also delete all renewal requests for this partner to avoid orphan rows
    db.query(RenewalRequest).filter(
        RenewalRequest.application_id == app_id
    ).delete(synchronize_session=False)

    _delete_partner_data(app, db)
    app.plan_status = "deleted"
    app.status      = "expired"
    db.commit()
    return {"success": True, "message": f"Partner '{app.business_name}' and all their data deleted."}