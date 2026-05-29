"""
routers/admin_attractions.py

All attraction-related admin endpoints.
Used by content-admin.html panel.

Prefix: /admin  (same as admin.py — both use APIRouter prefix="/admin")
Register in main.py:
    from routers import admin_attractions
    app.include_router(admin_attractions.router)
"""
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db

from models.attraction import (
    Attraction,
    AttractionTimeline,
    AttractionGallery,
    AttractionReview,
)

router = APIRouter(prefix="/admin", tags=["admin-attractions"])


# ── helper ────────────────────────────────────────────────────
def _attraction_dict(attraction, timeline, gallery):
    return {
        "id":                      attraction.id,
        "name":                    attraction.name,
        "description":             attraction.description,
        "latitude":                attraction.latitude,
        "longitude":               attraction.longitude,
        "address":                 attraction.address,
        "rating":                  attraction.rating,
        "review_count":            attraction.review_count,
        "image_url":               attraction.image_url,
        "category":                attraction.category,
        "phone":                   attraction.phone,
        "opening_hours":           attraction.opening_hours,
        "entry_fee":               attraction.entry_fee,
        "website":                 attraction.website,
        "is_partner":              attraction.is_partner,
        "year_built":              attraction.year_built,
        "historical_period":       attraction.historical_period,
        "duration":                attraction.duration,
        "best_time":               attraction.best_time,
        "historical_significance": attraction.historical_significance,
        "status":                  getattr(attraction, "status", "approved"),
        "timeline": [
            {
                "id":          t.id,
                "year":        t.year,
                "title":       t.event_title,
                "description": t.event_description,
                "order":       t.order,
            } for t in timeline
        ],
        "gallery": [
            {
                "id":        g.id,
                "image_url": g.image_url,
                "caption":   g.caption,
                "order":     g.order,
            } for g in gallery
        ],
    }


# ══════════════════════════════════════════════════════════════
#  ATTRACTION CRUD
# ══════════════════════════════════════════════════════════════

@router.get("/attractions")
def list_attractions(
    skip:  int = Query(0,   ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    total       = db.query(Attraction).count()
    attractions = db.query(Attraction).offset(skip).limit(limit).all()
    result = []
    for a in attractions:
        tl  = db.query(AttractionTimeline).filter(AttractionTimeline.attraction_id == a.id).all()
        gal = db.query(AttractionGallery).filter(AttractionGallery.attraction_id == a.id).all()
        result.append(_attraction_dict(a, tl, gal))
    return {"total": total, "skip": skip, "limit": limit, "attractions": result}


@router.get("/attractions/{attraction_id}")
def get_attraction(attraction_id: int, db: Session = Depends(get_db)):
    a = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not a:
        raise HTTPException(404, "Attraction not found")
    tl  = db.query(AttractionTimeline).filter(AttractionTimeline.attraction_id == attraction_id).all()
    gal = db.query(AttractionGallery).filter(AttractionGallery.attraction_id == attraction_id).all()
    return _attraction_dict(a, tl, gal)


@router.post("/attractions")
def create_attraction(data: dict, db: Session = Depends(get_db)):
    website = data.get("website")
    if website and len(website) > 255:
        raise HTTPException(400, "Website URL too long (max 255 chars).")
    try:
        a = Attraction(
            name                    = data.get("name"),
            description             = data.get("description"),
            latitude                = data.get("latitude"),
            longitude               = data.get("longitude"),
            address                 = data.get("address"),
            rating                  = data.get("rating", 0.0),
            review_count            = data.get("review_count", 0),
            image_url               = data.get("image_url"),
            category                = data.get("category"),
            phone                   = data.get("phone"),
            opening_hours           = data.get("opening_hours"),
            entry_fee               = data.get("entry_fee"),
            website                 = website,
            is_partner              = data.get("is_partner", False),
            year_built              = data.get("year_built") or None,
            historical_period       = data.get("historical_period"),
            duration                = data.get("duration"),
            best_time               = data.get("best_time"),
            historical_significance = data.get("historical_significance"),
        )
        db.add(a)
        db.commit()
        db.refresh(a)
        return _attraction_dict(a, [], [])
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(500, str(e))


@router.put("/attractions/{attraction_id}")
def update_attraction(attraction_id: int, data: dict, db: Session = Depends(get_db)):
    a = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not a:
        raise HTTPException(404, "Attraction not found")
    for key, value in data.items():
        if hasattr(a, key):
            setattr(a, key, value)
    db.commit()
    db.refresh(a)
    tl  = db.query(AttractionTimeline).filter(AttractionTimeline.attraction_id == attraction_id).all()
    gal = db.query(AttractionGallery).filter(AttractionGallery.attraction_id == attraction_id).all()
    return _attraction_dict(a, tl, gal)


@router.delete("/attractions/{attraction_id}")
def delete_attraction(attraction_id: int, db: Session = Depends(get_db)):
    a = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not a:
        raise HTTPException(404, "Attraction not found")
    db.query(AttractionTimeline).filter(AttractionTimeline.attraction_id == attraction_id).delete()
    db.query(AttractionGallery).filter(AttractionGallery.attraction_id == attraction_id).delete()
    db.query(AttractionReview).filter(AttractionReview.attraction_id == attraction_id).delete()
    db.delete(a)
    db.commit()
    return {"success": True, "message": "Attraction deleted."}


# ══════════════════════════════════════════════════════════════
#  TIMELINE
# ══════════════════════════════════════════════════════════════

@router.get("/attractions/{attraction_id}/timeline")
def get_timeline(attraction_id: int, db: Session = Depends(get_db)):
    events = db.query(AttractionTimeline).filter(
        AttractionTimeline.attraction_id == attraction_id
    ).order_by(AttractionTimeline.order, AttractionTimeline.year).all()
    return [
        {
            "id":          e.id,
            "year":        e.year,
            "title":       e.event_title,
            "description": e.event_description,
            "order":       e.order,
        } for e in events
    ]


@router.post("/attractions/{attraction_id}/timeline")
def add_timeline_event(attraction_id: int, data: dict, db: Session = Depends(get_db)):
    a = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not a:
        raise HTTPException(404, "Attraction not found")
    event = AttractionTimeline(
        attraction_id     = attraction_id,
        year              = data.get("year"),
        event_title       = data.get("event_title") or data.get("title"),
        event_description = data.get("event_description") or data.get("description"),
        order             = data.get("order", 0),
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return {
        "id":          event.id,
        "year":        event.year,
        "title":       event.event_title,
        "description": event.event_description,
    }


@router.delete("/attractions/timeline/{event_id}")
def delete_timeline_event(event_id: int, db: Session = Depends(get_db)):
    event = db.query(AttractionTimeline).filter(AttractionTimeline.id == event_id).first()
    if not event:
        raise HTTPException(404, "Timeline event not found")
    db.delete(event)
    db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════
#  GALLERY
# ══════════════════════════════════════════════════════════════

@router.get("/attractions/{attraction_id}/gallery")
def get_gallery(attraction_id: int, db: Session = Depends(get_db)):
    photos = db.query(AttractionGallery).filter(
        AttractionGallery.attraction_id == attraction_id
    ).order_by(AttractionGallery.order).all()
    return [
        {
            "id":        p.id,
            "image_url": p.image_url,
            "caption":   p.caption,
            "order":     p.order,
        } for p in photos
    ]


@router.post("/attractions/{attraction_id}/gallery")
def add_gallery_photo(attraction_id: int, data: dict, db: Session = Depends(get_db)):
    a = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not a:
        raise HTTPException(404, "Attraction not found")
    photo = AttractionGallery(
        attraction_id = attraction_id,
        image_url     = data.get("image_url"),
        caption       = data.get("caption"),
        order         = data.get("order", 0),
    )
    db.add(photo)
    db.commit()
    db.refresh(photo)
    return {
        "id":        photo.id,
        "image_url": photo.image_url,
        "caption":   photo.caption,
    }


@router.delete("/attractions/gallery/{photo_id}")
def delete_gallery_photo(photo_id: int, db: Session = Depends(get_db)):
    photo = db.query(AttractionGallery).filter(AttractionGallery.id == photo_id).first()
    if not photo:
        raise HTTPException(404, "Photo not found")
    db.delete(photo)
    db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════
#  REVIEWS
# ══════════════════════════════════════════════════════════════

@router.get("/attractions/{attraction_id}/reviews")
def get_attraction_reviews(attraction_id: int, db: Session = Depends(get_db)):
    reviews = db.query(AttractionReview).filter(
        AttractionReview.attraction_id == attraction_id
    ).order_by(AttractionReview.created_at.desc()).all()
    return [
        {
            "id":            r.id,
            "reviewer_name": getattr(r, "reviewer_name", None) or "Anonymous",
            "rating":        r.rating,
            "comment":       r.comment,
            "status":        getattr(r, "status", "approved"),
            "created_at":    r.created_at.isoformat() if r.created_at else None,
        } for r in reviews
    ]


@router.post("/attractions/{attraction_id}/reviews/{review_id}/approve")
def approve_review(attraction_id: int, review_id: int, db: Session = Depends(get_db)):
    r = db.query(AttractionReview).filter(
        AttractionReview.id == review_id,
        AttractionReview.attraction_id == attraction_id
    ).first()
    if not r:
        raise HTTPException(404, "Review not found")
    r.status = "approved"
    db.commit()
    return {"success": True}


@router.post("/attractions/{attraction_id}/reviews/{review_id}/reject")
def reject_review(attraction_id: int, review_id: int, db: Session = Depends(get_db)):
    r = db.query(AttractionReview).filter(
        AttractionReview.id == review_id,
        AttractionReview.attraction_id == attraction_id
    ).first()
    if not r:
        raise HTTPException(404, "Review not found")
    r.status = "rejected"
    db.commit()
    return {"success": True}


@router.delete("/attractions/{attraction_id}/reviews/{review_id}")
def delete_review(attraction_id: int, review_id: int, db: Session = Depends(get_db)):
    r = db.query(AttractionReview).filter(
        AttractionReview.id == review_id,
        AttractionReview.attraction_id == attraction_id
    ).first()
    if not r:
        raise HTTPException(404, "Review not found")
    db.delete(r)
    db.commit()
    return {"success": True}


# ══════════════════════════════════════════════════════════════
#  IMAGE UPLOAD (shared with content-admin)
# ══════════════════════════════════════════════════════════════

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    import shutil, uuid
    from pathlib import Path
    allowed = {"image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Invalid file type.")
    if file.size and file.size > 10 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 10MB).")
    upload_dir = Path("static/uploads")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    with (upload_dir / filename).open("wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return {"url": f"/static/uploads/{filename}"}