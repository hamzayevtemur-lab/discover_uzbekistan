from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Attraction, AttractionReview, AttractionTimeline, AttractionGallery
from schemas import AttractionReviewCreate
from services import update_attraction_rating
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/attractions", tags=["attractions"])


@router.get("", response_model=List[dict])
def get_all_attractions(db: Session = Depends(get_db)):
    """Get all attractions"""
    attractions = db.query(Attraction).all()
    return [
        {
            "id": a.id,
            "name": a.name,
            "description": a.description,
            "latitude": a.latitude,
            "longitude": a.longitude,
            "address": a.address,
            "rating": a.rating,
            "review_count": a.review_count,
            "image_url": a.image_url,
            "category": a.category,
            "phone": a.phone,
            "opening_hours": a.opening_hours,
            "entry_fee": a.entry_fee,
            "website": a.website,
            "is_partner": a.is_partner,
            "year_built": a.year_built,
            "historical_period": a.historical_period,
            "duration": a.duration,
            "best_time": a.best_time,
            "historical_significance": a.historical_significance
        }
        for a in attractions
    ]


@router.get("/{attraction_id}", response_model=dict)
def get_attraction(attraction_id: int, db: Session = Depends(get_db)):
    """Get a specific attraction by ID"""
    attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    return {
        "id": attraction.id,
        "name": attraction.name,
        "description": attraction.description,
        "latitude": attraction.latitude,
        "longitude": attraction.longitude,
        "address": attraction.address,
        "rating": attraction.rating,
        "review_count": attraction.review_count,
        "image_url": attraction.image_url,
        "category": attraction.category,
        "phone": attraction.phone,
        "opening_hours": attraction.opening_hours,
        "entry_fee": attraction.entry_fee,
        "website": attraction.website,
        "is_partner": attraction.is_partner,
        "year_built": attraction.year_built,
        "historical_period": attraction.historical_period,
        "duration": attraction.duration,
        "best_time": attraction.best_time,
        "historical_significance": attraction.historical_significance
    }


@router.get("/{attraction_id}/timeline", response_model=List[dict])
def get_attraction_timeline(attraction_id: int, db: Session = Depends(get_db)):
    """Get timeline events for an attraction"""
    timeline = (
        db.query(AttractionTimeline)
        .filter(AttractionTimeline.attraction_id == attraction_id)
        .order_by(AttractionTimeline.order)
        .all()
    )
    return [
        {
            "id": t.id,
            "year": t.year,
            "event_title": t.event_title,
            "event_description": t.event_description
        }
        for t in timeline
    ]


@router.get("/{attraction_id}/gallery", response_model=List[dict])
def get_attraction_gallery(attraction_id: int, db: Session = Depends(get_db)):
    """Get gallery images for an attraction"""
    gallery = (
        db.query(AttractionGallery)
        .filter(AttractionGallery.attraction_id == attraction_id)
        .order_by(AttractionGallery.order)
        .all()
    )
    return [
        {
            "id": g.id,
            "image_url": g.image_url,
            "caption": g.caption
        }
        for g in gallery
    ]


@router.get("/{attraction_id}/reviews", response_model=List[dict])
def get_attraction_reviews(attraction_id: int, db: Session = Depends(get_db)):
    """Get all reviews for an attraction"""
    reviews = (
        db.query(AttractionReview)
        .filter(AttractionReview.attraction_id == attraction_id)
        .order_by(AttractionReview.created_at.desc())
        .all()
    )
    return [
        {
            "id": r.id,
            "reviewer_name": r.reviewer_name,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at
        }
        for r in reviews
    ]


@router.post("/reviews", status_code=201)
def create_attraction_review(review: AttractionReviewCreate, db: Session = Depends(get_db)):
    """Create a new attraction review"""
    if not 1 <= review.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    if not review.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    db_review = AttractionReview(**review.dict())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    # Update attraction rating
    update_attraction_rating(db, review.attraction_id)

    return db_review


# Additional endpoints for partners to manage gallery photos

class GalleryPhotoIn(BaseModel):
    image_url: str
    caption: Optional[str] = None


@router.post("/{attraction_id}/gallery", status_code=201)
def add_gallery_photo(
    attraction_id: int,
    photo: GalleryPhotoIn,
    db: Session = Depends(get_db)
):
    """Add a photo to an attraction's gallery"""
    attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")

    # Get current max order
    max_order = db.query(AttractionGallery)\
        .filter(AttractionGallery.attraction_id == attraction_id)\
        .count()

    new_photo = AttractionGallery(
        attraction_id=attraction_id,
        image_url=photo.image_url,
        caption=photo.caption,
        order=max_order
    )
    db.add(new_photo)
    db.commit()
    db.refresh(new_photo)

    return {
        "id": new_photo.id,
        "image_url": new_photo.image_url,
        "caption": new_photo.caption,
        "order": new_photo.order
    }


@router.delete("/gallery/{photo_id}", status_code=200)
def delete_gallery_photo(
    photo_id: int,
    db: Session = Depends(get_db)
):
    """Delete a gallery photo by its ID"""
    photo = db.query(AttractionGallery).filter(AttractionGallery.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")

    db.delete(photo)
    db.commit()

    return {"success": True, "deleted_id": photo_id}

#something