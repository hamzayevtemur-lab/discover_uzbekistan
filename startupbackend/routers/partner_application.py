"""
partner_application.py
======================
Universal partner-application flow for all business types:
  restaurant | hotel | travel_agency | attraction | multiple

Flow:
  1. Applicant submits signup form  → POST /signup
  2. Verification email sent        → GET  /verify-email?token=…
  3. Admin reviews in panel         → GET  /admin/list
  4. Admin approves                 → POST /admin/{id}/approve  (creates business record + sends credentials)
  5. Admin rejects                  → POST /admin/{id}/reject
  6. Partner logs in                → POST /login
  7. Admin resends credentials      → POST /admin/{id}/resend-credentials
  8. Check application status       → GET  /status?email=…
"""

from __future__ import annotations

import hashlib
import os
import secrets
import smtplib
import ssl
import string
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

import certifi
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from jose import jwt
from pydantic import BaseModel, EmailStr
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text
from sqlalchemy.orm import Session

from database import Base, get_db


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 1 — CONFIGURATION
# ══════════════════════════════════════════════════════════════════════════════

SECRET_KEY    = os.environ.get("SECRET_KEY", "changeme-in-production")
ALGORITHM     = "HS256"

SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = int(os.environ.get("SMTP_PORT", 465))
SMTP_USER     = os.environ.get("SMTP_USER", "")
SMTP_PASS     = os.environ.get("SMTP_PASS", "")
FROM_NAME     = "Discover Uzbekistan"

ADMIN_EMAIL   = os.environ.get("ADMIN_EMAIL", "")
FRONTEND_BASE = os.environ.get("FRONTEND_BASE", "http://localhost:8000")

# Dashboard URL per business type — add new types here as needed
DASHBOARD_URLS: dict[str, str] = {
    "restaurant":    "restaurants-admin-portal.html",
    "hotel":         "hotel-admin-dashboard.html",
    "travel_agency": "travel-agency-admin-dashboard.html",
    "attraction":    "attraction-admin-dashboard.html",
    # "spa": "spa-admin-dashboard.html",  ← just add a line
}

BUSINESS_LABELS: dict[str, str] = {
    "restaurant":    "🍽️ Restaurant / Café",
    "hotel":         "🏨 Hotel / Guesthouse",
    "travel_agency": "🌍 Travel Agency",
    "attraction":    "🏛️ Tourist Attraction",
    "multiple":      "📦 Multiple Businesses",
}

# All valid business types (used for validation)
VALID_TYPES: frozenset[str] = frozenset(DASHBOARD_URLS.keys()) | {"multiple"}

# Plan duration in days
PLAN_DAYS: dict[str, int] = {
    "1month":  30,
    "3months": 90,
    "6months": 180,
    "1year":   365,
}


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 2 — DATABASE MODEL
# ══════════════════════════════════════════════════════════════════════════════

class PartnerApplication(Base):
    """
    One row per signup application, for every business type.
    Kept separate from live business tables so unapproved applicants
    never appear on the public site.
    """
    __tablename__ = "partner_applications"

    # ── Identity ──────────────────────────────────────────────────────────────
    id               = Column(Integer, primary_key=True, index=True)

    # ── Business info ─────────────────────────────────────────────────────────
    business_type    = Column(String(50),  nullable=False, index=True)
    business_name    = Column(String(255), nullable=False)
    contact_name     = Column(String(255), nullable=False)
    email            = Column(String(255), nullable=False, unique=True, index=True)
    phone            = Column(String(50))
    address          = Column(String(500))
    city             = Column(String(100))
    website          = Column(String(255))
    description      = Column(Text)

    # ── Travel-agency extras ──────────────────────────────────────────────────
    agency_type      = Column(String(100))
    years_experience = Column(Integer)
    languages        = Column(String(255))

    # ── Plan / payment ────────────────────────────────────────────────────────
    plan             = Column(String(50))   # 1month / 3months / 6months / 1year
    plan_amount      = Column(Integer)      # price in USD
    payment_proof_url = Column(String(512))
    plan_start_date  = Column(DateTime)
    plan_end_date    = Column(DateTime)
    grace_period_end = Column(DateTime)
    plan_status      = Column(String(30))   # active / expired / grace

    # ── Email verification ────────────────────────────────────────────────────
    is_email_verified    = Column(Boolean, default=False)
    email_verify_token   = Column(String(128), unique=True)
    email_verify_sent_at = Column(DateTime)

    # ── Workflow status ───────────────────────────────────────────────────────
    # pending → email_verified → approved | rejected
    status           = Column(String(30), default="pending", index=True)
    applied_at       = Column(DateTime,   default=datetime.utcnow)
    reviewed_at      = Column(DateTime)
    reviewed_by      = Column(String(100))
    rejection_reason = Column(Text)

    # ── Set on approval ───────────────────────────────────────────────────────
    generated_password = Column(String(128))  # stored hashed
    linked_record_id   = Column(Integer)      # id of the row in the business table
    credentials_sent   = Column(Boolean, default=False)


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 3 — PYDANTIC SCHEMAS
# ══════════════════════════════════════════════════════════════════════════════

class SignupRequest(BaseModel):
    # Required
    business_type: str
    business_name: str
    contact_name:  str
    email:         EmailStr

    # Optional — common
    phone:             Optional[str] = None
    address:           Optional[str] = None
    city:              Optional[str] = None
    website:           Optional[str] = None
    description:       Optional[str] = None
    plan:              Optional[str] = None
    plan_amount:       Optional[int] = None
    payment_proof_url: Optional[str] = None

    # Optional — travel-agency specific
    agency_type:      Optional[str] = None
    years_experience: Optional[int] = None
    languages:        Optional[str] = None


class LoginRequest(BaseModel):
    email:         EmailStr
    password:      str
    business_type: Optional[str] = None  # hint only, not required


class ApproveRequest(BaseModel):
    admin_note: Optional[str] = None


class RejectRequest(BaseModel):
    reason: Optional[str] = None


# ── Serialisation helper ──────────────────────────────────────────────────────

def _to_dict(a: PartnerApplication) -> dict:
    """Convert a PartnerApplication ORM row to a JSON-serialisable dict."""
    def _iso(dt: datetime | None) -> str | None:
        return dt.isoformat() if dt else None

    return {
        "id":               a.id,
        "business_type":    a.business_type,
        "business_name":    a.business_name,
        "contact_name":     a.contact_name,
        "email":            a.email,
        "phone":            a.phone,
        "address":          a.address,
        "city":             a.city,
        "website":          a.website,
        "description":      a.description,
        # Plan
        "plan":             a.plan,
        "plan_amount":      a.plan_amount,
        "payment_proof_url": a.payment_proof_url,
        "plan_start_date":  _iso(a.plan_start_date),
        "plan_end_date":    _iso(a.plan_end_date),
        "grace_period_end": _iso(a.grace_period_end),
        "plan_status":      a.plan_status,
        # Agency extras
        "agency_type":      a.agency_type,
        "years_experience": a.years_experience,
        "languages":        a.languages,
        # Workflow
        "status":           a.status,
        "is_email_verified": a.is_email_verified,
        "applied_at":       _iso(a.applied_at),
        "reviewed_at":      _iso(a.reviewed_at),
        "rejection_reason": a.rejection_reason,
        "linked_record_id": a.linked_record_id,
        "credentials_sent": a.credentials_sent,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 4 — UTILITY HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()


def _generate_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(chars) for _ in range(length))


def _generate_token() -> str:
    return secrets.token_urlsafe(48)


def _create_access_token(data: dict, days: int = 30) -> str:
    payload = {**data, "exp": datetime.utcnow() + timedelta(days=days)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _dashboard_url(business_type: str, record_id: int) -> str:
    page = DASHBOARD_URLS.get(business_type, "partner-portal.html")
    return f"{FRONTEND_BASE}/{page}?id={record_id}"


def _login_url() -> str:
    return f"{FRONTEND_BASE}/partner-login.html"


def _get_or_404(app_id: int, db: Session) -> PartnerApplication:
    app = db.query(PartnerApplication).filter(PartnerApplication.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found.")
    return app


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 5 — BUSINESS RECORD HELPERS  (one function per type)
# ══════════════════════════════════════════════════════════════════════════════

def _create_business_record(app: PartnerApplication, hashed_pw: str, db: Session) -> int:
    """
    Create (or reuse) the business row in the appropriate table on approval.
    Returns the new/existing record id.
    Add an elif branch here when you add a new business type.
    """
    from models.hotel import Hotel
    from models.restaurant import Restaurant
    from models.travel_agency import TravelAgency

    bt = app.business_type

    if bt == "travel_agency":
        existing = db.query(TravelAgency).filter(TravelAgency.email == app.email).first()
        if existing:
            existing.partner_password = hashed_pw
            existing.status = "approved"
            db.flush()
            return existing.id
        record = TravelAgency(
            name             = app.business_name,
            email            = app.email,
            phone            = app.phone,
            website          = app.website,
            city             = app.city,
            description      = app.description,
            agency_type      = app.agency_type,
            languages        = app.languages,
            status           = "approved",
            partner_password = hashed_pw,
        )

    elif bt == "restaurant":
        existing = db.query(Restaurant).filter(Restaurant.partner_email == app.email).first()
        if existing:
            existing.partner_password = hashed_pw
            db.flush()
            return existing.id
        record = Restaurant(
            name             = app.business_name,
            partner_email    = app.email,
            phone            = app.phone,
            website          = app.website,
            address          = app.address,
            description      = app.description,
            is_partner       = True,
            partner_password = hashed_pw,
            rating           = 0.0,
            review_count     = 0,
            latitude         = 0.0,
            longitude        = 0.0,
            status           = "pending",
        )

    elif bt == "hotel":
        existing = db.query(Hotel).filter(Hotel.partner_email == app.email).first()
        if existing:
            existing.partner_password = hashed_pw
            db.flush()
            return existing.id
        record = Hotel(
            name             = app.business_name,
            partner_email    = app.email,
            phone            = app.phone,
            website          = app.website,
            address          = app.address,
            description      = app.description,
            is_partner       = True,
            partner_password = hashed_pw,
            rating           = 0.0,
            review_count     = 0,
            latitude         = 0.0,
            longitude        = 0.0,
            status           = "pending",
        )

    else:
        # attraction / multiple / future types
        raise HTTPException(
            500,
            f"No business table mapped for type '{bt}'. "
            f"Add an elif branch in _create_business_record()."
        )

    db.add(record)
    db.flush()
    return record.id


def _update_business_password(app: PartnerApplication, hashed_pw: str, db: Session) -> None:
    """Update the password on the existing business record (used when resending credentials)."""
    from models.hotel import Hotel
    from models.restaurant import Restaurant
    from models.travel_agency import TravelAgency

    model_map = {
        "travel_agency": TravelAgency,
        "restaurant":    Restaurant,
        "hotel":         Hotel,
    }
    model = model_map.get(app.business_type)
    if model is None:
        return  # unsupported type — silently skip

    rec = db.query(model).filter(model.id == app.linked_record_id).first()
    if rec:
        rec.partner_password = hashed_pw
        db.flush()


def _verify_password_for(app: PartnerApplication, plain_pw: str, db: Session) -> bool:
    """Check the hashed password on the actual business record."""
    from models.hotel import Hotel
    from models.restaurant import Restaurant
    from models.travel_agency import TravelAgency

    model_map = {
        "travel_agency": TravelAgency,
        "restaurant":    Restaurant,
        "hotel":         Hotel,
    }
    model = model_map.get(app.business_type)
    if model is None:
        return False

    rec = db.query(model).filter(model.id == app.linked_record_id).first()
    return rec is not None and rec.partner_password == _hash_password(plain_pw)


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 6 — EMAIL HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _send_email(to_email: str, to_name: str, subject: str, html: str) -> None:
    """Send a single HTML email via Gmail SMTP SSL. Logs errors rather than raising."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{SMTP_USER}>"
    msg["To"]      = f"{to_name} <{to_email}>"
    msg.attach(MIMEText(html, "html"))
    try:
        context = ssl.create_default_context(cafile=certifi.where())
        with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, to_email, msg.as_string())
        print(f"✅ Email → {to_email}")
    except Exception as exc:
        print(f"❌ Email failed → {to_email}: {exc}")


def _send_verification_email(app: PartnerApplication, token: str, bg: BackgroundTasks) -> None:
    verify_url = f"{FRONTEND_BASE}/partner-verify.html?token={token}"
    label = BUSINESS_LABELS.get(app.business_type, app.business_type)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
      <h2 style="color:#6366f1">Verify your email address</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Thank you for applying to list your <strong>{label}</strong> on
         <strong>Discover Uzbekistan</strong>. Please verify your email to continue.</p>
      <a href="{verify_url}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#6366f1;
                color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
        ✉️ Verify Email Address
      </a>
      <p style="color:#888;font-size:13px">
        This link expires in 24 hours. If you didn't apply, you can safely ignore this email.
      </p>
    </div>"""
    bg.add_task(
        _send_email, app.email, app.contact_name,
        "Verify your email — Discover Uzbekistan", html
    )


def _send_admin_notification(app: PartnerApplication, bg: BackgroundTasks) -> None:
    label     = BUSINESS_LABELS.get(app.business_type, app.business_type)
    admin_url = f"{FRONTEND_BASE}/admin.html#partner-applications"
    rows = [
        ("Business Type", label),
        ("Business Name", app.business_name),
        ("Contact",       app.contact_name),
        ("Email",         app.email),
        ("Phone",         app.phone or "—"),
        ("Address",       app.address or "—"),
        ("Plan",          f"{app.plan or '—'} (${app.plan_amount or 0})"),
        ("Applied",       app.applied_at.strftime("%Y-%m-%d %H:%M UTC") if app.applied_at else "—"),
    ]
    table_rows = "".join(
        f'<tr{"" if i % 2 else " style=\'background:#f9f9f9\'"}'
        f'><td style="padding:8px;color:#888;width:40%">{k}</td>'
        f'<td style="padding:8px">{v}</td></tr>'
        for i, (k, v) in enumerate(rows)
    )
    desc_block = f"<p><strong>Description:</strong><br>{app.description}</p>" if app.description else ""
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
      <h2 style="color:#6366f1">New Partner Application — {label}</h2>
      <p>A new applicant has verified their email and is awaiting your approval.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">{table_rows}</table>
      {desc_block}
      <a href="{admin_url}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#6366f1;
                color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        → Review in Admin Panel
      </a>
    </div>"""
    bg.add_task(
        _send_email, ADMIN_EMAIL, "Admin",
        f"New {label} Application: {app.business_name}", html
    )


def _send_approval_email(
    app: PartnerApplication,
    plain_pw: str,
    record_id: int,
    bg: BackgroundTasks,
) -> None:
    label     = BUSINESS_LABELS.get(app.business_type, app.business_type)
    login_url = _login_url()
    dash_url  = _dashboard_url(app.business_type, record_id)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
      <h2 style="color:#10b981">🎉 Your application has been approved!</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Your <strong>{label}</strong> partner account on <strong>Discover Uzbekistan</strong> is ready.</p>
      <div style="background:#f0fdf4;border:2px solid #10b981;border-radius:10px;padding:24px;margin:24px 0">
        <p style="margin:0 0 12px;color:#065f46;font-size:13px;font-weight:bold;
                  text-transform:uppercase;letter-spacing:0.05em">Your Login Credentials</p>
        <p style="margin:6px 0"><strong>Login page:</strong>
           <a href="{login_url}" style="color:#6366f1">{login_url}</a></p>
        <p style="margin:6px 0"><strong>Email:</strong> {app.email}</p>
        <p style="margin:6px 0"><strong>Password:</strong>
           <code style="background:#e0e7ff;padding:3px 8px;border-radius:4px;font-size:16px">{plain_pw}</code></p>
        <p style="margin:6px 0"><strong>Dashboard:</strong>
           <a href="{dash_url}" style="color:#6366f1">{dash_url}</a></p>
      </div>
      <p style="color:#555;font-size:14px">⚠️ Please change your password after your first login.</p>
      <a href="{login_url}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#6366f1;
                color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
        → Go to Dashboard
      </a>
    </div>"""
    bg.add_task(
        _send_email, app.email, app.contact_name,
        "✅ Your Partner Account is Ready — Discover Uzbekistan", html
    )


def _send_rejection_email(app: PartnerApplication, reason: str, bg: BackgroundTasks) -> None:
    reason_block = (
        f'<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;'
        f'border-radius:4px;margin:20px 0">'
        f'<p style="color:#991b1b;margin:0"><strong>Reason:</strong> {reason}</p></div>'
        if reason else ""
    )
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
      <h2 style="color:#ef4444">Application Update</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Thank you for applying to partner with <strong>Discover Uzbekistan</strong>.
         After careful review, we are unable to approve your application at this time.</p>
      {reason_block}
      <p style="color:#555;font-size:14px">
        You are welcome to reapply in the future. Reply to this email if you have any questions.
      </p>
    </div>"""
    bg.add_task(
        _send_email, app.email, app.contact_name,
        "Your Partner Application — Discover Uzbekistan", html
    )


# ══════════════════════════════════════════════════════════════════════════════
#  SECTION 7 — ROUTER  (all endpoints)
# ══════════════════════════════════════════════════════════════════════════════

router = APIRouter(prefix="/api/partner-applications", tags=["partner-applications"])


# ── 1. SIGNUP ─────────────────────────────────────────────────────────────────

@router.post("/signup", summary="Submit a new partner application")
async def signup(
    data: SignupRequest,
    bg:   BackgroundTasks,
    db:   Session = Depends(get_db),
):
    if data.business_type not in VALID_TYPES:
        raise HTTPException(400, f"Unknown business_type '{data.business_type}'. "
                                 f"Valid values: {', '.join(sorted(VALID_TYPES))}.")

    existing = db.query(PartnerApplication).filter(
        PartnerApplication.email == data.email
    ).first()
    
    if existing:      
        if existing.status == "approved":
            raise HTTPException(400, "This email already has an approved account. Please log in.")       
        if existing.status == "rejected":          
            db.delete(existing)
            db.commit()
        else:       
        # pending or email_verified — update plan + payment proof
            if data.plan:    
                existing.plan = data.plan
            if data.plan_amount:
                
                existing.plan_amount = data.plan_amount
            if data.payment_proof_url:
                
                existing.payment_proof_url = data.payment_proof_url
            db.commit()
            return {
            "message": "Application updated with payment details.",
            "application_id": existing.id,
            }
    # Only reaches here if rejected — continues to create new application below

    token = _generate_token()
    application = PartnerApplication(
        business_type        = data.business_type,
        business_name        = data.business_name,
        contact_name         = data.contact_name,
        email                = data.email,
        phone                = data.phone,
        address              = data.address,
        city                 = data.city,
        website              = data.website,
        description          = data.description,
        plan                 = data.plan,
        plan_amount          = data.plan_amount,
        payment_proof_url    = data.payment_proof_url,
        agency_type          = data.agency_type,
        years_experience     = data.years_experience,
        languages            = data.languages,
        email_verify_token   = token,
        email_verify_sent_at = datetime.utcnow(),
        status               = "pending",
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    _send_verification_email(application, token, bg)
    return {
        "message": "Application received! Please check your email to verify your address.",
        "application_id": application.id,
    }


# ── 2. VERIFY EMAIL ───────────────────────────────────────────────────────────

@router.get("/verify-email", summary="Verify applicant's email address via token")
async def verify_email(
    token: str,
    bg:    BackgroundTasks,
    db:    Session = Depends(get_db),
):
    application = db.query(PartnerApplication).filter(
        PartnerApplication.email_verify_token == token
    ).first()

    if not application:
        raise HTTPException(400, "Invalid or expired verification link.")

    if application.is_email_verified:
        return {
            "message":       "Email already verified. Your application is under review.",
            "business_name": application.business_name,
        }

    # Check token expiry (24 h)
    if (
        application.email_verify_sent_at
        and datetime.utcnow() - application.email_verify_sent_at > timedelta(hours=24)
    ):
        raise HTTPException(400, "Verification link has expired. Please apply again.")

    application.is_email_verified  = True
    application.email_verify_token = None   # consume token — one-time use
    application.status             = "email_verified"
    db.commit()
    db.refresh(application)

    _send_admin_notification(application, bg)
    return {
        "message":       "Email verified! Your application is now under review.",
        "business_name": application.business_name,
        "business_type": application.business_type,
    }


# ── 3. RESEND VERIFICATION ────────────────────────────────────────────────────

@router.post("/resend-verification", summary="Resend the email-verification link")
async def resend_verification(
    email: str,
    bg:    BackgroundTasks,
    db:    Session = Depends(get_db),
):
    application = db.query(PartnerApplication).filter(
        PartnerApplication.email == email,
        PartnerApplication.is_email_verified == False,  # noqa: E712
    ).first()
    if not application:
        raise HTTPException(404, "No unverified application found for this email.")

    token = _generate_token()
    application.email_verify_token   = token
    application.email_verify_sent_at = datetime.utcnow()
    db.commit()

    _send_verification_email(application, token, bg)
    return {"message": "Verification email resent."}


# ── 4. ADMIN — LIST ALL APPLICATIONS ─────────────────────────────────────────

@router.get("/admin/list", summary="List all partner applications (admin)")
async def list_applications(
    status:        Optional[str] = None,
    business_type: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(PartnerApplication)
    if status:
        q = q.filter(PartnerApplication.status == status)
    if business_type:
        q = q.filter(PartnerApplication.business_type == business_type)
    return [_to_dict(a) for a in q.order_by(PartnerApplication.applied_at.desc()).all()]


# ── 5. ADMIN — APPROVE ────────────────────────────────────────────────────────

@router.post("/admin/{app_id}/approve", summary="Approve an application and send credentials")
async def approve(
    app_id: int,
    body:   ApproveRequest,
    bg:     BackgroundTasks,
    db:     Session = Depends(get_db),
):
    application = _get_or_404(app_id, db)

    if application.status == "approved":
        raise HTTPException(400, "Application is already approved.")
    if not application.is_email_verified:
        raise HTTPException(400, "Cannot approve — applicant has not verified their email yet.")

    plain_pw  = _generate_password()
    hashed_pw = _hash_password(plain_pw)
    record_id = _create_business_record(application, hashed_pw, db)

    now  = datetime.utcnow()
    days = PLAN_DAYS.get(application.plan or "", 30)

    application.status             = "approved"
    application.reviewed_at        = now
    application.generated_password = hashed_pw
    application.linked_record_id   = record_id
    application.credentials_sent   = True
    application.plan_start_date    = now
    application.plan_end_date      = now + timedelta(days=days)
    application.grace_period_end   = now + timedelta(days=days + 3)
    application.plan_status        = "active"
    db.commit()

    _send_approval_email(application, plain_pw, record_id, bg)
    return {
        "message":   f"Approved. Credentials sent to {application.email}.",
        "record_id": record_id,
    }


# ── 6. ADMIN — REJECT ────────────────────────────────────────────────────────

@router.post("/admin/{app_id}/reject", summary="Reject an application")
async def reject(
    app_id: int,
    body:   RejectRequest,
    bg:     BackgroundTasks,
    db:     Session = Depends(get_db),
):
    application = _get_or_404(app_id, db)

    if application.status == "rejected":
        raise HTTPException(400, "Application is already rejected.")

    application.status           = "rejected"
    application.reviewed_at      = datetime.utcnow()
    application.rejection_reason = body.reason
    db.commit()

    _send_rejection_email(application, body.reason or "", bg)
    return {"message": f"Rejected. Email sent to {application.email}."}


# ── 7. ADMIN — RESEND CREDENTIALS ────────────────────────────────────────────

@router.post("/admin/{app_id}/resend-credentials", summary="Resend login credentials to an approved partner")
async def resend_credentials(
    app_id: int,
    bg:     BackgroundTasks,
    db:     Session = Depends(get_db),
):
    application = _get_or_404(app_id, db)

    if application.status != "approved":
        raise HTTPException(400, "Application is not approved yet.")
    if not application.linked_record_id:
        raise HTTPException(400, "No linked business record found.")

    plain_pw  = _generate_password()
    hashed_pw = _hash_password(plain_pw)

    _update_business_password(application, hashed_pw, db)
    application.generated_password = hashed_pw
    db.commit()

    _send_approval_email(application, plain_pw, application.linked_record_id, bg)
    return {"message": f"Credentials resent to {application.email}."}


# ── 8. PARTNER LOGIN ──────────────────────────────────────────────────────────

@router.post("/login", summary="Universal login for all partner types")
async def login(
    data: LoginRequest,
    db:   Session = Depends(get_db),
):
    application = db.query(PartnerApplication).filter(
        PartnerApplication.email  == data.email,
        PartnerApplication.status == "approved",
    ).first()

    if not application:
        # Give a more specific message if the account exists but isn't approved
        pending = db.query(PartnerApplication).filter(
            PartnerApplication.email == data.email
        ).first()
        if pending:
            raise HTTPException(
                403,
                f"Your account is not yet approved. Current status: {pending.status}."
            )
        raise HTTPException(401, "Invalid email or password.")

    if not _verify_password_for(application, data.password, db):
        raise HTTPException(401, "Invalid email or password.")

    token = _create_access_token({
        "sub":           data.email,
        "business_type": application.business_type,
        "record_id":     application.linked_record_id,
    })
    return {
        "access_token":  token,
        "token_type":    "bearer",
        "business_type": application.business_type,
        "business_name": application.business_name,
        "record_id":     application.linked_record_id,
        "dashboard_url": _dashboard_url(application.business_type, application.linked_record_id),
    }


# ── 9. CHECK APPLICATION STATUS ──────────────────────────────────────────────

@router.get("/status", summary="Check the status of an application by email")
async def check_status(
    email: str,
    db:    Session = Depends(get_db),
):
    application = db.query(PartnerApplication).filter(
        PartnerApplication.email == email
    ).first()
    if not application:
        raise HTTPException(404, "No application found for this email.")
    return {
        "status":            application.status,
        "is_email_verified": application.is_email_verified,
        "business_name":     application.business_name,
        "business_type":     application.business_type,
        "applied_at":        application.applied_at,
        "rejection_reason":  application.rejection_reason,
    }


# ── Module load confirmation ───────────────────────────────────────────────────
print("✅ partner_applications router loaded — universal for all business types")


# ─────────────────────────────────────────────────────────────
# ADD THIS ENDPOINT to partner_application.py
# For change password (used by all 3 dashboards)
# ─────────────────────────────────────────────────────────────

class ChangePasswordRequest(BaseModel):
    email:            str
    current_password: str
    new_password:     str

@router.post("/change-password")
async def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db)
):
    application = db.query(PartnerApplication).filter(
        PartnerApplication.email  == data.email,
        PartnerApplication.status == "approved"
    ).first()
    if not application:
        raise HTTPException(404, "Account not found.")

    if len(data.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters.")

    # Verify current password against business record
    if not _verify_password_for(application, data.current_password, db):
        raise HTTPException(401, "Current password is incorrect.")

    new_hashed = _hash_password(data.new_password)
    _update_business_password(application, new_hashed, db)
    application.generated_password = new_hashed
    db.commit()

    return {"success": True, "message": "Password changed successfully."}