from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import math

from database import get_db
from models import Hotel, HotelRoom, HotelReview
from schemas import HotelReviewCreate
from services import update_hotel_rating

router = APIRouter(prefix="/hotels", tags=["hotels"])


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate great-circle distance between two GPS points in km"""
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return float('inf')
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


@router.get("", response_model=List[dict])
def get_all_hotels(
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
    radius: Optional[float] = Query(None, description="Target radius in km"),
    db: Session = Depends(get_db)
):
    """Get all hotels, optionally filtered by radius (10km -> 20km auto-fallback)"""
    hotels = db.query(Hotel).filter(
        Hotel.status == "approved"
    ).all()

    result = []
    for h in hotels:
        h_dict = {
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
            "instagram": h.instagram,
            "telegram": h.telegram,
            "offer": h.offer
        }

        if lat is not None and lng is not None:
            dist = haversine_distance(lat, lng, h.latitude, h.longitude)
            h_dict["distance"] = round(dist, 2) if dist != float('inf') else None
        else:
            h_dict["distance"] = None

        result.append(h_dict)

    if lat is not None and lng is not None:
        result.sort(key=lambda x: x["distance"] if x["distance"] is not None else 99999)
        if radius is not None:
            result = [item for item in result if item["distance"] is not None and item["distance"] <= radius]
        else:
            # Auto fallback: Try 10 km first, then 20 km, then all
            in_10 = [item for item in result if item["distance"] is not None and item["distance"] <= 10.0]
            if len(in_10) > 0:
                result = in_10
            else:
                in_20 = [item for item in result if item["distance"] is not None and item["distance"] <= 20.0]
                if len(in_20) > 0:
                    result = in_20

    return result


@router.get("/{hotel_id}", response_model=dict)
def get_hotel(hotel_id: int, db: Session = Depends(get_db)):
    """Get a specific hotel by ID"""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id, Hotel.status == "approved").first()
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
        "instagram": hotel.instagram,
        "telegram": hotel.telegram,
        "offer": hotel.offer
    }


@router.get("/{hotel_id}/rooms", response_model=List[dict])
def get_hotel_rooms(hotel_id: int, db: Session = Depends(get_db)):
    """Get all rooms for a hotel"""
    rooms = db.query(HotelRoom).filter(HotelRoom.hotel_id == hotel_id, HotelRoom.status == "approved").all()
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
    """Public endpoint — only returns approved reviews"""
    reviews = (
        db.query(HotelReview)
        .filter(
            HotelReview.hotel_id == hotel_id,
            HotelReview.status == "approved"
        )
        .order_by(HotelReview.created_at.desc())
        .all()
    )
    return [
        {
            "id":            r.id,
            "reviewer_name": r.reviewer_name,
            "rating":        r.rating,
            "comment":       r.comment,
            "created_at":    r.created_at,
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

    db_review = HotelReview(**review.dict(), status="pending")
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    # Update hotel rating
    update_hotel_rating(db, review.hotel_id)

    return db_review