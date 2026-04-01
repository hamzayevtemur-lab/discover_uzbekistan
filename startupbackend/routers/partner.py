# routers/partner.py
# SIMPLE VERSION - No bcrypt issues, perfect for testing!

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime, timedelta
from jose import jwt
from pydantic import BaseModel, EmailStr
import hashlib
import os

from database import get_db
from models import Restaurant, Hotel, Attraction

router = APIRouter(prefix="/partner", tags=["partner"])
security = HTTPBearer()

# Security configuration
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days

# ==================== SIMPLE PASSWORD FUNCTIONS ====================

def hash_password(password: str) -> str:
    """Simple SHA256 hashing (for testing - use bcrypt in production)"""
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password using SHA256"""
    return hash_password(plain_password) == hashed_password

# ==================== PYDANTIC MODELS ====================

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    partner: dict

class RestaurantCreate(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    cuisine_type: Optional[str] = None
    phone: Optional[str] = None
    opening_hours: Optional[str] = None
    website: Optional[str] = None
    image_url: Optional[str] = None

class HotelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    type: Optional[str] = None
    phone: Optional[str] = None
    opening_hours: Optional[str] = None
    website: Optional[str] = None
    offer: Optional[str] = None
    image_url: Optional[str] = None

class AttractionCreate(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    category: Optional[str] = None
    phone: Optional[str] = None
    opening_hours: Optional[str] = None
    entry_fee: Optional[str] = None
    website: Optional[str] = None
    year_built: Optional[str] = None
    historical_period: Optional[str] = None
    image_url: Optional[str] = None

# ==================== PARTNER STORAGE ====================

# Pre-computed password hashes using SHA256
PARTNERS = {
    "partner@example.com": {
        "id": 1,
        "email": "partner@example.com",
        "password_hash": hash_password("partner123"),  # SHA256 hash
        "business_name": "Demo Restaurant Group",
        "phone": "+998 90 123 4567",
        "is_active": True
    },
    # TEST ACCOUNT
    "test@partner.com": {
        "id": 2,
        "email": "test@partner.com",
        "password_hash": hash_password("test123"),  # SHA256 hash
        "business_name": "Test Restaurant",
        "phone": "+998 90 123 4567",
        "is_active": True,
        "restaurant_id": 1
    }
}

def add_partner(email: str, password: str, business_name: str, phone: str = None, restaurant_id: int = None):
    """Helper function to add new partners"""
    partner_id = len(PARTNERS) + 1
    PARTNERS[email] = {
        "id": partner_id,
        "email": email,
        "password_hash": hash_password(password),
        "business_name": business_name,
        "phone": phone,
        "is_active": True,
        "restaurant_id": restaurant_id
    }
    return partner_id

# ==================== TOKEN FUNCTIONS ====================

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

def get_current_partner(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Get current authenticated partner from token"""
    token = credentials.credentials
    payload = decode_token(token)
    
    email = payload.get("sub")
    if email is None or email not in PARTNERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    partner = PARTNERS[email]
    if not partner["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Partner account is inactive"
        )
    
    return partner

# ==================== AUTHENTICATION ENDPOINTS ====================

@router.post("/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    """Partner login endpoint"""
    # Check if partner exists
    if request.email not in PARTNERS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    partner = PARTNERS[request.email]
    
    # Verify password
    if not verify_password(request.password, partner["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Check if account is active
    if not partner["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact support."
        )
    
    # Create access token
    access_token = create_access_token(data={"sub": partner["email"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "partner": {
            "id": partner["id"],
            "email": partner["email"],
            "business_name": partner["business_name"],
            "phone": partner["phone"]
        }
    }

@router.get("/me")
async def get_current_partner_info(current_partner: dict = Depends(get_current_partner)):
    """Get current partner information"""
    return {
        "id": current_partner["id"],
        "email": current_partner["email"],
        "business_name": current_partner["business_name"],
        "phone": current_partner["phone"],
        "is_active": current_partner["is_active"]
    }

# ==================== DASHBOARD ====================

@router.get("/stats")
async def get_partner_stats(
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get partner dashboard statistics"""
    restaurant_id = current_partner.get("restaurant_id", 1)
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        return {
            "total_listings": 0,
            "approved": 0,
            "pending": 0,
            "rejected": 0,
            "total_views": 0,
            "total_restaurants": 0,
            "total_menu_items": 0,
            "avg_rating": 0.0,
            "total_reviews": 0
        }
    
    from models.restaurant import RestaurantMenu, Review
    menu_count = db.query(RestaurantMenu).filter(
        RestaurantMenu.restaurant_id == restaurant_id
    ).count()
    
    review_count = db.query(Review).filter(
        Review.restaurant_id == restaurant_id
    ).count()
    
    return {
        "total_listings": 1,
        "approved": 1,
        "pending": 0,
        "rejected": 0,
        "total_views": 0,
        "total_restaurants": 1,
        "total_menu_items": menu_count,
        "avg_rating": float(restaurant.rating) if restaurant.rating else 0.0,
        "total_reviews": review_count
    }

@router.get("/listings")
async def get_partner_listings(
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get all partner listings"""
    restaurant_id = current_partner.get("restaurant_id")
    
    if not restaurant_id:
        return []
    
    listings = []
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if restaurant:
        listings.append({
            "id": restaurant.id,
            "name": restaurant.name,
            "type": "restaurant",
            "status": "approved",
            "created_at": datetime.now().isoformat()
        })
    
    return listings

# ==================== RESTAURANT MANAGEMENT ====================

@router.get("/restaurants")
async def get_partner_restaurants(
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get all partner's restaurants"""
    restaurant_id = current_partner.get("restaurant_id", 1)
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        return []
    
    return [{
        "id": restaurant.id,
        "name": restaurant.name,
        "description": restaurant.description,
        "latitude": restaurant.latitude,
        "longitude": restaurant.longitude,
        "address": restaurant.address,
        "rating": restaurant.rating,
        "image_url": restaurant.image_url,
        "cuisine_type": restaurant.cuisine_type,
        "phone": restaurant.phone,
        "opening_hours": restaurant.opening_hours,
        "website": restaurant.website,
        "status": "approved"
    }]

@router.post("/restaurants")
async def create_restaurant(
    data: RestaurantCreate,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create a new restaurant listing"""
    restaurant = Restaurant(
        name=data.name,
        description=data.description,
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        rating=0.0,
        image_url=data.image_url,
        cuisine_type=data.cuisine_type,
        phone=data.phone,
        opening_hours=data.opening_hours,
        is_partner=True,
        website=data.website
    )
    
    db.add(restaurant)
    db.commit()
    db.refresh(restaurant)
    
    return {
        "id": restaurant.id,
        "message": "Restaurant created successfully",
        "status": "approved"
    }

@router.put("/restaurants/{restaurant_id}")
async def update_restaurant(
    restaurant_id: int,
    data: RestaurantCreate,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Update a restaurant listing"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(restaurant, key, value)
    
    db.commit()
    db.refresh(restaurant)
    
    return {
        "id": restaurant.id,
        "message": "Restaurant updated successfully",
        "status": "approved"
    }

@router.delete("/restaurants/{restaurant_id}")
async def delete_restaurant(
    restaurant_id: int,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Delete a restaurant listing"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    db.delete(restaurant)
    db.commit()
    
    return {"message": "Restaurant deleted successfully"}

# ==================== HOTEL MANAGEMENT ====================

@router.get("/hotels")
async def get_partner_hotels(
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get all partner's hotels"""
    hotels = db.query(Hotel).filter(Hotel.is_partner == True).all()
    
    return [{
        "id": h.id,
        "name": h.name,
        "description": h.description,
        "latitude": h.latitude,
        "longitude": h.longitude,
        "address": h.address,
        "rating": h.rating,
        "image_url": h.image_url,
        "type": h.type,
        "phone": h.phone,
        "opening_hours": h.opening_hours,
        "website": h.website,
        "offer": h.offer,
        "status": "approved"
    } for h in hotels]

@router.post("/hotels")
async def create_hotel(
    data: HotelCreate,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create a new hotel listing"""
    hotel = Hotel(
        name=data.name,
        description=data.description,
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        rating=0.0,
        review_count=0,
        image_url=data.image_url,
        type=data.type,
        phone=data.phone,
        opening_hours=data.opening_hours,
        is_partner=True,
        website=data.website,
        offer=data.offer
    )
    
    db.add(hotel)
    db.commit()
    db.refresh(hotel)
    
    return {
        "id": hotel.id,
        "message": "Hotel created successfully",
        "status": "approved"
    }

@router.put("/hotels/{hotel_id}")
async def update_hotel(
    hotel_id: int,
    data: HotelCreate,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Update a hotel listing"""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(hotel, key, value)
    
    db.commit()
    db.refresh(hotel)
    
    return {
        "id": hotel.id,
        "message": "Hotel updated successfully",
        "status": "approved"
    }

@router.delete("/hotels/{hotel_id}")
async def delete_hotel(
    hotel_id: int,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Delete a hotel listing"""
    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")
    
    db.delete(hotel)
    db.commit()
    
    return {"message": "Hotel deleted successfully"}

# ==================== ATTRACTION MANAGEMENT ====================

@router.get("/attractions")
async def get_partner_attractions(
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Get all partner's attractions"""
    attractions = db.query(Attraction).filter(Attraction.is_partner == True).all()
    
    return [{
        "id": a.id,
        "name": a.name,
        "description": a.description,
        "latitude": a.latitude,
        "longitude": a.longitude,
        "address": a.address,
        "rating": a.rating,
        "image_url": a.image_url,
        "category": a.category,
        "phone": a.phone,
        "opening_hours": a.opening_hours,
        "entry_fee": a.entry_fee,
        "website": a.website,
        "year_built": a.year_built,
        "historical_period": a.historical_period,
        "status": "approved"
    } for a in attractions]

@router.post("/attractions")
async def create_attraction(
    data: AttractionCreate,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Create a new attraction listing"""
    attraction = Attraction(
        name=data.name,
        description=data.description,
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
        rating=0.0,
        review_count=0,
        image_url=data.image_url,
        category=data.category,
        phone=data.phone,
        opening_hours=data.opening_hours,
        entry_fee=data.entry_fee,
        website=data.website,
        is_partner=True,
        year_built=data.year_built,
        historical_period=data.historical_period
    )
    
    db.add(attraction)
    db.commit()
    db.refresh(attraction)
    
    return {
        "id": attraction.id,
        "message": "Attraction created successfully",
        "status": "approved"
    }

@router.put("/attractions/{attraction_id}")
async def update_attraction(
    attraction_id: int,
    data: AttractionCreate,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Update an attraction listing"""
    attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    for key, value in data.dict(exclude_unset=True).items():
        setattr(attraction, key, value)
    
    db.commit()
    db.refresh(attraction)
    
    return {
        "id": attraction.id,
        "message": "Attraction updated successfully",
        "status": "approved"
    }

@router.delete("/attractions/{attraction_id}")
async def delete_attraction(
    attraction_id: int,
    current_partner: dict = Depends(get_current_partner),
    db: Session = Depends(get_db)
):
    """Delete an attraction listing"""
    attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    
    if not attraction:
        raise HTTPException(status_code=404, detail="Attraction not found")
    
    db.delete(attraction)
    db.commit()
    
    return {"message": "Attraction deleted successfully"}

print("✅ Partner router loaded successfully - Using SHA256 hashing")