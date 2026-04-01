import secrets
import string
import hashlib
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from jose import jwt

from database import get_db, Base
import os


# ══════════════════════════════════════════════════
#  CONFIG  — edit before going live
# ══════════════════════════════════════════════════

SECRET_KEY    = os.environ.get("SECRET_KEY")
ALGORITHM     = "HS256"

SMTP_HOST     = "smtp.gmail.com"
SMTP_PORT     = 587
SMTP_USER     = os.environ.get("SMTP_USER")
SMTP_PASS     = os.environ.get("SMTP_PASS")
FROM_NAME     = "Discover Uzbekistan"

ADMIN_EMAIL   = os.environ.get("ADMIN_EMAIL")
FRONTEND_BASE = os.environ.get("FRONTEND_BASE", "http://localhost:8000")

# Dashboard URL per business type — add new types here as needed
DASHBOARD_URLS = {
    "restaurant":    "restaurants-admin-portal.html",
    "hotel":         "hotel-admin-dashboard.html",
    "travel_agency": "travel-agency-admin-dashboard.html",
    "attraction":    "attraction-admin-dashboard.html",
    # "spa":          "spa-admin-dashboard.html",   ← just add a line
}

# Human-readable labels per type (for emails)
BUSINESS_LABELS = {
    "restaurant":    "🍽️ Restaurant / Café",
    "hotel":         "🏨 Hotel / Guesthouse",
    "travel_agency": "🌍 Travel Agency",
    "attraction":    "🏛️ Tourist Attraction",
    "multiple":      "📦 Multiple Businesses",
}


# ══════════════════════════════════════════════════
#  DATABASE MODEL  (single table for all types)
# ══════════════════════════════════════════════════

class PartnerApplication(Base):
    """
    One row per signup application, for every business type.
    Separated from live business tables so unapproved applicants
    don't appear on the public site.
    """
    __tablename__ = "partner_applications"

    id               = Column(Integer, primary_key=True, index=True)

    # What kind of business
    business_type    = Column(String(50), nullable=False, index=True)  # restaurant / hotel / travel_agency / …

    # Business info
    business_name    = Column(String(255), nullable=False)
    contact_name     = Column(String(255), nullable=False)
    email            = Column(String(255), nullable=False, unique=True, index=True)
    phone            = Column(String(50))
    address          = Column(String(500))
    city             = Column(String(100))
    website          = Column(String(255))
    description      = Column(Text)

    # Extra fields for travel agencies
    agency_type      = Column(String(100))
    years_experience = Column(Integer)
    languages        = Column(String(255))

    # Plan chosen on signup form
    plan             = Column(String(50))    # 1month / 3months / 6months / 1year
    plan_amount      = Column(Integer)       # price in USD

    # Email verification
    is_email_verified    = Column(Boolean, default=False)
    email_verify_token   = Column(String(128), unique=True)
    email_verify_sent_at = Column(DateTime)

    # Workflow:  pending → email_verified → approved / rejected
    status           = Column(String(30), default="pending", index=True)
    applied_at       = Column(DateTime, default=datetime.utcnow)
    reviewed_at      = Column(DateTime)
    reviewed_by      = Column(String(100))
    rejection_reason = Column(Text)

    # Set on approval
    generated_password = Column(String(128))   # stored hashed
    linked_record_id   = Column(Integer)       # id of the row created in the business table
    credentials_sent   = Column(Boolean, default=False)


# ══════════════════════════════════════════════════
#  HELPERS
# ══════════════════════════════════════════════════

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def generate_password(length: int = 12) -> str:
    chars = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(chars) for _ in range(length))

def generate_token() -> str:
    return secrets.token_urlsafe(48)

def create_access_token(data: dict, days: int = 30) -> str:
    payload = {**data, "exp": datetime.utcnow() + timedelta(days=days)}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def dashboard_url_for(business_type: str, record_id: int) -> str:
    page = DASHBOARD_URLS.get(business_type, "partner-portal.html")
    return f"{FRONTEND_BASE}/{page}?agency={record_id}"  # changed id= to agency=

def login_url_for(business_type: str) -> str:
    return f"{FRONTEND_BASE}/partner-login.html"


# ══════════════════════════════════════════════════
#  EMAIL SENDING
# ══════════════════════════════════════════════════

def _send(to_email: str, to_name: str, subject: str, html: str):
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"{FROM_NAME} <{SMTP_USER}>"
    msg["To"]      = f"{to_name} <{to_email}>"
    msg.attach(MIMEText(html, "html"))
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as s:
            s.ehlo(); s.starttls(); s.login(SMTP_USER, SMTP_PASS)
            s.sendmail(SMTP_USER, to_email, msg.as_string())
        print(f"✅ Email → {to_email}")
    except Exception as e:
        print(f"❌ Email failed → {to_email}: {e}")


def send_verification_email(app: PartnerApplication, token: str, bg: BackgroundTasks):
    verify_url = f"{FRONTEND_BASE}/partner-verify.html?token={token}"
    type_label = BUSINESS_LABELS.get(app.business_type, app.business_type)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
      <h2 style="color:#6366f1">Verify your email address</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Thank you for applying to list your <strong>{type_label}</strong> on <strong>Discover Uzbekistan</strong>.
         Please verify your email to continue.</p>
      <a href="{verify_url}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
        ✉️ Verify Email Address
      </a>
      <p style="color:#888;font-size:13px">This link expires in 24 hours. If you didn't apply, ignore this email.</p>
    </div>"""
    bg.add_task(_send, app.email, app.contact_name, "Verify your email — Discover Uzbekistan", html)


def send_admin_notification(app: PartnerApplication, bg: BackgroundTasks):
    type_label = BUSINESS_LABELS.get(app.business_type, app.business_type)
    admin_url  = f"{FRONTEND_BASE}/admin.html#partner-applications"
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
      <h2 style="color:#6366f1">New Partner Application — {type_label}</h2>
      <p>A new applicant has verified their email and is awaiting your approval.</p>
      <table style="width:100%;border-collapse:collapse;margin:20px 0">
        <tr><td style="padding:8px;color:#888;width:40%">Business Type</td><td style="padding:8px;font-weight:bold">{type_label}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Business Name</td><td style="padding:8px">{app.business_name}</td></tr>
        <tr><td style="padding:8px;color:#888">Contact</td><td style="padding:8px">{app.contact_name}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Email</td><td style="padding:8px">{app.email}</td></tr>
        <tr><td style="padding:8px;color:#888">Phone</td><td style="padding:8px">{app.phone or '—'}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Address</td><td style="padding:8px">{app.address or '—'}</td></tr>
        <tr><td style="padding:8px;color:#888">Plan</td><td style="padding:8px">{app.plan or '—'} (${app.plan_amount or 0})</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:8px;color:#888">Applied</td><td style="padding:8px">{app.applied_at.strftime('%Y-%m-%d %H:%M UTC')}</td></tr>
      </table>
      {f'<p><strong>Description:</strong><br>{app.description}</p>' if app.description else ''}
      <a href="{admin_url}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold">
        → Review in Admin Panel
      </a>
    </div>"""
    bg.add_task(_send, ADMIN_EMAIL, "Admin", f"New {type_label} Application: {app.business_name}", html)


def send_approval_email(app: PartnerApplication, plain_pw: str, record_id: int, bg: BackgroundTasks):
    type_label  = BUSINESS_LABELS.get(app.business_type, app.business_type)
    login_url   = login_url_for(app.business_type)
    dash_url    = dashboard_url_for(app.business_type, record_id)
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
      <h2 style="color:#10b981">🎉 Your application has been approved!</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Your <strong>{type_label}</strong> partner account on <strong>Discover Uzbekistan</strong> is ready.</p>
      <div style="background:#f0fdf4;border:2px solid #10b981;border-radius:10px;padding:24px;margin:24px 0">
        <p style="margin:0 0 12px;color:#065f46;font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:0.05em">Your Login Credentials</p>
        <p style="margin:6px 0"><strong>Login page:</strong> <a href="{login_url}" style="color:#6366f1">{login_url}</a></p>
        <p style="margin:6px 0"><strong>Email:</strong> {app.email}</p>
        <p style="margin:6px 0"><strong>Password:</strong> <code style="background:#e0e7ff;padding:3px 8px;border-radius:4px;font-size:16px">{plain_pw}</code></p>
        <p style="margin:6px 0"><strong>Dashboard:</strong> <a href="{dash_url}" style="color:#6366f1">{dash_url}</a></p>
      </div>
      <p style="color:#555;font-size:14px">⚠️ Please change your password after your first login.</p>
      <a href="{login_url}"
         style="display:inline-block;margin:24px 0;padding:14px 32px;background:#6366f1;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px">
        → Go to Dashboard
      </a>
    </div>"""
    bg.add_task(_send, app.email, app.contact_name, "✅ Your Partner Account is Ready — Discover Uzbekistan", html)


def send_rejection_email(app: PartnerApplication, reason: str, bg: BackgroundTasks):
    html = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;padding:40px;border-radius:12px">
      <h2 style="color:#ef4444">Application Update</h2>
      <p>Hi <strong>{app.contact_name}</strong>,</p>
      <p>Thank you for applying to partner with <strong>Discover Uzbekistan</strong>.
         After review, we are unable to approve your application at this time.</p>
      {f'<div style="background:#fef2f2;border-left:4px solid #ef4444;padding:16px;border-radius:4px;margin:20px 0"><p style="color:#991b1b;margin:0"><strong>Reason:</strong> {reason}</p></div>' if reason else ''}
      <p style="color:#555;font-size:14px">You may reapply in the future. Reply to this email if you have questions.</p>
    </div>"""
    bg.add_task(_send, app.email, app.contact_name, "Your Partner Application — Discover Uzbekistan", html)


# ══════════════════════════════════════════════════
#  PYDANTIC SCHEMAS
# ══════════════════════════════════════════════════

class SignupRequest(BaseModel):
    business_type:    str           # restaurant / hotel / travel_agency / attraction / multiple
    business_name:    str
    contact_name:     str
    email:            EmailStr
    phone:            Optional[str] = None
    address:          Optional[str] = None
    city:             Optional[str] = None
    website:          Optional[str] = None
    description:      Optional[str] = None
    plan:             Optional[str] = None
    plan_amount:      Optional[int] = None
    # Travel-agency-specific extras
    agency_type:      Optional[str] = None
    years_experience: Optional[int] = None
    languages:        Optional[str] = None

class LoginRequest(BaseModel):
    email:         EmailStr
    password:      str
    business_type: Optional[str] = None   # hint, not required

class ApproveRequest(BaseModel):
    admin_note: Optional[str] = None

class RejectRequest(BaseModel):
    reason: Optional[str] = None


# ══════════════════════════════════════════════════
#  ROUTER
# ══════════════════════════════════════════════════

router = APIRouter(prefix="/api/partner-applications", tags=["partner-applications"])


# ── 1. SIGNUP ──────────────────────────────────────

@router.post("/signup")
async def signup(data: SignupRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    if data.business_type not in {*DASHBOARD_URLS.keys(), "multiple"}:
        raise HTTPException(400, f"Unknown business_type '{data.business_type}'.")

    existing = db.query(PartnerApplication).filter(PartnerApplication.email == data.email).first()
    if existing:
        if existing.status == "approved":
            raise HTTPException(400, "This email already has an approved account. Please log in.")
        if existing.status in ("pending", "email_verified"):
            raise HTTPException(400, "An application for this email is already under review. Check your inbox for the verification link.")
        db.delete(existing)   # allow re-apply after rejection
        db.commit()

    token = generate_token()
    app = PartnerApplication(
        business_type    = data.business_type,
        business_name    = data.business_name,
        contact_name     = data.contact_name,
        email            = data.email,
        phone            = data.phone,
        address          = data.address,
        city             = data.city,
        website          = data.website,
        description      = data.description,
        plan             = data.plan,
        plan_amount      = data.plan_amount,
        agency_type      = data.agency_type,
        years_experience = data.years_experience,
        languages        = data.languages,
        email_verify_token   = token,
        email_verify_sent_at = datetime.utcnow(),
        status           = "pending",
    )
    db.add(app)
    db.commit()
    db.refresh(app)
    send_verification_email(app, token, bg)
    return {"message": "Application received! Please check your email to verify your address.", "application_id": app.id}


# ── 2. VERIFY EMAIL ────────────────────────────────

@router.get("/verify-email")
async def verify_email(token: str, bg: BackgroundTasks, db: Session = Depends(get_db)):
    app = db.query(PartnerApplication).filter(
        PartnerApplication.email_verify_token == token
    ).first()
    if not app:
        raise HTTPException(400, "Invalid or expired verification link.")
    if app.is_email_verified:
        return {"message": "Email already verified. Your application is under review.", "business_name": app.business_name}
    if app.email_verify_sent_at and datetime.utcnow() - app.email_verify_sent_at > timedelta(hours=24):
        raise HTTPException(400, "Verification link has expired. Please apply again.")

    app.is_email_verified  = True
    app.email_verify_token = None
    app.status             = "email_verified"
    db.commit()
    db.refresh(app)
    send_admin_notification(app, bg)
    return {"message": "Email verified! Your application is now under review.", "business_name": app.business_name, "business_type": app.business_type}


# ── 3. RESEND VERIFICATION ─────────────────────────

@router.post("/resend-verification")
async def resend_verification(email: str, bg: BackgroundTasks, db: Session = Depends(get_db)):
    app = db.query(PartnerApplication).filter(
        PartnerApplication.email == email,
        PartnerApplication.is_email_verified == False
    ).first()
    if not app:
        raise HTTPException(404, "No unverified application found for this email.")
    token = generate_token()
    app.email_verify_token   = token
    app.email_verify_sent_at = datetime.utcnow()
    db.commit()
    send_verification_email(app, token, bg)
    return {"message": "Verification email resent."}


# ── 4. ADMIN: LIST ALL APPLICATIONS ───────────────

@router.get("/admin/list")
async def list_applications(
    status:        Optional[str] = None,
    business_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(PartnerApplication)
    if status:        q = q.filter(PartnerApplication.status == status)
    if business_type: q = q.filter(PartnerApplication.business_type == business_type)
    return [_to_dict(a) for a in q.order_by(PartnerApplication.applied_at.desc()).all()]


# ── 5. ADMIN: APPROVE ─────────────────────────────

@router.post("/admin/{app_id}/approve")
async def approve(app_id: int, body: ApproveRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    app = _get_app(app_id, db)
    if app.status == "approved":
        raise HTTPException(400, "Already approved.")
    if not app.is_email_verified:
        raise HTTPException(400, "Cannot approve — applicant has not verified their email yet.")

    plain_pw  = generate_password()
    hashed_pw = hash_password(plain_pw)

    # Create the actual business record and set partner_password
    record_id = _create_business_record(app, hashed_pw, db)

    app.status             = "approved"
    app.reviewed_at        = datetime.utcnow()
    app.generated_password = hashed_pw
    app.linked_record_id   = record_id
    app.credentials_sent   = True
    db.commit()

    send_approval_email(app, plain_pw, record_id, bg)
    return {"message": f"Approved. Credentials sent to {app.email}.", "record_id": record_id}


# ── 6. ADMIN: REJECT ──────────────────────────────

@router.post("/admin/{app_id}/reject")
async def reject(app_id: int, body: RejectRequest, bg: BackgroundTasks, db: Session = Depends(get_db)):
    app = _get_app(app_id, db)
    if app.status == "rejected":
        raise HTTPException(400, "Already rejected.")
    app.status           = "rejected"
    app.reviewed_at      = datetime.utcnow()
    app.rejection_reason = body.reason
    db.commit()
    send_rejection_email(app, body.reason or "", bg)
    return {"message": f"Rejected. Email sent to {app.email}."}


# ── 7. UNIVERSAL PARTNER LOGIN ────────────────────

@router.post("/login")
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Single login endpoint for all partner types.
    Checks partner_password on the appropriate business table.
    Returns business_type so the frontend can redirect to the right dashboard.
    """
    # Find approved application for this email
    app = db.query(PartnerApplication).filter(
        PartnerApplication.email == data.email,
        PartnerApplication.status == "approved"
    ).first()

    if not app:
        # Give a specific message if they exist but aren't approved yet
        pending = db.query(PartnerApplication).filter(PartnerApplication.email == data.email).first()
        if pending:
            raise HTTPException(403, f"Your account is not yet approved. Current status: {pending.status}.")
        raise HTTPException(401, "Invalid email or password.")

    # Verify password against the actual business record
    if not _verify_password_for(app, data.password, db):
        raise HTTPException(401, "Invalid email or password.")

    token = create_access_token({
        "sub":           data.email,
        "business_type": app.business_type,
        "record_id":     app.linked_record_id,
    })

    return {
        "access_token":  token,
        "token_type":    "bearer",
        "business_type": app.business_type,
        "business_name": app.business_name,
        "record_id":     app.linked_record_id,
        "dashboard_url": dashboard_url_for(app.business_type, app.linked_record_id),
    }


# ── 8. CHECK APPLICATION STATUS ───────────────────

@router.get("/status")
async def check_status(email: str, db: Session = Depends(get_db)):
    app = db.query(PartnerApplication).filter(PartnerApplication.email == email).first()
    if not app:
        raise HTTPException(404, "No application found for this email.")
    return {
        "status":           app.status,
        "is_email_verified": app.is_email_verified,
        "business_name":    app.business_name,
        "business_type":    app.business_type,
        "applied_at":       app.applied_at,
        "rejection_reason": app.rejection_reason,
    }


# ══════════════════════════════════════════════════
#  INTERNAL HELPERS
# ══════════════════════════════════════════════════

def _get_app(app_id: int, db: Session) -> PartnerApplication:
    app = db.query(PartnerApplication).filter(PartnerApplication.id == app_id).first()
    if not app:
        raise HTTPException(404, "Application not found.")
    return app


def _create_business_record(app: PartnerApplication, hashed_pw: str, db: Session) -> int:
    """
    Creates the actual business row in the right table when admin approves.
    Add an elif branch here whenever you add a new business type.
    """
    from models.travel_agency import TravelAgency
    from models.restaurant import Restaurant
    from models.hotel import Hotel

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
        )

    else:
        # For unknown/future types, just store minimal info
        # You can replace this with a real model import later
        raise HTTPException(500, f"No business table mapped for type '{bt}'. Add it to _create_business_record().")

    db.add(record)
    db.flush()
    return record.id


def _verify_password_for(app: PartnerApplication, plain_pw: str, db: Session) -> bool:
    """Check the hashed password on the actual business record."""
    from models.travel_agency import TravelAgency
    from models.restaurant import Restaurant
    from models.hotel import Hotel

    hashed = hash_password(plain_pw)
    bt = app.business_type

    if bt == "travel_agency":
        rec = db.query(TravelAgency).filter(TravelAgency.id == app.linked_record_id).first()
    elif bt == "restaurant":
        rec = db.query(Restaurant).filter(Restaurant.id == app.linked_record_id).first()
    elif bt == "hotel":
        rec = db.query(Hotel).filter(Hotel.id == app.linked_record_id).first()
    else:
        return False

    return rec is not None and rec.partner_password == hashed


def _to_dict(a: PartnerApplication) -> dict:
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
        "plan":             a.plan,
        "plan_amount":      a.plan_amount,
        "agency_type":      a.agency_type,
        "years_experience": a.years_experience,
        "languages":        a.languages,
        "status":           a.status,
        "is_email_verified": a.is_email_verified,
        "applied_at":       a.applied_at.isoformat() if a.applied_at else None,
        "reviewed_at":      a.reviewed_at.isoformat() if a.reviewed_at else None,
        "rejection_reason": a.rejection_reason,
        "linked_record_id": a.linked_record_id,
        "credentials_sent": a.credentials_sent,
    }


print("✅ partner_applications router loaded — universal for all business types")