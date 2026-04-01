# routers/partner_agency.py
# Travel Agency Partner Router — same pattern as partner.py
# Handles agency admin authentication + tour/agency management
# Add to main.py: app.include_router(partner_agency.router)

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime, timedelta
from jose import jwt
from pydantic import BaseModel
import hashlib
import shutil
from pathlib import Path
import uuid
import os

from database import get_db
from models.travel_agency import TravelAgency, Tour, AgencyReview, TourItinerary, TourDestination

router = APIRouter(prefix="/agency-partner", tags=["agency-partner"])
security = HTTPBearer()

# ── Reuse same secret as partner.py ────────────────────────────
SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 43200  # 30 days

# ==================== PASSWORD HELPERS ====================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_password(plain: str, hashed: str) -> bool:
    return hash_password(plain) == hashed

# ==================== AGENCY PARTNERS STORE ====================
# Same in-memory pattern as PARTNERS in partner.py
# Add real agencies here, or migrate to DB later

AGENCY_PARTNERS = {
    "agency@example.com": {
        "id": 1,
        "email": "agency@example.com",
        "password_hash": hash_password("agency123"),
        "business_name": "Demo Tour Agency",
        "phone": "+998 71 234 5678",
        "is_active": True,
        "agency_id": 1,          # links to travel_agencies.id
    },
    "test@agency.com": {
        "id": 2,
        "email": "test@agency.com",
        "password_hash": hash_password("test123"),
        "business_name": "Test Agency",
        "phone": "+998 90 000 0000",
        "is_active": True,
        "agency_id": None,        # no agency yet, can create one
    },
}

def add_agency_partner(email: str, password: str, business_name: str,
                        phone: str = None, agency_id: int = None):
    """Helper to add a new agency partner account"""
    AGENCY_PARTNERS[email] = {
        "id": len(AGENCY_PARTNERS) + 1,
        "email": email,
        "password_hash": hash_password(password),
        "business_name": business_name,
        "phone": phone,
        "is_active": True,
        "agency_id": agency_id,
    }

# ==================== TOKEN HELPERS ====================

def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid credentials")

def get_current_agency_partner(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    payload = decode_token(credentials.credentials)
    email = payload.get("sub")
    if not email or email not in AGENCY_PARTNERS:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    partner = AGENCY_PARTNERS[email]
    if not partner["is_active"]:
        raise HTTPException(status_code=403, detail="Account is inactive")
    return partner

# ==================== PYDANTIC SCHEMAS ====================

class AgencyLoginRequest(BaseModel):
    email: str
    password: str

class AgencyCreate(BaseModel):
    name: str
    agency_type: Optional[str] = "Tour Operator"
    description: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    languages: Optional[str] = "English, Russian, Uzbek"
    image_url: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    specializations: Optional[list] = []

class TourCreate(BaseModel):
    tour_name: str
    tour_type: Optional[str] = None
    description: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = "USD"
    max_group_size: Optional[int] = None
    image_url: Optional[str] = None
    highlights: Optional[list] = []
    included_services: Optional[list] = []
    excluded_services: Optional[list] = []
    difficulty_level: Optional[str] = None
    best_season: Optional[str] = None

class TourUpdate(TourCreate):
    pass

class ItineraryDayCreate(BaseModel):
    day_number: int
    day_title: str
    activities: str
    meals: Optional[str] = None
    accommodation: Optional[str] = None
    destinations: Optional[list] = []
    coordinates: Optional[list] = []

class DestinationCreate(BaseModel):
    destination_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    visit_order: Optional[int] = 0
    nights_stay: Optional[int] = 0
    description: Optional[str] = None

# ==================== AUTH ====================

@router.post("/login")
async def agency_partner_login(request: AgencyLoginRequest):
    """Login for travel agency partners"""
    if request.email not in AGENCY_PARTNERS:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    partner = AGENCY_PARTNERS[request.email]

    if not verify_password(request.password, partner["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not partner["is_active"]:
        raise HTTPException(status_code=403, detail="Account is inactive")

    token = create_token({"sub": partner["email"]})

    return {
        "access_token": token,
        "token_type": "bearer",
        "partner": {
            "id": partner["id"],
            "email": partner["email"],
            "business_name": partner["business_name"],
            "phone": partner["phone"],
            "agency_id": partner.get("agency_id"),
        }
    }

@router.get("/me")
async def get_me(current: dict = Depends(get_current_agency_partner)):
    return {
        "id": current["id"],
        "email": current["email"],
        "business_name": current["business_name"],
        "phone": current["phone"],
        "agency_id": current.get("agency_id"),
        "is_active": current["is_active"],
    }

# ==================== IMAGE UPLOAD ====================

@router.post("/upload-image")
async def upload_agency_image(
    file: UploadFile = File(...),
    current: dict = Depends(get_current_agency_partner)
):
    """Upload image — same logic as /admin/upload-image"""
    try:
        upload_dir = Path("static/uploads")
        upload_dir.mkdir(parents=True, exist_ok=True)
        ext = Path(file.filename).suffix
        filename = f"{uuid.uuid4()}{ext}"
        filepath = upload_dir / filename
        with filepath.open("wb") as buf:
            shutil.copyfileobj(file.file, buf)
        return {"url": f"/static/uploads/{filename}", "filename": filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

# ==================== AGENCY PROFILE ====================

@router.get("/agency")
async def get_my_agency(
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    """Get the agency this partner manages"""
    agency_id = current.get("agency_id")
    if not agency_id:
        return None

    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    return _agency_dict(agency, db)


@router.post("/agency", status_code=201)
async def create_my_agency(
    data: AgencyCreate,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    """Create a new agency (submitted as pending for CEO approval)"""
    agency = TravelAgency(
        name=data.name,
        agency_type=data.agency_type,
        description=data.description,
        city=data.city,
        address=data.address,
        phone=data.phone,
        email=data.email,
        website=data.website,
        languages=data.languages,
        image_url=data.image_url,
        latitude=data.latitude,
        longitude=data.longitude,
        specializations=data.specializations or [],
        rating=0.0,
        tours_count=0,
        is_verified=False,
        is_partner=True,
        status="pending",        # goes to CEO approval queue
    )
    db.add(agency)
    db.commit()
    db.refresh(agency)

    # Link agency_id to this partner account in memory
    AGENCY_PARTNERS[current["email"]]["agency_id"] = agency.id

    return {"id": agency.id, "message": "Agency submitted for approval", "status": "pending"}


@router.put("/agency")
async def update_my_agency(
    data: AgencyCreate,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    """Update agency profile"""
    agency_id = current.get("agency_id")
    if not agency_id:
        raise HTTPException(status_code=404, detail="No agency linked to this account")

    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    for field, value in data.dict(exclude_unset=True).items():
        if hasattr(agency, field):
            setattr(agency, field, value)

    db.commit()
    db.refresh(agency)
    return {"message": "Agency updated", "id": agency.id}


# ==================== TOURS ====================

@router.get("/tours")
async def get_my_tours(
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    """Get all tours for this partner's agency"""
    agency_id = current.get("agency_id")
    if not agency_id:
        return []

    tours = db.query(Tour).options(
        joinedload(Tour.destinations),
        joinedload(Tour.itinerary_days).joinedload(TourItinerary.images)
    ).filter(Tour.agency_id == agency_id).all()

    return [_tour_dict(t) for t in tours]


@router.post("/tours", status_code=201)
async def create_tour(
    data: TourCreate,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    """Create a new tour (submitted as pending for CEO approval)"""
    agency_id = current.get("agency_id")
    if not agency_id:
        raise HTTPException(status_code=400, detail="No agency linked. Create an agency first.")

    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found")

    tour = Tour(
        agency_id=agency_id,
        tour_name=data.tour_name,
        tour_type=data.tour_type,
        description=data.description,
        duration_days=data.duration_days,
        price=data.price,
        currency=data.currency or "USD",
        max_group_size=data.max_group_size,
        image_url=data.image_url,
        highlights=data.highlights or [],
        included_services=data.included_services or [],
        excluded_services=data.excluded_services or [],
        difficulty_level=data.difficulty_level,
        best_season=data.best_season,
        is_active=True,
        status="pending",        # goes to CEO approval queue
    )
    db.add(tour)

    agency.tours_count = db.query(Tour).filter(Tour.agency_id == agency_id).count() + 1
    db.commit()
    db.refresh(tour)

    return {"id": tour.id, "message": "Tour submitted for approval", "status": "pending"}


@router.put("/tours/{tour_id}")
async def update_tour(
    tour_id: int,
    data: TourUpdate,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    """Update a tour (only if it belongs to this partner's agency)"""
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    for field, value in data.dict(exclude_unset=True).items():
        if hasattr(tour, field):
            setattr(tour, field, value)

    db.commit()
    db.refresh(tour)
    return {"message": "Tour updated", "id": tour.id}


@router.delete("/tours/{tour_id}")
async def delete_tour(
    tour_id: int,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    """Delete a tour (only if it belongs to this partner's agency)"""
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    for day in db.query(TourItinerary).filter(TourItinerary.tour_id == tour_id).all():
        db.query(ItineraryImage).filter(ItineraryImage.itinerary_id == day.id).delete()
    db.query(TourItinerary).filter(TourItinerary.tour_id == tour_id).delete()
    db.query(TourDestination).filter(TourDestination.tour_id == tour_id).delete()
    db.delete(tour)

    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if agency:
        agency.tours_count = db.query(Tour).filter(Tour.agency_id == agency_id).count()

    db.commit()
    return {"message": "Tour deleted"}


# ==================== ITINERARY ====================

@router.get("/tours/{tour_id}/itinerary")
async def get_itinerary(
    tour_id: int,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    days = db.query(TourItinerary).options(
        joinedload(TourItinerary.images)
    ).filter(TourItinerary.tour_id == tour_id).order_by(TourItinerary.day_number).all()

    return [_day_dict(d) for d in days]


@router.post("/tours/{tour_id}/itinerary", status_code=201)
async def add_itinerary_day(
    tour_id: int,
    data: ItineraryDayCreate,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    day = TourItinerary(
        tour_id=tour_id,
        day_number=data.day_number,
        day_title=data.day_title,
        activities=data.activities,
        meals=data.meals,
        accommodation=data.accommodation,
        destinations=data.destinations or [],
        coordinates=data.coordinates or [],
    )
    db.add(day)
    db.commit()
    db.refresh(day)
    return _day_dict(day)


@router.put("/tours/{tour_id}/itinerary/{day_id}")
async def update_itinerary_day(
    tour_id: int,
    day_id: int,
    data: ItineraryDayCreate,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    day = db.query(TourItinerary).filter(
        TourItinerary.id == day_id, TourItinerary.tour_id == tour_id
    ).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")

    for field, value in data.dict(exclude_unset=True).items():
        setattr(day, field, value)

    db.commit()
    db.refresh(day)
    return _day_dict(day)


@router.delete("/tours/{tour_id}/itinerary/{day_id}")
async def delete_itinerary_day(
    tour_id: int,
    day_id: int,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    day = db.query(TourItinerary).filter(
        TourItinerary.id == day_id, TourItinerary.tour_id == tour_id
    ).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")

    db.query(ItineraryImage).filter(ItineraryImage.itinerary_id == day_id).delete()
    db.delete(day)
    db.commit()
    return {"message": "Day deleted"}


# ==================== DESTINATIONS ====================

@router.get("/tours/{tour_id}/destinations")
async def get_destinations(
    tour_id: int,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    dests = db.query(TourDestination).filter(
        TourDestination.tour_id == tour_id
    ).order_by(TourDestination.visit_order).all()
    return [_dest_dict(d) for d in dests]


@router.post("/tours/{tour_id}/destinations", status_code=201)
async def add_destination(
    tour_id: int,
    data: DestinationCreate,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    dest = TourDestination(
        tour_id=tour_id,
        destination_name=data.destination_name,
        latitude=data.latitude,
        longitude=data.longitude,
        visit_order=data.visit_order or 0,
        nights_stay=data.nights_stay or 0,
        description=data.description,
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)
    return _dest_dict(dest)


@router.delete("/tours/{tour_id}/destinations/{dest_id}")
async def delete_destination(
    tour_id: int,
    dest_id: int,
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    agency_id = current.get("agency_id")
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or not yours")

    dest = db.query(TourDestination).filter(
        TourDestination.id == dest_id, TourDestination.tour_id == tour_id
    ).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    db.delete(dest)
    db.commit()
    return {"message": "Destination deleted"}


# ==================== DASHBOARD STATS ====================

@router.get("/stats")
async def get_agency_stats(
    current: dict = Depends(get_current_agency_partner),
    db: Session = Depends(get_db)
):
    """Dashboard stats for the agency partner"""
    agency_id = current.get("agency_id")
    if not agency_id:
        return {"agency": None, "tours": 0, "pending_tours": 0, "approved_tours": 0, "reviews": 0, "avg_rating": 0.0}

    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    total_tours   = db.query(Tour).filter(Tour.agency_id == agency_id).count()
    pending_tours = db.query(Tour).filter(Tour.agency_id == agency_id, Tour.status == "pending").count()
    approved_tours = db.query(Tour).filter(Tour.agency_id == agency_id, Tour.status == "approved").count()
    total_reviews = db.query(AgencyReview).filter(AgencyReview.agency_id == agency_id).count()

    return {
        "agency": agency.name if agency else None,
        "agency_status": getattr(agency, "status", "approved") if agency else None,
        "tours": total_tours,
        "pending_tours": pending_tours,
        "approved_tours": approved_tours,
        "reviews": total_reviews,
        "avg_rating": float(agency.rating) if agency and agency.rating else 0.0,
    }


# ==================== INTERNAL HELPERS ====================

def _agency_dict(agency: TravelAgency, db: Session) -> dict:
    tour_count   = db.query(Tour).filter(Tour.agency_id == agency.id).count()
    review_count = db.query(AgencyReview).filter(AgencyReview.agency_id == agency.id).count()
    return {
        "id": agency.id,
        "name": agency.name,
        "agency_type": agency.agency_type,
        "image_url": agency.image_url,
        "city": agency.city,
        "address": agency.address,
        "phone": agency.phone,
        "email": agency.email,
        "website": agency.website,
        "description": agency.description,
        "specializations": agency.specializations,
        "languages": agency.languages,
        "rating": float(agency.rating) if agency.rating else 0.0,
        "tours_count": tour_count,
        "review_count": review_count,
        "is_verified": agency.is_verified,
        "is_partner": agency.is_partner,
        "latitude": float(agency.latitude) if agency.latitude else None,
        "longitude": float(agency.longitude) if agency.longitude else None,
        "status": getattr(agency, "status", "approved"),
    }

def _tour_dict(tour: Tour) -> dict:
    return {
        "id": tour.id,
        "agency_id": tour.agency_id,
        "tour_name": tour.tour_name,
        "tour_type": tour.tour_type,
        "description": tour.description,
        "duration_days": tour.duration_days,
        "price": float(tour.price) if tour.price else None,
        "currency": tour.currency,
        "max_group_size": tour.max_group_size,
        "image_url": tour.image_url,
        "highlights": tour.highlights,
        "included_services": tour.included_services,
        "excluded_services": tour.excluded_services,
        "difficulty_level": tour.difficulty_level,
        "best_season": tour.best_season,
        "is_active": tour.is_active,
        "status": getattr(tour, "status", "approved"),
        "destinations": [_dest_dict(d) for d in (tour.destinations or [])],
        "itinerary_days": [_day_dict(d) for d in (tour.itinerary_days or [])],
    }

def _day_dict(day: TourItinerary) -> dict:
    return {
        "id": day.id,
        "tour_id": day.tour_id,
        "day_number": day.day_number,
        "day_title": day.day_title,
        "activities": day.activities,
        "meals": day.meals,
        "accommodation": day.accommodation,
        "destinations": day.destinations,
        "coordinates": day.coordinates,
        "images": [{"id": img.id, "image_url": img.image_url, "caption": img.caption}
                   for img in (day.images or [])],
    }

def _dest_dict(dest: TourDestination) -> dict:
    return {
        "id": dest.id,
        "tour_id": dest.tour_id,
        "destination_name": dest.destination_name,
        "latitude": float(dest.latitude) if dest.latitude else None,
        "longitude": float(dest.longitude) if dest.longitude else None,
        "visit_order": dest.visit_order,
        "nights_stay": dest.nights_stay,
        "description": dest.description,
    }


print("✅ Agency partner router loaded")