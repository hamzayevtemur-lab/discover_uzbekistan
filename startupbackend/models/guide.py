from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, Boolean
from database import Base
from datetime import datetime


class Guide(Base):
    __tablename__ = "guides"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    bio = Column(Text)
    photo_url = Column(String(500))
    languages = Column(String(255))
    cities = Column(String(255))
    tour_types = Column(String(255))
    price_per_day = Column(Numeric(10, 2))
    experience_years = Column(Integer, default=0)
    phone = Column(String(50))
    telegram = Column(String(100))
    instagram = Column(String(100))
    email = Column(String(255), unique=True)
    password_hash = Column(String(255))
    status = Column(String(20), default='pending')
    rating = Column(Numeric(3, 2), default=0.0)
    review_count = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
