from sqlalchemy import Boolean, Column, Integer, String, Float, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func, expression
from database import Base
from enum import Enum as PyEnum


class ApprovalStatus(str, PyEnum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(255))
    rating = Column(Float)
    image_url = Column(String(255))
    cuisine_type = Column(String(100))   # e.g., "Uzbek Fine Dining"
    phone = Column(String(50))
    opening_hours = Column(String(100))  # e.g., "Mon-Sun 10:00-22:00"  
    
    is_partner = Column(
        Boolean,
        nullable=False,
        server_default=expression.false()   # This is correct – creates DEFAULT FALSE in DB
    )
    
    website = Column(String(255))

    menu_items = relationship("RestaurantMenu", back_populates="restaurant")
    reviews    = relationship("Review", back_populates="restaurant")
    
    status = Column(String(20), default="pending")  # pending, approved, rejected
    rejection_reason = Column(Text, nullable=True)  # Why it was rejected
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)  # Admin email who approved
    
    partner_email = Column(String(255), nullable=True, unique=True)
    partner_password = Column(String(255), nullable=True)



class RestaurantMenu(Base):
    __tablename__ = "restaurant_menus"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"))
    item_name = Column(String(100))
    price = Column(Float)
    category = Column(String(50))
    image_url = Column(String(255))

    restaurant = relationship("Restaurant", back_populates="menu_items")
    
    status = Column(String(20), default="pending")
    rejection_reason = Column(Text, nullable=True)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    reviewer_name = Column(String(100), nullable=False)
    rating = Column(Integer, nullable=False)          # 1–5
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    restaurant = relationship("Restaurant", back_populates="reviews")