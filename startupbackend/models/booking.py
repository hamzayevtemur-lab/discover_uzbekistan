from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


class HotelBooking(Base):
    __tablename__ = "hotel_bookings"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    room_type = Column(String(100), nullable=True)
    guest_name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=False)
    check_in_date = Column(String(50), nullable=False)
    arrival_time = Column(String(50), nullable=True)
    stay_days = Column(Integer, default=1)
    guests_count = Column(Integer, default=1)
    special_requests = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, confirmed, rejected, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    hotel = relationship("Hotel", backref="bookings")


class RestaurantOrder(Base):
    __tablename__ = "restaurant_orders"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    customer_name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=False)
    reservation_date = Column(String(50), nullable=False)
    reservation_time = Column(String(50), nullable=True)
    guests_count = Column(Integer, default=2)
    preorder_notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, confirmed, rejected, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    restaurant = relationship("Restaurant", backref="orders")


class AgencyBooking(Base):
    __tablename__ = "agency_bookings"

    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("travel_agencies.id"), nullable=False)
    tour_id = Column(Integer, ForeignKey("tours.id"), nullable=True)
    tour_name = Column(String(200), nullable=True)
    tourist_name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=False)
    trip_date = Column(String(50), nullable=False)
    travelers_count = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, confirmed, rejected, completed
    created_at = Column(DateTime, default=datetime.utcnow)

    agency = relationship("TravelAgency", backref="bookings")
    tour = relationship("Tour", backref="bookings")


class GuideBooking(Base):
    __tablename__ = "guide_bookings"

    id = Column(Integer, primary_key=True, index=True)
    guide_id = Column(Integer, ForeignKey("guides.id"), nullable=False)
    tourist_name = Column(String(150), nullable=False)
    email = Column(String(150), nullable=False)
    phone = Column(String(50), nullable=False)
    tour_date = Column(String(50), nullable=False)
    duration_days = Column(Integer, default=1)
    travelers_count = Column(Integer, default=1)
    notes = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, confirmed, rejected, completed
    created_at = Column(DateTime, default=datetime.utcnow)
