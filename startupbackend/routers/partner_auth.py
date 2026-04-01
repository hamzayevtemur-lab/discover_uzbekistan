# routers/partner_auth_routes.py
# COMPLETE FIXED VERSION - Works with database hotels

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
import os

from database import get_db
from models.restaurant import Restaurant
from models.hotel import Hotel

router = APIRouter(prefix="/api/partner", tags=["partner-auth"])

import os
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def partner_login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Partner login for both restaurants and hotels
    Checks database for partner_email and partner_password
    """
    
    # Try restaurant first
    restaurant = db.query(Restaurant).filter(
        Restaurant.partner_email == credentials.email,
        Restaurant.is_partner == True
    ).first()
    
    if restaurant and restaurant.partner_password == credentials.password:
        token = jwt.encode(
            {
                "email": credentials.email,
                "type": "restaurant",
                "id": restaurant.id,
                "exp": datetime.utcnow() + timedelta(days=30)
            },
            SECRET_KEY,
            algorithm=ALGORITHM
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "partner_type": "restaurant",  # ← CRITICAL: Frontend needs this
            "id": restaurant.id,
            "name": restaurant.name
        }
    
    # Try hotel
    hotel = db.query(Hotel).filter(
        Hotel.partner_email == credentials.email,
        Hotel.is_partner == True
    ).first()
    
    if hotel and hotel.partner_password == credentials.password:
        token = jwt.encode(
            {
                "email": credentials.email,
                "type": "hotel",
                "id": hotel.id,
                "exp": datetime.utcnow() + timedelta(days=30)
            },
            SECRET_KEY,
            algorithm=ALGORITHM
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "partner_type": "hotel",  # ← CRITICAL: Frontend needs this
            "id": hotel.id,
            "name": hotel.name
        }
    
    # No match found
    raise HTTPException(
        status_code=401, 
        detail="Invalid email or password. Please check your credentials."
    )