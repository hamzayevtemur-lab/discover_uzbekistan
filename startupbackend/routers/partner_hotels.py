# routers/partner_hotel_routes.py
# UPDATED VERSION - Adds status to rooms and hotel updates

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.hotel import Hotel, HotelRoom

router = APIRouter(prefix="/hotels", tags=["partner-hotels"])

# ==================== SCHEMAS ====================

class HotelRoomCreate(BaseModel):
    hotel_id: int
    room_type: str
    price: float
    capacity: int
    description: Optional[str] = None
    image_url: Optional[str] = None
    available: bool = True

# ==================== GET HOTEL WITH ROOMS ====================

@router.get("")
async def get_hotels_with_rooms(db: Session = Depends(get_db)):
    """Get all hotels with their rooms (including pending for partner)"""
    hotels = db.query(Hotel).all()
    
    result = []
    for hotel in hotels:
        # Get ALL rooms (partner needs to see pending/approved/rejected)
        rooms = db.query(HotelRoom).filter(
            HotelRoom.hotel_id == hotel.id
        ).all()
        
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
            "status": getattr(hotel, 'status', 'approved'),
            "rooms": [
                {
                    "id": r.id,
                    "room_type": r.room_type,
                    "price": float(r.price),
                    "capacity": r.capacity,
                    "description": r.description,
                    "image_url": r.image_url,
                    "available": r.available,
                    "status": getattr(r, 'status', 'approved'),  # Show status
                    "rejection_reason": getattr(r, 'rejection_reason', None)
                }
                for r in rooms
            ]
        })
    
    return result

# ==================== ADD ROOM (GOES TO PENDING) ====================

@router.post("/{hotel_id}/rooms")
async def add_hotel_room(
    hotel_id: int,
    room_data: HotelRoomCreate,
    db: Session = Depends(get_db)
):
    """Add a new room to hotel - GOES TO PENDING STATUS"""
    
    # Check hotel exists
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    # Create room with PENDING status
    room = HotelRoom(
        hotel_id=hotel_id,
        room_type=room_data.room_type,
        price=room_data.price,
        capacity=room_data.capacity,
        description=room_data.description,
        image_url=room_data.image_url,
        available=room_data.available,
        status="pending"  # 🔥 IMPORTANT: New rooms need approval!
    )
    
    db.add(room)
    db.commit()
    db.refresh(room)
    
    return {
        "success": True,
        "message": "Room added successfully. Waiting for admin approval.",
        "status": "pending",
        "room": {
            "id": room.id,
            "room_type": room.room_type,
            "price": float(room.price),
            "capacity": room.capacity,
            "description": room.description,
            "image_url": room.image_url,
            "available": room.available,
            "status": "pending"
        }
    }

# ==================== DELETE ROOM ====================

@router.delete("/{hotel_id}/rooms/{room_id}")
async def delete_hotel_room(
    hotel_id: int,
    room_id: int,
    db: Session = Depends(get_db)
):
    """Delete a hotel room"""
    
    room = db.query(HotelRoom).filter(
        HotelRoom.id == room_id,
        HotelRoom.hotel_id == hotel_id
    ).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    db.delete(room)
    db.commit()
    
    return {
        "success": True,
        "message": "Room deleted successfully"
    }

# ==================== UPDATE ROOM ====================

@router.put("/{hotel_id}/rooms/{room_id}")
async def update_hotel_room(
    hotel_id: int,
    room_id: int,
    room_data: dict,
    db: Session = Depends(get_db)
):
    """Update a hotel room - GOES TO PENDING"""
    
    room = db.query(HotelRoom).filter(
        HotelRoom.id == room_id,
        HotelRoom.hotel_id == hotel_id
    ).first()
    
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Update fields
    for key, value in room_data.items():
        if hasattr(room, key) and key != 'status':
            setattr(room, key, value)
    
    # Set to pending for approval
    room.status = "pending"
    
    db.commit()
    db.refresh(room)
    
    return {
        "success": True,
        "message": "Room updated. Waiting for admin approval.",
        "status": "pending",
        "room": {
            "id": room.id,
            "room_type": room.room_type,
            "price": float(room.price),
            "capacity": room.capacity,
            "description": room.description,
            "image_url": room.image_url,
            "available": room.available,
            "status": "pending"
        }
    }