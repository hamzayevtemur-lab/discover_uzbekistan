from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Security
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc
from typing import List, Optional
from datetime import datetime
import os
import shutil
from pathlib import Path

from database import get_db
from models import (
    Restaurant, RestaurantMenu, Review,
    Hotel, HotelRoom, HotelReview,
    Attraction, AttractionTimeline, AttractionReview, AttractionGallery,
    Like, TravelAgency, Tour, AgencyReview, TourItinerary, TourDestination
)

router = APIRouter(prefix="/admin", tags=["admin"])

API_KEY = os.environ.get("ADMIN_SECRET_KEY")
api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)

async def verify_admin_key(key: str = Security(api_key_header)):
    if not key or key != API_KEY:
        raise HTTPException(status_code=403, detail="Not authorized")
    


# ==================== IMAGE UPLOAD ====================

@router.post("/upload-image")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image and return the URL"""
    try:
        # Create uploads directory if it doesn't exist
        upload_dir = Path("static/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        import uuid
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return the URL
        image_url = f"/static/uploads/{unique_filename}"
        return {"url": image_url, "filename": unique_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")


# ==================== DASHBOARD STATS ====================

@router.get("/stats", dependencies=[Depends(verify_admin_key)])
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get overview statistics for the admin dashboard"""
    # Use raw SQL to avoid ORM mapping issues with likes table
    total_likes_result = db.execute(text("SELECT SUM(like_count) FROM likes")).scalar()
    total_likes = int(total_likes_result) if total_likes_result else 0
    
    unique_pages_result = db.execute(text("SELECT COUNT(*) FROM likes")).scalar()
    unique_pages = int(unique_pages_result) if unique_pages_result else 0
    
    return {
        "restaurants": {
            "total": db.query(Restaurant).count(),
            "partners": db.query(Restaurant).filter(Restaurant.is_partner == True).count(),
            "avg_rating": db.query(func.avg(Restaurant.rating)).scalar() or 0,
        },
        "hotels": {
            "total": db.query(Hotel).count(),
            "partners": db.query(Hotel).filter(Hotel.is_partner == True).count(),
            "avg_rating": db.query(func.avg(Hotel.rating)).scalar() or 0,
        },
        "attractions": {
            "total": db.query(Attraction).count(),
            "partners": db.query(Attraction).filter(Attraction.is_partner == True).count(),
            "avg_rating": db.query(func.avg(Attraction.rating)).scalar() or 0,
        },
        "reviews": {
            "total": (
                db.query(Review).count() +
                db.query(HotelReview).count() +
                db.query(AttractionReview).count()
            ),
            "restaurant_reviews": db.query(Review).count(),
            "hotel_reviews": db.query(HotelReview).count(),
            "attraction_reviews": db.query(AttractionReview).count(),
        },
        "likes": {
            "total": total_likes,
            "unique_pages": unique_pages,
        }
    }


# ==================== RECENT ACTIVITY ====================

@router.get("/recent-activity", dependencies=[Depends(verify_admin_key)])
def get_recent_activity(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db)):
    """Get recent reviews and activities"""
    restaurant_reviews = db.query(Review).order_by(desc(Review.created_at)).limit(limit).all()
    hotel_reviews = db.query(HotelReview).order_by(desc(HotelReview.created_at)).limit(limit).all()
    attraction_reviews = db.query(AttractionReview).order_by(desc(AttractionReview.created_at)).limit(limit).all()
    
    activities = []
    
    for review in restaurant_reviews:
        restaurant = db.query(Restaurant).filter(Restaurant.id == review.restaurant_id).first()
        activities.append({
            "type": "restaurant_review",
            "id": review.id,
            "place_name": restaurant.name if restaurant else "Unknown",
            "place_id": review.restaurant_id,
            "reviewer": review.reviewer_name,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at
        })
    
    for review in hotel_reviews:
        hotel = db.query(Hotel).filter(Hotel.id == review.hotel_id).first()
        activities.append({
            "type": "hotel_review",
            "id": review.id,
            "place_name": hotel.name if hotel else "Unknown",
            "place_id": review.hotel_id,
            "reviewer": review.reviewer_name,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at
        })
    
    for review in attraction_reviews:
        attraction = db.query(Attraction).filter(Attraction.id == review.attraction_id).first()
        activities.append({
            "type": "attraction_review",
            "id": review.id,
            "place_name": attraction.name if attraction else "Unknown",
            "place_id": review.attraction_id,
            "reviewer": review.reviewer_name,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at
        })
    
    activities.sort(key=lambda x: x['created_at'], reverse=True)
    return activities[:limit]


# ==================== RESTAURANTS ====================

@router.get("/restaurants", dependencies=[Depends(verify_admin_key)])
def list_restaurants(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all restaurants with menus and review counts"""
    total = db.query(Restaurant).count()
    restaurants = db.query(Restaurant).offset(skip).limit(limit).all()
    
    result = []
    for restaurant in restaurants:
        menus = db.query(RestaurantMenu).filter(
            RestaurantMenu.restaurant_id == restaurant.id
        ).all()
        
        review_count = db.query(Review).filter(
            Review.restaurant_id == restaurant.id
        ).count()
        
        result.append({
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
            "review_count": review_count,
            "menus": [{
                "id": m.id,
                "item_name": m.item_name,
                "price": m.price,
                "category": m.category,
                "image_url": m.image_url
            } for m in menus]
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "restaurants": result
    }


@router.post("/restaurants", dependencies=[Depends(verify_admin_key)])
def create_restaurant(data: dict, db: Session = Depends(get_db)):
    """Create a new restaurant"""
    try:
        # Validate website URL length
        website = data.get("website")
        if website and len(website) > 255:
            raise HTTPException(
                status_code=400, 
                detail="Website URL is too long (max 255 characters). Please use a shorter URL."
            )
        
        restaurant = Restaurant(
            name=data.get("name"),
            description=data.get("description"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            address=data.get("address"),
            rating=data.get("rating", 0.0),
            image_url=data.get("image_url"),
            cuisine_type=data.get("cuisine_type"),
            phone=data.get("phone"),
            opening_hours=data.get("opening_hours"),
            is_partner=data.get("is_partner", False),
            website=website
        )
        db.add(restaurant)
        db.commit()
        db.refresh(restaurant)
        return restaurant
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/restaurants/{restaurant_id}", dependencies=[Depends(verify_admin_key)])
def update_restaurant(restaurant_id: int, data: dict, db: Session = Depends(get_db)):
    """Update a restaurant"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    for key, value in data.items():
        if hasattr(restaurant, key):
            setattr(restaurant, key, value)
    
    db.commit()
    db.refresh(restaurant)
    return restaurant


@router.delete("/restaurants/{restaurant_id}")
def delete_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    """Delete a restaurant and all related data"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    db.query(RestaurantMenu).filter(RestaurantMenu.restaurant_id == restaurant_id).delete()
    db.query(Review).filter(Review.restaurant_id == restaurant_id).delete()
    db.delete(restaurant)
    db.commit()
    return {"message": "Restaurant deleted successfully"}


# ==================== HOTELS ====================

@router.get("/hotels" , dependencies=[Depends(verify_admin_key)])
def list_hotels(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all hotels with rooms"""
    total = db.query(Hotel).count()
    hotels = db.query(Hotel).offset(skip).limit(limit).all()
    
    result = []
    for hotel in hotels:
        rooms = db.query(HotelRoom).filter(HotelRoom.hotel_id == hotel.id).all()
        
        result.append({
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
            "offer": hotel.offer,
            "rooms": [{
                "id": r.id,
                "room_type": r.room_type,
                "price": r.price,
                "capacity": r.capacity,
                "image_url": r.image_url,
                "description": r.description,
                "available": r.available,
                "status": r.status,
                "rejection_reason": r.rejection_reason
            } for r in rooms]
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "hotels": result
    }


@router.post("/hotels", dependencies=[Depends(verify_admin_key)])
def create_hotel(data: dict, db: Session = Depends(get_db)):
    """Create a new hotel"""
    try:
        # Validate website URL length
        website = data.get("website")
        if website and len(website) > 255:
            raise HTTPException(
                status_code=400, 
                detail="Website URL is too long (max 255 characters). Please use a shorter URL."
            )
        
        hotel = Hotel(
            name=data.get("name"),
            description=data.get("description"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            address=data.get("address"),
            rating=data.get("rating", 0.0),
            review_count=data.get("review_count", 0),
            image_url=data.get("image_url"),
            type=data.get("type"),
            phone=data.get("phone"),
            opening_hours=data.get("opening_hours"),
            is_partner=data.get("is_partner", False),
            website=website,
            offer=data.get("offer")
        )
        db.add(hotel)
        db.commit()
        db.refresh(hotel)
        return hotel
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/hotels/{hotel_id}", dependencies=[Depends(verify_admin_key)])
def update_hotel(hotel_id: int, data: dict, db: Session = Depends(get_db)):
    """Update a hotel"""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    for key, value in data.items():
        if hasattr(hotel, key):
            setattr(hotel, key, value)
    
    db.commit()
    db.refresh(hotel)
    return hotel


@router.delete("/hotels/{hotel_id}", dependencies=[Depends(verify_admin_key)])
def delete_hotel(hotel_id: int, db: Session = Depends(get_db)):
    """Delete a hotel and all related data"""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    db.query(HotelRoom).filter(HotelRoom.hotel_id == hotel_id).delete()
    db.query(HotelReview).filter(HotelReview.hotel_id == hotel_id).delete()
    db.delete(hotel)
    db.commit()
    return {"message": "Hotel deleted successfully"}


# ==================== ATTRACTIONS ====================

@router.get("/attractions", dependencies=[Depends(verify_admin_key)])
def list_attractions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all attractions with timeline and gallery"""
    total = db.query(Attraction).count()
    attractions = db.query(Attraction).offset(skip).limit(limit).all()
    
    result = []
    for attraction in attractions:
        timeline = db.query(AttractionTimeline).filter(
            AttractionTimeline.attraction_id == attraction.id
        ).all()
        
        gallery = db.query(AttractionGallery).filter(
            AttractionGallery.attraction_id == attraction.id
        ).all()
        
        result.append({
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
            "historical_significance": attraction.historical_significance,
            "timeline": [{
                "id": t.id,
                "year": t.year,
                "event_title": t.event_title,
                "event_description": t.event_description,
                "order": t.order
            } for t in timeline],
            "gallery": [{
                "id": g.id,
                "image_url": g.image_url,
                "caption": g.caption,
                "order": g.order
            } for g in gallery]
        })
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "attractions": result
    }


@router.post("/attractions", dependencies=[Depends(verify_admin_key)])
def create_attraction(data: dict, db: Session = Depends(get_db)):
    """Create a new attraction"""
    try:
        # Validate website URL length
        website = data.get("website")
        if website and len(website) > 255:
            raise HTTPException(
                status_code=400, 
                detail="Website URL is too long (max 255 characters). Please use a shorter URL."
            )
        
        attraction = Attraction(
            name=data.get("name"),
            description=data.get("description"),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            address=data.get("address"),
            rating=data.get("rating", 0.0),
            review_count=data.get("review_count", 0),
            image_url=data.get("image_url"),
            category=data.get("category"),
            phone=data.get("phone"),
            opening_hours=data.get("opening_hours"),
            entry_fee=data.get("entry_fee"),
            website=website,
            is_partner=data.get("is_partner", False),
            year_built=data.get("year_built") if data.get("year_built") else None,
            historical_period=data.get("historical_period"),
            duration=data.get("duration"),
            best_time=data.get("best_time"),
            historical_significance=data.get("historical_significance")
        )
        db.add(attraction)
        db.commit()
        db.refresh(attraction)
        return attraction
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/attractions/{attraction_id}" , dependencies=[Depends(verify_admin_key)])
def update_attraction(attraction_id: int, data: dict, db: Session = Depends(get_db)):
    """Update an attraction"""
    attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    for key, value in data.items():
        if hasattr(attraction, key):
            setattr(attraction, key, value)
    
    db.commit()
    db.refresh(attraction)
    return attraction


@router.delete("/attractions/{attraction_id}" , dependencies=[Depends(verify_admin_key)])
def delete_attraction(attraction_id: int, db: Session = Depends(get_db)):
    """Delete an attraction and all related data"""
    attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    db.query(AttractionTimeline).filter(AttractionTimeline.attraction_id == attraction_id).delete()
    db.query(AttractionGallery).filter(AttractionGallery.attraction_id == attraction_id).delete()
    db.query(AttractionReview).filter(AttractionReview.attraction_id == attraction_id).delete()
    db.delete(attraction)
    db.commit()
    return {"message": "Attraction deleted successfully"}


# ==================== TRAVEL AGENCIES ====================

@router.get("/travel-agencies" , dependencies=[Depends(verify_admin_key)])
def list_travel_agencies(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all travel agencies with tour counts"""

    total = db.query(TravelAgency).count()
    agencies = db.query(TravelAgency).offset(skip).limit(limit).all()

    result = []
    for agency in agencies:
        tour_count = db.query(Tour).filter(Tour.agency_id == agency.id).count()
        review_count = db.query(AgencyReview).filter(AgencyReview.agency_id == agency.id).count()

        result.append({
            "id": agency.id,
            "name": agency.name,
            "agency_type": agency.agency_type,
            "image_url": agency.image_url,
            "city": agency.city,
            "address": agency.address,
            "phone": agency.phone,
            "email": agency.email,
            "website": agency.website,
            "description": agency.description,
            "specializations": agency.specializations,
            "languages": agency.languages,
            "rating": float(agency.rating) if agency.rating else 0.0,
            "tours_count": tour_count,
            "review_count": review_count,
            "is_verified": agency.is_verified,
            "is_partner": agency.is_partner,
            "is_featured": agency.is_featured,
            "latitude": float(agency.latitude) if agency.latitude else None,
            "longitude": float(agency.longitude) if agency.longitude else None,
            "status": getattr(agency, "status", "approved"),
            "created_at": agency.created_at,
        })

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "agencies": result
    }


@router.post("/travel-agencies" , dependencies=[Depends(verify_admin_key)])
def create_travel_agency(data: dict, db: Session = Depends(get_db)):
    """Create a new travel agency (CEO creates directly as approved)"""

    try:
        agency = TravelAgency(
            name=data.get("name"),
            agency_type=data.get("agency_type"),
            image_url=data.get("image_url"),
            city=data.get("city"),
            address=data.get("address"),
            phone=data.get("phone"),
            email=data.get("email"),
            website=data.get("website"),
            description=data.get("description"),
            specializations=data.get("specializations", []),
            languages=data.get("languages"),
            is_verified=data.get("is_verified", False),
            is_partner=data.get("is_partner", False),
            is_featured=data.get("is_featured", False),
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
            rating=0.0,
            tours_count=0,
        )
        db.add(agency)
        db.commit()
        db.refresh(agency)
        return {"id": agency.id, "name": agency.name, "message": "Agency created successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/travel-agencies/{agency_id}" , dependencies=[Depends(verify_admin_key)])
def update_travel_agency(agency_id: int, data: dict, db: Session = Depends(get_db)):
    """Update a travel agency"""


    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    allowed_fields = [
        "name", "agency_type", "image_url", "city", "address", "phone",
        "email", "website", "description", "specializations", "languages",
        "is_verified", "is_partner", "is_featured", "latitude", "longitude",
    ]
    for key in allowed_fields:
        if key in data:
            setattr(agency, key, data[key])

    db.commit()
    db.refresh(agency)
    return {"id": agency.id, "name": agency.name, "message": "Agency updated successfully"}


@router.delete("/travel-agencies/{agency_id}" , dependencies=[Depends(verify_admin_key)])
def delete_travel_agency(agency_id: int, db: Session = Depends(get_db)):
    """Delete a travel agency and all related tours/reviews"""
    from models.travel_agency import TravelAgency, Tour, AgencyReview, TourItinerary, TourDestination

    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    # Delete cascade manually to be safe
    tours = db.query(Tour).filter(Tour.agency_id == agency_id).all()
    for tour in tours:
        itinerary_days = db.query(TourItinerary).filter(TourItinerary.tour_id == tour.id).all()
        
        db.query(TourItinerary).filter(TourItinerary.tour_id == tour.id).delete()
        db.query(TourDestination).filter(TourDestination.tour_id == tour.id).delete()
        db.delete(tour)

    db.query(AgencyReview).filter(AgencyReview.agency_id == agency_id).delete()
    db.delete(agency)
    db.commit()
    return {"message": "Agency and all related data deleted successfully"}


@router.delete("/travel-agencies/tours/{tour_id}", dependencies=[Depends(verify_admin_key)])
def delete_tour(tour_id: int, db: Session = Depends(get_db)):
    """Delete a single tour"""

    tour = db.query(Tour).filter(Tour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    agency_id = tour.agency_id
    itinerary_days = db.query(TourItinerary).filter(TourItinerary.tour_id == tour_id).all()
    db.query(TourItinerary).filter(TourItinerary.tour_id == tour_id).delete()
    db.query(TourDestination).filter(TourDestination.tour_id == tour_id).delete()
    db.delete(tour)

    # Update tours count
    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first() 
    if agency:
        agency.tours_count = db.query(Tour).filter(Tour.agency_id == agency_id).count()

    db.commit()
    return {"message": "Tour deleted successfully"}


# ==================== REVIEWS ====================

@router.get("/reviews", dependencies=[Depends(verify_admin_key)])
def list_all_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """List all reviews from all sources"""
    restaurant_reviews = db.query(Review).offset(skip).limit(limit).all()
    hotel_reviews = db.query(HotelReview).offset(skip).limit(limit).all()
    attraction_reviews = db.query(AttractionReview).offset(skip).limit(limit).all()
    
    all_reviews = []
    
    for review in restaurant_reviews:
        restaurant = db.query(Restaurant).filter(Restaurant.id == review.restaurant_id).first()
        all_reviews.append({
            "type": "restaurant",
            "id": review.id,
            "place_id": review.restaurant_id,
            "place_name": restaurant.name if restaurant else "Unknown",
            "reviewer_name": review.reviewer_name,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at
        })
    
    for review in hotel_reviews:
        hotel = db.query(Hotel).filter(Hotel.id == review.hotel_id).first()
        all_reviews.append({
            "type": "hotel",
            "id": review.id,
            "place_id": review.hotel_id,
            "place_name": hotel.name if hotel else "Unknown",
            "reviewer_name": review.reviewer_name,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at
        })
    
    for review in attraction_reviews:
        attraction = db.query(Attraction).filter(Attraction.id == review.attraction_id).first()
        all_reviews.append({
            "type": "attraction",
            "id": review.id,
            "place_id": review.attraction_id,
            "place_name": attraction.name if attraction else "Unknown",
            "reviewer_name": review.reviewer_name,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at
        })
    
    return all_reviews


@router.delete("/reviews/{review_type}/{review_id}", dependencies=[Depends(verify_admin_key)])
def delete_review(review_type: str, review_id: int, db: Session = Depends(get_db)):
    """Delete a review and recalculate ratings"""
    if review_type == "restaurant":
        review = db.query(Review).filter(Review.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        restaurant_id = review.restaurant_id
        db.delete(review)
        db.commit()
        
        # Recalculate rating
        avg_rating = db.query(func.avg(Review.rating)).filter(Review.restaurant_id == restaurant_id).scalar()
        restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
        if restaurant:
            restaurant.rating = round(avg_rating, 1) if avg_rating else 0.0
            db.commit()
    
    elif review_type == "hotel":
        review = db.query(HotelReview).filter(HotelReview.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        hotel_id = review.hotel_id
        db.delete(review)
        db.commit()
        
        # Recalculate rating
        avg_rating = db.query(func.avg(HotelReview.rating)).filter(HotelReview.hotel_id == hotel_id).scalar()
        review_count = db.query(HotelReview).filter(HotelReview.hotel_id == hotel_id).count()
        hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
        if hotel:
            hotel.rating = round(avg_rating, 1) if avg_rating else 0.0
            hotel.review_count = review_count
            db.commit()
    
    elif review_type == "attraction":
        review = db.query(AttractionReview).filter(AttractionReview.id == review_id).first()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        
        attraction_id = review.attraction_id
        db.delete(review)
        db.commit()
        
        # Recalculate rating
        avg_rating = db.query(func.avg(AttractionReview.rating)).filter(AttractionReview.attraction_id == attraction_id).scalar()
        review_count = db.query(AttractionReview).filter(AttractionReview.attraction_id == attraction_id).count()
        attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
        if attraction:
            attraction.rating = round(avg_rating, 1) if avg_rating else 0.0
            attraction.review_count = review_count
            db.commit()
    
    else:
        raise HTTPException(status_code=400, detail="Invalid review type")
    
    return {"message": "Review deleted successfully"}


# ==================== LIKES ANALYTICS ====================

@router.get("/likes", dependencies=[Depends(verify_admin_key)])
def list_all_likes(db: Session = Depends(get_db)):
    """List all likes sorted by popularity using raw SQL"""
    # Use raw SQL to avoid ORM issues
    result = db.execute(text("""
        SELECT id, page_id, like_count, created_at, updated_at
        FROM likes
        ORDER BY like_count DESC
    """))
    
    likes_data = []
    for row in result:
        page_id = row.page_id
        place_name = "Unknown"
        place_type = "unknown"
        place_id = None
        
        # Parse page_id (format: "restaurant_1", "hotel_2", etc.)
        if page_id:
            parts = page_id.split('_')
            if len(parts) >= 2:
                place_type = parts[0]
                try:
                    place_id = int(parts[1])
                    
                    # Get the actual place name
                    if place_type == "restaurant":
                        place = db.query(Restaurant).filter(Restaurant.id == place_id).first()
                        place_name = place.name if place else f"Restaurant #{place_id}"
                    elif place_type == "hotel":
                        place = db.query(Hotel).filter(Hotel.id == place_id).first()
                        place_name = place.name if place else f"Hotel #{place_id}"
                    elif place_type == "attraction":
                        place = db.query(Attraction).filter(Attraction.id == place_id).first()
                        place_name = place.name if place else f"Attraction #{place_id}"
                except (ValueError, IndexError):
                    pass
        
        likes_data.append({
            "id": row.id,
            "page_id": page_id,
            "place_id": place_id,
            "place_type": place_type,
            "place_name": place_name,
            "like_count": row.like_count,
            "created_at": row.created_at,
            "updated_at": row.updated_at
        })
    
    return likes_data