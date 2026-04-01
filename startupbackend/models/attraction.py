from sqlalchemy import Boolean, Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, expression
from database import Base


class Attraction(Base):
    __tablename__ = "attractions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255))
    rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)
    image_url = Column(String(255))
    category = Column(String(100))  # e.g., "UNESCO Site", "Museum", "Monument", "Mosque"
    phone = Column(String(50))  # Tourist info number
    opening_hours = Column(String(100))
    entry_fee = Column(String(100))  # e.g., "$5 for tourists, Free for locals"
    website = Column(String(255))
    is_partner = Column(Boolean, nullable=False, server_default=expression.false())
    
    # Historical information
    year_built = Column(String(50))  # e.g., "15th century" or "1420"
    historical_period = Column(String(100))  # e.g., "Timurid Era"
    duration = Column(String(100))
    best_time = Column(String(100))
    historical_significance = Column(Text)
    
    # Relationships
    timeline_events = relationship("AttractionTimeline", back_populates="attraction")
    reviews = relationship("AttractionReview", back_populates="attraction")
    gallery = relationship("AttractionGallery", back_populates="attraction")


class AttractionTimeline(Base):
    __tablename__ = "attraction_timeline"

    id = Column(Integer, primary_key=True, index=True)
    attraction_id = Column(Integer, ForeignKey("attractions.id"), nullable=False)
    year = Column(String(50), nullable=False)  # e.g., "1417-1420" or "2001"
    event_title = Column(String(200), nullable=False)
    event_description = Column(Text, nullable=False)
    order = Column(Integer, default=0)  # For sorting events chronologically

    attraction = relationship("Attraction", back_populates="timeline_events")


class AttractionReview(Base):
    __tablename__ = "attraction_reviews"

    id = Column(Integer, primary_key=True, index=True)
    attraction_id = Column(Integer, ForeignKey("attractions.id"), nullable=False)
    reviewer_name = Column(String(100), nullable=False)
    rating = Column(Integer, nullable=False)  # 1-5
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    attraction = relationship("Attraction", back_populates="reviews")


class AttractionGallery(Base):
    __tablename__ = "attraction_gallery"

    id = Column(Integer, primary_key=True, index=True)
    attraction_id = Column(Integer, ForeignKey("attractions.id"), nullable=False)
    image_url = Column(String(255), nullable=False)
    caption = Column(String(255))
    order = Column(Integer, default=0)

    attraction = relationship("Attraction", back_populates="gallery")