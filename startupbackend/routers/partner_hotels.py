from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from database import get_db
from models.hotel import Hotel, HotelRoom
from routers.partner_auth import require_hotel_owner

router = APIRouter(prefix="/hotels", tags=["partner-hotels"])

# ==================== SCHEMAS ====================

class HotelInfoUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    opening_hours: Optional[str] = None
    image_url: Optional[str] = None
    type: Optional[str] = None
    offer: Optional[str] = None

class HotelRoomCreate(BaseModel):
    hotel_id: int
    room_type: str
    price: float
    capacity: int
    description: Optional[str] = None
    image_url: Optional[str] = None
    available: bool = True


# ==================== GET PARTNER HOTEL ====================

@router.get("/{hotel_id}/partner")
async def get_partner_hotel(
    hotel_id: int,
    token: dict = Depends(require_hotel_owner),
    db: Session = Depends(get_db)
):
    """Get the partner's own hotel with ALL rooms (including pending/rejected)"""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    rooms = db.query(HotelRoom).filter(HotelRoom.hotel_id == hotel_id).all()

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
                "status": getattr(r, 'status', 'approved'),
                "rejection_reason": getattr(r, 'rejection_reason', None)
            }
            for r in rooms
        ]
    }


# ==================== UPDATE HOTEL INFO ====================

@router.put("/{hotel_id}/info")
async def update_hotel_info(
    hotel_id: int,
    data: HotelInfoUpdate,
    token: dict = Depends(require_hotel_owner),
    db: Session = Depends(get_db)
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    for key, value in data.dict(exclude_unset=True).items():
        if value is not None:
            setattr(hotel, key, value)

    hotel.status = "pending"
    db.commit()
    db.refresh(hotel)

    return {"success": True, "message": "Hotel updated. Waiting for admin approval.", "status": "pending"}


# ==================== ADD ROOM ====================

@router.post("/{hotel_id}/rooms")
async def add_hotel_room(
    hotel_id: int,
    room_data: HotelRoomCreate,
    token: dict = Depends(require_hotel_owner),
    db: Session = Depends(get_db)
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    room = HotelRoom(
        hotel_id=hotel_id,
        room_type=room_data.room_type,
        price=room_data.price,
        capacity=room_data.capacity,
        description=room_data.description,
        image_url=room_data.image_url,
        available=room_data.available,
        status="pending"
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    return {
        "success": True,
        "message": "Room added. Waiting for admin approval.",
        "status": "pending",
        "room": {
            "id": room.id, "room_type": room.room_type,
            "price": float(room.price), "capacity": room.capacity,
            "description": room.description, "image_url": room.image_url,
            "available": room.available, "status": "pending"
        }
    }


# ==================== UPDATE ROOM ====================

@router.put("/{hotel_id}/rooms/{room_id}")
async def update_hotel_room(
    hotel_id: int,
    room_id: int,
    room_data: dict,
    token: dict = Depends(require_hotel_owner),
    db: Session = Depends(get_db)
):
    room = db.query(HotelRoom).filter(
        HotelRoom.id == room_id, HotelRoom.hotel_id == hotel_id
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    for key, value in room_data.items():
        if hasattr(room, key) and key != 'status':
            setattr(room, key, value)

    room.status = "pending"
    db.commit()
    db.refresh(room)

    return {
        "success": True,
        "message": "Room updated. Waiting for admin approval.",
        "status": "pending",
        "room": {
            "id": room.id, "room_type": room.room_type,
            "price": float(room.price), "capacity": room.capacity,
            "description": room.description, "image_url": room.image_url,
            "available": room.available, "status": "pending"
        }
    }


# ==================== DELETE ROOM ====================

@router.delete("/{hotel_id}/rooms/{room_id}")
async def delete_hotel_room(
    hotel_id: int,
    room_id: int,
    token: dict = Depends(require_hotel_owner),
    db: Session = Depends(get_db)
):
    room = db.query(HotelRoom).filter(
        HotelRoom.id == room_id, HotelRoom.hotel_id == hotel_id
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    db.delete(room)
    db.commit()
    return {"success": True, "message": "Room deleted successfully"}