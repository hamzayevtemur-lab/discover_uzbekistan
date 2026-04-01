from sqlalchemy import Boolean, Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, expression
from database import Base


class Hotel(Base):
    __tablename__ = "hotels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255))
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    image_url = Column(String(255))
    type = Column(String(100))  # e.g., "5 Star", "Boutique", "Budget"
    phone = Column(String(50))
    opening_hours = Column(String(100))  # e.g., "Check-in 14:00"
    is_partner = Column(
        Boolean,
        nullable=False,
        server_default=expression.false()
    )
    website = Column(String(255))
    offer = Column(String(255))  # e.g., "15% off for 3+ nights"
    
    partner_email = Column(String(255), unique=True, nullable=True)
    partner_password = Column(String(255), nullable=True)
    
    status = Column(String(20), default="pending")
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)

    # Relationships
    rooms = relationship("HotelRoom", back_populates="hotel")
    reviews = relationship("HotelReview", back_populates="hotel")


class HotelRoom(Base):
    __tablename__ = "hotel_rooms"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    room_type = Column(String(100), nullable=False)  # e.g., "Single", "Double", "Suite"
    price = Column(Float, nullable=False)
    capacity = Column(Integer)  # max people
    image_url = Column(String(255))
    description = Column(Text)
    available = Column(Boolean, default=True)
    
    status = Column(String(20), default="pending")
    rejection_reason = Column(Text, nullable=True)

    hotel = relationship("Hotel", back_populates="rooms")


class HotelReview(Base):
    __tablename__ = "hotel_reviews"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    reviewer_name = Column(String(100), nullable=False)
    rating = Column(Integer, nullable=False)  # 1–5
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    hotel = relationship("Hotel", back_populates="reviews")
    
