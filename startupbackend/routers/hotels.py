from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from models import Hotel, HotelRoom, HotelReview
from schemas import HotelReviewCreate
from services import update_hotel_rating

router = APIRouter(prefix="/hotels", tags=["hotels"])


@router.get("", response_model=List[dict])
def get_all_hotels(db: Session = Depends(get_db)):
    """Get all hotels"""
    hotels = db.query(Hotel).filter(
        Hotel.status=="approved").all()
    return [
        {
            "id": h.id,
            "name": h.name,
            "description": h.description,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "address": h.address,
            "rating": h.rating,
            "review_count": h.review_count,
            "image_url": h.image_url,
            "type": h.type,
            "phone": h.phone,
            "opening_hours": h.opening_hours,
            "is_partner": h.is_partner,
            "website": h.website,
            "offer": h.offer
        }
        for h in hotels
    ]


@router.get("/{hotel_id}", response_model=dict)
def get_hotel(hotel_id: int, db: Session = Depends(get_db)):
    """Get a specific hotel by ID"""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id, Hotel.status=="approved").first()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    return {
        "id": hotel.id,
        "name": hotel.name,
        "description": hotel.description,
        "latitude": hotel.latitude,
        "longitude": hotel.longitude,
        "address": hotel.address,
        "rating": hotel.rating,
        "review_count": hotel.review_count,
        "image_url": hotel.image_url,
        "type": hotel.type,
        "phone": hotel.phone,
        "opening_hours": hotel.opening_hours,
        "is_partner": hotel.is_partner,
        "website": hotel.website,
        "offer": hotel.offer
    }


@router.get("/{hotel_id}/rooms", response_model=List[dict])
def get_hotel_rooms(hotel_id: int, db: Session = Depends(get_db)):
    """Get all rooms for a hotel"""
    rooms = db.query(HotelRoom).filter(HotelRoom.hotel_id == hotel_id, HotelRoom.status=="approved").all()
    return [
        {
            "id": r.id,
            "hotel_id": r.hotel_id,
            "room_type": r.room_type,
            "price": r.price,
            "capacity": r.capacity,
            "image_url": r.image_url,
            "description": r.description,
            "available": r.available
        }
        for r in rooms
    ]


@router.get("/{hotel_id}/reviews", response_model=List[dict])
def get_hotel_reviews(hotel_id: int, db: Session = Depends(get_db)):
    """Get all reviews for a hotel"""
    reviews = (
        db.query(HotelReview)
        .filter(HotelReview.hotel_id == hotel_id)
        .order_by(HotelReview.created_at.desc())
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
def create_hotel_review(review: HotelReviewCreate, db: Session = Depends(get_db)):
    """Create a new hotel review"""
    if not 1 <= review.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    if not review.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    db_review = HotelReview(**review.dict())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    # Update hotel rating
    update_hotel_rating(db, review.hotel_id)

    return db_review