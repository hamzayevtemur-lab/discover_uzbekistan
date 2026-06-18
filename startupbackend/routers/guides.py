"""
routers/guides.py
Public + partner endpoints for local guides
"""
from __future__ import annotations
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Boolean
from sqlalchemy.orm import Session
from database import Base, get_db
from routers.partner_auth import get_partner_token

router = APIRouter(prefix="/api/guides", tags=["guides"])

# ── Model ─────────────────────────────────────────────────────
class Guide(Base):
    __tablename__ = "guides"
    id               = Column(Integer, primary_key=True, index=True)
    name             = Column(String(255), nullable=False)
    bio              = Column(Text)
    photo_url        = Column(String(500))
    languages        = Column(String(255))
    cities           = Column(String(255))
    tour_types       = Column(String(255))
    price_per_day    = Column(Numeric(10, 2))
    experience_years = Column(Integer, default=0)
    phone            = Column(String(50))
    telegram         = Column(String(100))
    instagram        = Column(String(100))
    email            = Column(String(255), unique=True)
    password_hash    = Column(String(255))
    status           = Column(String(20), default='pending')
    rating           = Column(Numeric(3, 2), default=0.0)
    review_count     = Column(Integer, default=0)
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime, default=datetime.utcnow)

def _to_dict(g: Guide) -> dict:
    return {
        "id":               g.id,
        "name":             g.name,
        "bio":              g.bio,
        "photo_url":        g.photo_url,
        "languages":        g.languages,
        "cities":           g.cities,
        "tour_types":       g.tour_types,
        "price_per_day":    float(g.price_per_day) if g.price_per_day else None,
        "experience_years": g.experience_years,
        "phone":            g.phone,
        "telegram":         g.telegram,
        "instagram":        g.instagram,
        "email":            g.email,
        "status":           g.status,
        "rating":           float(g.rating) if g.rating else 0.0,
        "review_count":     g.review_count,
        "is_active":        g.is_active,
        "created_at":       g.created_at.isoformat() if g.created_at else None,
    }

# ── Schemas ───────────────────────────────────────────────────
class GuideUpdate(BaseModel):
    name:             Optional[str]   = None
    bio:              Optional[str]   = None
    photo_url:        Optional[str]   = None
    languages:        Optional[str]   = None
    cities:           Optional[str]   = None
    tour_types:       Optional[str]   = None
    price_per_day:    Optional[float] = None
    experience_years: Optional[int]   = None
    phone:            Optional[str]   = None
    telegram:         Optional[str]   = None
    instagram:        Optional[str]   = None

# ── Public endpoints ──────────────────────────────────────────
@router.get("")
def list_guides(
    city:      Optional[str] = None,
    language:  Optional[str] = None,
    tour_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all approved active guides with optional filters."""
    guides = db.query(Guide).filter(
        Guide.status == 'approved',
        Guide.is_active == True,
    ).all()

    result = [_to_dict(g) for g in guides]

    if city:
        result = [g for g in result if g['cities'] and city.lower() in g['cities'].lower()]
    if language:
        result = [g for g in result if g['languages'] and language.lower() in g['languages'].lower()]
    if tour_type:
        result = [g for g in result if g['tour_types'] and tour_type.lower() in g['tour_types'].lower()]

    return sorted(result, key=lambda x: x['rating'], reverse=True)


@router.get("/{guide_id}")
def get_guide(guide_id: int, db: Session = Depends(get_db)):
    """Get a single guide by ID."""
    g = db.query(Guide).filter(Guide.id == guide_id).first()
    if not g:
        raise HTTPException(404, "Guide not found")
    return _to_dict(g)


# ── Partner endpoints (guide updates own profile) ─────────────
@router.put("/{guide_id}")
def update_guide(
    guide_id: int,
    data: GuideUpdate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    """Guide updates their own profile."""
    record_id = token.get("record_id") or token.get("id")
    biz_type  = token.get("business_type") or token.get("type")
    if biz_type != "guide" or record_id != guide_id:
        raise HTTPException(403, "Not authorized")

    g = db.query(Guide).filter(Guide.id == guide_id).first()
    if not g:
        raise HTTPException(404, "Guide not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(g, field, value)

    # Reset to pending so admin re-approves updated profile
    g.status = 'pending'
    db.commit()
    db.refresh(g)
    return _to_dict(g)


# ── Reviews ───────────────────────────────────────────────────
class ReviewCreate(BaseModel):
    reviewer_name: Optional[str] = "Anonymous"
    rating:        float
    comment:       Optional[str] = None

class GuideReview(Base):
    __tablename__ = "guide_reviews"
    id            = Column(Integer, primary_key=True, index=True)
    guide_id      = Column(Integer, nullable=False, index=True)
    reviewer_name = Column(String(255))
    rating        = Column(Numeric(3, 1))
    comment       = Column(Text)
    status        = Column(String(20), default='pending')
    created_at    = Column(DateTime, default=datetime.utcnow)


@router.get("/{guide_id}/reviews")
def get_guide_reviews(guide_id: int, db: Session = Depends(get_db)):
    reviews = db.query(GuideReview).filter(
        GuideReview.guide_id == guide_id
    ).order_by(GuideReview.created_at.desc()).all()
    return [
        {
            "id":            r.id,
            "reviewer_name": r.reviewer_name,
            "rating":        float(r.rating) if r.rating else 0,
            "comment":       r.comment,
            "status":        r.status,
            "created_at":    r.created_at.isoformat() if r.created_at else None,
        }
        for r in reviews
    ]


@router.post("/{guide_id}/reviews", status_code=201)
def create_guide_review(
    guide_id: int,
    data: ReviewCreate,
    db: Session = Depends(get_db)
):
    g = db.query(Guide).filter(Guide.id == guide_id).first()
    if not g:
        raise HTTPException(404, "Guide not found")
    review = GuideReview(
        guide_id      = guide_id,
        reviewer_name = data.reviewer_name or "Anonymous",
        rating        = data.rating,
        comment       = data.comment,
        status        = 'pending',
    )
    db.add(review)
    db.commit()
    return {"success": True, "message": "Review submitted for approval."}


@router.post("/{guide_id}/reviews/{review_id}/approve")
def approve_guide_review(
    guide_id: int,
    review_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    r = db.query(GuideReview).filter(
        GuideReview.id == review_id,
        GuideReview.guide_id == guide_id
    ).first()
    if not r:
        raise HTTPException(404, "Review not found")
    r.status = 'approved'
    db.commit()
    _update_guide_rating(guide_id, db)
    return {"success": True}


@router.post("/{guide_id}/reviews/{review_id}/reject")
def reject_guide_review(
    guide_id: int,
    review_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    r = db.query(GuideReview).filter(
        GuideReview.id == review_id,
        GuideReview.guide_id == guide_id
    ).first()
    if not r:
        raise HTTPException(404, "Review not found")
    r.status = 'rejected'
    db.commit()
    return {"success": True}


def _update_guide_rating(guide_id: int, db: Session):
    """Recalculate guide rating from approved reviews."""
    reviews = db.query(GuideReview).filter(
        GuideReview.guide_id == guide_id,
        GuideReview.status   == 'approved'
    ).all()
    if reviews:
        avg = sum(float(r.rating) for r in reviews) / len(reviews)
        g = db.query(Guide).filter(Guide.id == guide_id).first()
        if g:
            g.rating       = round(avg, 2)
            g.review_count = len(reviews)
            db.commit()