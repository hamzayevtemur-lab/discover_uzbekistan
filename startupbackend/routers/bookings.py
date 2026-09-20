from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

from database import get_db
from models.hotel import Hotel
from models.restaurant import Restaurant
from models.travel_agency import TravelAgency, Tour
from models.booking import HotelBooking, RestaurantOrder, AgencyBooking, GuideBooking
from models.guide import Guide
from routers.partner_auth import get_partner_token

router = APIRouter(tags=["bookings"])


# ───────────────────────────────────────────────────────────────
# SCHEMAS
# ───────────────────────────────────────────────────────────────

class HotelBookingCreate(BaseModel):
    guest_name: str
    email: str
    phone: str
    check_in_date: str
    arrival_time: Optional[str] = None
    stay_days: int = 1
    guests_count: int = 1
    room_type: Optional[str] = None
    special_requests: Optional[str] = None


class RestaurantOrderCreate(BaseModel):
    customer_name: str
    email: str
    phone: str
    reservation_date: str
    reservation_time: Optional[str] = None
    guests_count: int = 2
    preorder_notes: Optional[str] = None


class AgencyBookingCreate(BaseModel):
    tourist_name: str
    email: str
    phone: str
    trip_date: str
    travelers_count: int = 1
    tour_id: Optional[int] = None
    tour_name: Optional[str] = None
    notes: Optional[str] = None


class GuideBookingCreate(BaseModel):
    tourist_name: str
    email: str
    phone: str
    tour_date: str
    duration_days: int = 1
    travelers_count: int = 1
    notes: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str  # pending, confirmed, rejected, completed


# ───────────────────────────────────────────────────────────────
# PUBLIC TOURIST ENDPOINTS
# ───────────────────────────────────────────────────────────────

@router.post("/api/hotels/{hotel_id}/book")
def book_hotel_room(
    hotel_id: int,
    data: HotelBookingCreate,
    db: Session = Depends(get_db)
):
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    booking = HotelBooking(
        hotel_id=hotel_id,
        room_type=data.room_type,
        guest_name=data.guest_name,
        email=data.email,
        phone=data.phone,
        check_in_date=data.check_in_date,
        arrival_time=data.arrival_time,
        stay_days=data.stay_days,
        guests_count=data.guests_count,
        special_requests=data.special_requests,
        status="pending"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return {
        "message": "Hotel reservation requested successfully. The hotel partner will contact you directly.",
        "booking_id": booking.id
    }


@router.post("/api/restaurants/{restaurant_id}/order")
def create_restaurant_order(
    restaurant_id: int,
    data: RestaurantOrderCreate,
    db: Session = Depends(get_db)
):
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    order = RestaurantOrder(
        restaurant_id=restaurant_id,
        customer_name=data.customer_name,
        email=data.email,
        phone=data.phone,
        reservation_date=data.reservation_date,
        reservation_time=data.reservation_time,
        guests_count=data.guests_count,
        preorder_notes=data.preorder_notes,
        status="pending"
    )
    db.add(order)
    db.commit()
    db.refresh(order)

    return {
        "message": "Restaurant reservation/order submitted successfully. Restaurant staff will contact you to confirm.",
        "order_id": order.id
    }


@router.post("/api/travel-agencies/{agency_id}/book")
def book_agency_tour(
    agency_id: int,
    data: AgencyBookingCreate,
    db: Session = Depends(get_db)
):
    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Travel agency not found")

    booking = AgencyBooking(
        agency_id=agency_id,
        tour_id=data.tour_id,
        tour_name=data.tour_name,
        tourist_name=data.tourist_name,
        email=data.email,
        phone=data.phone,
        trip_date=data.trip_date,
        travelers_count=data.travelers_count,
        notes=data.notes,
        status="pending"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return {
        "message": "Trip booking request submitted successfully. The travel agency will contact you.",
        "booking_id": booking.id
    }


@router.post("/api/guides/{guide_id}/book")
def book_guide(
    guide_id: int,
    data: GuideBookingCreate,
    db: Session = Depends(get_db)
):
    guide = db.query(Guide).filter(Guide.id == guide_id).first()
    if not guide:
        raise HTTPException(status_code=404, detail="Guide not found")

    booking = GuideBooking(
        guide_id=guide_id,
        tourist_name=data.tourist_name,
        email=data.email,
        phone=data.phone,
        tour_date=data.tour_date,
        duration_days=data.duration_days,
        travelers_count=data.travelers_count,
        notes=data.notes,
        status="pending"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    return {
        "message": "Guide booking request submitted successfully. The guide will contact you.",
        "booking_id": booking.id
    }


# ───────────────────────────────────────────────────────────────
# PARTNER ADMIN ENDPOINTS
# ───────────────────────────────────────────────────────────────

# --- HOTEL PARTNER BOOKINGS ---

@router.get("/api/partner/hotels/{hotel_id}/bookings")
def get_hotel_partner_bookings(
    hotel_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    bookings = db.query(HotelBooking).filter(HotelBooking.hotel_id == hotel_id).order_by(HotelBooking.created_at.desc()).all()
    return [
        {
            "id": b.id,
            "hotel_id": b.hotel_id,
            "room_type": b.room_type,
            "guest_name": b.guest_name,
            "email": b.email,
            "phone": b.phone,
            "check_in_date": b.check_in_date,
            "arrival_time": b.arrival_time,
            "stay_days": b.stay_days,
            "guests_count": b.guests_count,
            "special_requests": b.special_requests,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None
        }
        for b in bookings
    ]


@router.put("/api/partner/hotels/{hotel_id}/bookings/{booking_id}/status")
def update_hotel_booking_status(
    hotel_id: int,
    booking_id: int,
    body: StatusUpdate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    booking = db.query(HotelBooking).filter(
        HotelBooking.id == booking_id,
        HotelBooking.hotel_id == hotel_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if body.status not in ["pending", "confirmed", "rejected", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    booking.status = body.status
    db.commit()
    return {"message": "Booking status updated", "status": booking.status}


# --- RESTAURANT PARTNER ORDERS ---

@router.get("/api/partner/restaurants/{restaurant_id}/orders")
def get_restaurant_partner_orders(
    restaurant_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    orders = db.query(RestaurantOrder).filter(RestaurantOrder.restaurant_id == restaurant_id).order_by(RestaurantOrder.created_at.desc()).all()
    return [
        {
            "id": o.id,
            "restaurant_id": o.restaurant_id,
            "customer_name": o.customer_name,
            "email": o.email,
            "phone": o.phone,
            "reservation_date": o.reservation_date,
            "reservation_time": o.reservation_time,
            "guests_count": o.guests_count,
            "preorder_notes": o.preorder_notes,
            "status": o.status,
            "created_at": o.created_at.isoformat() if o.created_at else None
        }
        for o in orders
    ]


@router.put("/api/partner/restaurants/{restaurant_id}/orders/{order_id}/status")
def update_restaurant_order_status(
    restaurant_id: int,
    order_id: int,
    body: StatusUpdate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    order = db.query(RestaurantOrder).filter(
        RestaurantOrder.id == order_id,
        RestaurantOrder.restaurant_id == restaurant_id
    ).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if body.status not in ["pending", "confirmed", "rejected", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    order.status = body.status
    db.commit()
    return {"message": "Order status updated", "status": order.status}


# --- TRAVEL AGENCY PARTNER BOOKINGS ---

@router.get("/api/partner/agencies/{agency_id}/bookings")
def get_agency_partner_bookings(
    agency_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    bookings = db.query(AgencyBooking).filter(AgencyBooking.agency_id == agency_id).order_by(AgencyBooking.created_at.desc()).all()
    return [
        {
            "id": b.id,
            "agency_id": b.agency_id,
            "tour_id": b.tour_id,
            "tour_name": b.tour_name,
            "tourist_name": b.tourist_name,
            "email": b.email,
            "phone": b.phone,
            "trip_date": b.trip_date,
            "travelers_count": b.travelers_count,
            "notes": b.notes,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None
        }
        for b in bookings
    ]


@router.put("/api/partner/agencies/{agency_id}/bookings/{booking_id}/status")
def update_agency_booking_status(
    agency_id: int,
    booking_id: int,
    body: StatusUpdate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    booking = db.query(AgencyBooking).filter(
        AgencyBooking.id == booking_id,
        AgencyBooking.agency_id == agency_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if body.status not in ["pending", "confirmed", "rejected", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    booking.status = body.status
    db.commit()
    return {"message": "Booking status updated", "status": booking.status}


# --- GUIDE PARTNER BOOKINGS ---

@router.get("/api/partner/guides/{guide_id}/bookings")
def get_guide_partner_bookings(
    guide_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    bookings = db.query(GuideBooking).filter(GuideBooking.guide_id == guide_id).order_by(GuideBooking.created_at.desc()).all()
    return [
        {
            "id": b.id,
            "guide_id": b.guide_id,
            "tourist_name": b.tourist_name,
            "email": b.email,
            "phone": b.phone,
            "tour_date": b.tour_date,
            "duration_days": b.duration_days,
            "travelers_count": b.travelers_count,
            "notes": b.notes,
            "status": b.status,
            "created_at": b.created_at.isoformat() if b.created_at else None
        }
        for b in bookings
    ]


@router.put("/api/partner/guides/{guide_id}/bookings/{booking_id}/status")
def update_guide_booking_status(
    guide_id: int,
    booking_id: int,
    body: StatusUpdate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    booking = db.query(GuideBooking).filter(
        GuideBooking.id == booking_id,
        GuideBooking.guide_id == guide_id
    ).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if body.status not in ["pending", "confirmed", "rejected", "completed"]:
        raise HTTPException(status_code=400, detail="Invalid status value")

    booking.status = body.status
    db.commit()
    return {"message": "Booking status updated", "status": booking.status}
