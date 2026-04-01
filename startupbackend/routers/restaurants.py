from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import func

from database import get_db
from models import Restaurant, RestaurantMenu, Review
from schemas import ReviewCreate, ReviewOut
from services import update_restaurant_rating

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.get("", response_model=List[dict])
def get_all_restaurants(db: Session = Depends(get_db)):
    """Get all restaurants with review counts"""
    restaurants = db.query(Restaurant).filter(
        Restaurant.status == "approved"
    ).all()
    return [
        {
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
            "website": r.website
        }
        for r in restaurants
    ]


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
    """Get all reviews for a restaurant"""
    reviews = (
        db.query(Review)
         .filter(Review.restaurant_id == restaurant_id)
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

    db_review = Review(**review.dict())
    db.add(db_review)
    db.commit()
    db.refresh(db_review)

    # Update restaurant average rating
    update_restaurant_rating(db, review.restaurant_id)

    return db_review