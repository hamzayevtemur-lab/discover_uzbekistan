from sqlalchemy import Column, Integer, String, Text, DECIMAL, Boolean, TIMESTAMP, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime
from typing import Optional, List

class TravelAgency(Base):
    __tablename__ = "travel_agencies"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    agency_type = Column(String(100), default="Tour Operator")
    logo_url = Column(String(500))
    image_url = Column(Text)  # Agency photo
    city = Column(String(100))
    address = Column(String(500))
    phone = Column(String(50))
    email = Column(String(100))
    website = Column(String(200))
    description = Column(Text)
    specializations = Column(JSON)
    languages = Column(String(200), default="English, Russian, Uzbek")
    rating = Column(DECIMAL(3, 2), default=0.0)
    tours_count = Column(Integer, default=0)
    is_verified = Column(Boolean, default=False)
    is_partner = Column(Boolean, default=False)
    is_featured = Column(Boolean, default=False)
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    # Approval workflow
    status = Column(String(20), default="pending")
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    approved_by = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    updated_at = Column(TIMESTAMP, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    partner_password = Column(String(128), nullable=True)  # For partner login — store hashed password in production
    
    tours = relationship("Tour", back_populates="agency", cascade="all, delete-orphan")
    reviews = relationship("AgencyReview", back_populates="agency", cascade="all, delete-orphan")


class AgencyReview(Base):
    __tablename__ = "agency_reviews"
    
    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("travel_agencies.id"), nullable=False)
    tourist_name = Column(String(100))
    rating = Column(Integer)
    comment = Column(Text)
    tour_taken = Column(String(200))
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    agency = relationship("TravelAgency", back_populates="reviews")

    
class Tour(Base):
    __tablename__ = "tours"
    
    id = Column(Integer, primary_key=True, index=True)
    agency_id = Column(Integer, ForeignKey("travel_agencies.id"), nullable=False)
    tour_name = Column(String(200), nullable=False)
    tour_type = Column(String(100))
    description = Column(Text)
    duration_days = Column(Integer)
    price = Column(DECIMAL(10, 2))
    currency = Column(String(10), default="USD")
    max_group_size = Column(Integer)
    includes = Column(Text)  # Legacy
    itinerary = Column(JSON)  # Legacy
    image_url = Column(Text)  # Text — supports long URLs and base64
    is_active = Column(Boolean, default=True)
    highlights = Column(JSON)
    included_services = Column(JSON)
    excluded_services = Column(JSON)
    difficulty_level = Column(String(50))
    best_season = Column(String(100))
    # Approval workflow — every partner create/edit starts as pending
    status = Column(String(20), default="pending")
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(TIMESTAMP, nullable=True)
    approved_by = Column(String(100), nullable=True)
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    agency = relationship("TravelAgency", back_populates="tours")
    itinerary_days = relationship("TourItinerary", back_populates="tour", cascade="all, delete-orphan")
    destinations = relationship("TourDestination", back_populates="tour", cascade="all, delete-orphan")


class TourItinerary(Base):
    __tablename__ = "tour_itinerary"
    
    id = Column(Integer, primary_key=True, index=True)
    tour_id = Column(Integer, ForeignKey("tours.id"), nullable=False)
    day_number = Column(Integer, nullable=False)
    day_title = Column(String(200), nullable=False)
    activities = Column(Text, nullable=False)
    meals = Column(String(200))
    accommodation = Column(String(300))
    destinations = Column(JSON)
    coordinates = Column(JSON)
    image_url = Column(Text)  # Single photo for this day — Text for base64 support
    images = Column(JSON)  # images is a new field to support multiple photos per day; if empty, fallback to image_url
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    tour = relationship("Tour", back_populates="itinerary_days")


class TourDestination(Base):
    __tablename__ = "tour_destinations"
    
    id = Column(Integer, primary_key=True, index=True)
    tour_id = Column(Integer, ForeignKey("tours.id"), nullable=False)
    destination_name = Column(String(200), nullable=False)
    latitude = Column(DECIMAL(10, 8))
    longitude = Column(DECIMAL(11, 8))
    visit_order = Column(Integer)
    nights_stay = Column(Integer, default=0)
    description = Column(Text)
    image_url = Column(Text)  # Photo for this destination — Text for base64 support
    created_at = Column(TIMESTAMP, default=datetime.utcnow)
    
    tour = relationship("Tour", back_populates="destinations")