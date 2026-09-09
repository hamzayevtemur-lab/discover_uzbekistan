from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import func
import math

from database import get_db
from models import Restaurant, RestaurantMenu, Review
from schemas import ReviewCreate, ReviewOut
from services import update_restaurant_rating

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


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
def get_all_restaurants(
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
    radius: Optional[float] = Query(None, description="Target radius in km"),
    db: Session = Depends(get_db)
):
    """Get restaurants with optional radius filtering (10km -> 20km auto-fallback)"""
    restaurants = db.query(Restaurant).filter(
        Restaurant.status == "approved"
    ).all()

    result = []
    for r in restaurants:
        r_dict = {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "address": r.address,
            "rating": r.rating,
            "review_count": db.query(func.count(Review.id))
                     .filter(Review.restaurant_id == r.id)
                     .scalar() or 0,            
            "image_url": r.image_url,
            "cuisine_type": r.cuisine_type,     
            "phone": r.phone,                   
            "opening_hours": r.opening_hours,   
            "is_partner": r.is_partner,        
            "website": r.website,
            "instagram": r.instagram,
            "telegram": r.telegram
        }

        if lat is not None and lng is not None:
            dist = haversine_distance(lat, lng, r.latitude, r.longitude)
            r_dict["distance"] = round(dist, 2) if dist != float('inf') else None
        else:
            r_dict["distance"] = None

        result.append(r_dict)

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


@router.get("/{restaurant_id}", response_model=dict)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    """Get a specific restaurant by ID"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id, Restaurant.status == "approved").first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    return {
        "id": restaurant.id,
        "name": restaurant.name,
        "description": restaurant.description,
        "latitude": restaurant.latitude,
        "longitude": restaurant.longitude,
        "address": restaurant.address,
        "rating": restaurant.rating,
        "image_url": restaurant.image_url,
        "cuisine_type": restaurant.cuisine_type,
        "phone": restaurant.phone,
        "opening_hours": restaurant.opening_hours,
        "is_partner": restaurant.is_partner,
        "website": restaurant.website,
        "instagram": restaurant.instagram,
        "telegram": restaurant.telegram,
        "review_count": db.query(func.count(Review.id))
                         .filter(Review.restaurant_id == restaurant.id)
                         .scalar() or 0
    }


@router.get("/{restaurant_id}/menu", response_model=List[dict])
def get_menu(restaurant_id: int, category: str = None, db: Session = Depends(get_db)):
    """Get menu items for a restaurant, optionally filtered by category"""
    query = db.query(RestaurantMenu).filter(
        RestaurantMenu.restaurant_id == restaurant_id,
        RestaurantMenu.status == "approved")
    
    if category:
        query = query.filter(RestaurantMenu.category == category)
    items = query.all()
    return [
        {
            "id": item.id,
            "item_name": item.item_name,
            "price": item.price,
            "image_url": item.image_url,
            "category": item.category
        }
        for item in items
    ]


@router.get("/{restaurant_id}/reviews", response_model=List[ReviewOut])
def get_reviews(restaurant_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(Review)
        .filter(
            Review.restaurant_id == restaurant_id,
            Review.status == "approved"
        )
        .order_by(Review.created_at.desc())
        .all()
    )
    return reviews


@router.post("/reviews", response_model=ReviewOut, status_code=201)
def create_review(review: ReviewCreate, db: Session = Depends(get_db)):
    """Create a new restaurant review"""
    if not 1 <= review.rating <= 5:
        raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")

    if not review.comment.strip():
        raise HTTPException(status_code=400, detail="Comment cannot be empty")

    db_review = Review(**review.dict(), status="pending")
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    # Update restaurant average rating
    update_restaurant_rating(db, review.restaurant_id)

    return db_review