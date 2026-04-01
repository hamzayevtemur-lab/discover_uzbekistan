# routers/admin_approval_routes.py
# COMPLETE VERSION with Hotels and Hotel Rooms

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from database import get_db
from models import (
    Restaurant, RestaurantMenu, Review,
    Hotel, HotelRoom, HotelReview,
    Attraction, AttractionTimeline, AttractionReview, AttractionGallery,
    Like, TravelAgency, Tour, AgencyReview, TourItinerary, TourDestination
)

router = APIRouter(prefix="/api/admin-approval", tags=["admin-approval"])

# ==================== SCHEMAS ====================

class ApprovalAction(BaseModel):
    status: str  # "approved" or "rejected"
    rejection_reason: Optional[str] = None
    admin_email: str  # Who approved/rejected

# ==================== RESTAURANTS ====================

@router.get("/restaurants/pending")
async def get_pending_restaurants(db: Session = Depends(get_db)):
    """Get all pending restaurant submissions"""
    restaurants = db.query(Restaurant).filter(
        Restaurant.status == "pending"
    ).all()
    
    return [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "cuisine_type": r.cuisine_type,
            "phone": r.phone,
            "address": r.address,
            "latitude": r.latitude,
            "longitude": r.longitude,
            "image_url": r.image_url,
            "website": r.website,
            "opening_hours": r.opening_hours,
            "is_partner": r.is_partner,
            "status": r.status,
            "rejection_reason": getattr(r, 'rejection_reason', None)
        }
        for r in restaurants
    ]

@router.post("/restaurant/{restaurant_id}/approve")
async def approve_restaurant(
    restaurant_id: int,
    action: ApprovalAction,
    db: Session = Depends(get_db)
):
    """Approve or reject a restaurant submission"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    restaurant.status = action.status
    
    if action.status == "approved":
        restaurant.approved_at = datetime.now()
        restaurant.approved_by = action.admin_email
        restaurant.rejection_reason = None
    else:
        restaurant.rejection_reason = action.rejection_reason
        restaurant.approved_at = None
        restaurant.approved_by = None
    
    db.commit()
    db.refresh(restaurant)
    
    return {
        "success": True,
        "message": f"Restaurant {action.status}",
        "restaurant_id": restaurant_id,
        "status": restaurant.status
    }

# ==================== MENU ITEMS ====================

@router.get("/menu-items/pending")
async def get_pending_menu_items(db: Session = Depends(get_db)):
    """Get all pending menu item submissions"""
    menu_items = db.query(RestaurantMenu).filter(
        RestaurantMenu.status == "pending"
    ).all()
    
    return [
        {
            "id": item.id,
            "restaurant_id": item.restaurant_id,
            "restaurant_name": item.restaurant.name if item.restaurant else "Unknown",
            "item_name": item.item_name,
            "price": float(item.price),
            "category": item.category,
            "image_url": item.image_url,
            "status": item.status,
            "rejection_reason": getattr(item, 'rejection_reason', None)
        }
        for item in menu_items
    ]

@router.post("/menu-item/{item_id}/approve")
async def approve_menu_item(
    item_id: int,
    action: ApprovalAction,
    db: Session = Depends(get_db)
):
    """Approve or reject a menu item submission"""
    menu_item = db.query(RestaurantMenu).filter(RestaurantMenu.id == item_id).first()
    
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    menu_item.status = action.status
    
    if action.status == "rejected":
        menu_item.rejection_reason = action.rejection_reason
    else:
        menu_item.rejection_reason = None
    
    db.commit()
    db.refresh(menu_item)
    
    return {
        "success": True,
        "message": f"Menu item {action.status}",
        "item_id": item_id,
        "status": menu_item.status
    }

# ==================== HOTELS ====================

@router.get("/hotels/pending")
async def get_pending_hotels(db: Session = Depends(get_db)):
    """Get all pending hotel submissions"""
    hotels = db.query(Hotel).filter(
        Hotel.status == "pending"
    ).all()
    
    return [
        {
            "id": h.id,
            "name": h.name,
            "description": h.description,
            "type": h.type,
            "phone": h.phone,
            "address": h.address,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "image_url": h.image_url,
            "website": h.website,
            "offer": h.offer,
            "is_partner": h.is_partner,
            "status": h.status,
            "rejection_reason": getattr(h, 'rejection_reason', None)
        }
        for h in hotels
    ]

@router.post("/hotel/{hotel_id}/approve")
async def approve_hotel(
    hotel_id: int,
    action: ApprovalAction,
    db: Session = Depends(get_db)
):
    """Approve or reject a hotel submission"""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    hotel.status = action.status
    
    if action.status == "approved":
        hotel.approved_at = datetime.now()
        hotel.approved_by = action.admin_email
        hotel.rejection_reason = None
    else:
        hotel.rejection_reason = action.rejection_reason
        hotel.approved_at = None
        hotel.approved_by = None
    
    db.commit()
    db.refresh(hotel)
    
    return {
        "success": True,
        "message": f"Hotel {action.status}",
        "hotel_id": hotel_id,
        "status": hotel.status
    }

# ==================== HOTEL ROOMS ====================

@router.get("/hotel-rooms/pending")
async def get_pending_hotel_rooms(db: Session = Depends(get_db)):
    """Get all pending hotel room submissions"""
    rooms = db.query(HotelRoom).filter(
        HotelRoom.status == "pending"
    ).all()
    
    return [
        {
            "id": room.id,
            "hotel_id": room.hotel_id,
            "hotel_name": room.hotel.name if room.hotel else "Unknown",
            "room_type": room.room_type,
            "price": float(room.price),
            "capacity": room.capacity,
            "description": room.description,
            "image_url": room.image_url,
            "available": room.available,
            "status": room.status,
            "rejection_reason": getattr(room, 'rejection_reason', None)
        }
        for room in rooms
    ]

@router.post("/hotel-room/{room_id}/approve")
async def approve_hotel_room(
    room_id: int,
    action: ApprovalAction,
    db: Session = Depends(get_db)
):
    """Approve or reject a hotel room"""
    room = db.query(HotelRoom).filter(HotelRoom.id == room_id).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Hotel room not found")
    
    room.status = action.status
    
    if action.status == 'rejected':
        room.rejection_reason = action.rejection_reason
    else:
        room.rejection_reason = None
    
    db.commit()
    db.refresh(room)
    
    return {
        "success": True,
        "message": f"Hotel room {action.status}",
        "room_id": room_id,
        "status": room.status
    }
    

# ==================== TOURS ====================

@router.get("/tours/pending")
async def get_pending_tours(db: Session = Depends(get_db)):
    """Get all pending tour submissions — shown in CEO dashboard approval queue"""
    from models.travel_agency import Tour, TravelAgency

    tours = db.query(Tour).filter(Tour.status == "pending").all()

    result = []
    for t in tours:
        agency = db.query(TravelAgency).filter(TravelAgency.id == t.agency_id).first()
        result.append({
            "id": t.id,
            "agency_id": t.agency_id,
            "agency_name": agency.name if agency else "Unknown Agency",
            "tour_name": t.tour_name,
            "tour_type": t.tour_type,
            "description": t.description,
            "duration_days": t.duration_days,
            "price": float(t.price) if t.price else 0,
            "currency": t.currency or "USD",
            "max_group_size": t.max_group_size,
            "image_url": t.image_url,
            "difficulty_level": t.difficulty_level,
            "best_season": t.best_season,
            "status": t.status,
            "rejection_reason": getattr(t, "rejection_reason", None),
            "created_at": t.created_at,
        })
    return result


@router.post("/tour/{tour_id}/approve")
async def approve_tour(
    tour_id: int,
    action: ApprovalAction,
    db: Session = Depends(get_db)
):
    """CEO approves or rejects a tour submission"""
    from models.travel_agency import Tour

    tour = db.query(Tour).filter(Tour.id == tour_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found")

    tour.status = action.status

    if action.status == "approved":
        tour.rejection_reason = None
        # Optionally set approved_by if column exists
        if hasattr(tour, 'approved_at'):
            tour.approved_at = datetime.now()
        if hasattr(tour, 'approved_by'):
            tour.approved_by = action.admin_email
    else:
        tour.rejection_reason = action.rejection_reason

    db.commit()
    db.refresh(tour)

    return {
        "success": True,
        "message": f"Tour {action.status}",
        "tour_id": tour_id,
        "status": tour.status
    }


# ==================== UPDATED STATS ====================


@router.get("/stats/pending-all")
async def get_all_pending_stats(db: Session = Depends(get_db)):
    """Get count of ALL items waiting for approval including tours"""
    from models.travel_agency import Tour, TravelAgency

    pending_restaurants = db.query(Restaurant).filter(Restaurant.status == "pending").count()
    pending_menu_items  = db.query(RestaurantMenu).filter(RestaurantMenu.status == "pending").count()
    pending_hotels      = db.query(Hotel).filter(Hotel.status == "pending").count()
    pending_hotel_rooms = db.query(HotelRoom).filter(HotelRoom.status == "pending").count()
    pending_tours       = db.query(Tour).filter(Tour.status == "pending").count()
    pending_agencies    = db.query(TravelAgency).filter(TravelAgency.status == "pending").count()

    total = (pending_restaurants + pending_menu_items + pending_hotels +
             pending_hotel_rooms + pending_tours + pending_agencies)

    return {
        "pending_restaurants": pending_restaurants,
        "pending_menu_items": pending_menu_items,
        "pending_hotels": pending_hotels,
        "pending_hotel_rooms": pending_hotel_rooms,
        "pending_tours": pending_tours,
        "pending_agencies": pending_agencies,
        "total_pending": total,
    }