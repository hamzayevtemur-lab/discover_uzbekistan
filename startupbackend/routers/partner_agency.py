from __future__ import annotations

import hashlib
import os
import shutil
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.travel_agency import (
    TravelAgency, Tour, AgencyReview,
    TourItinerary, TourDestination,
)

# ─────────────────────────────────────────────
# Router & security
# ─────────────────────────────────────────────

router   = APIRouter(prefix="/agency-partner", tags=["Agency Partner"])
security = HTTPBearer(auto_error=False)

SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM  = "HS256"
TOKEN_DAYS = 30


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _hash(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def _encode_token(email: str, agency_id: int) -> str:
    payload = {
        "sub":           email,
        "business_type": "travel_agency",
        "record_id":     agency_id,
        "exp":           datetime.utcnow() + timedelta(days=TOKEN_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError: #type: ignore
        raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
    except jwt.JWTError: #type: ignore
        raise HTTPException(status_code=401, detail="Invalid token.")


# ─────────────────────────────────────────────
# Auth dependency
# ─────────────────────────────────────────────

def get_current_agency(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> TravelAgency:
    """
    Decode JWT → verify business_type is travel_agency
    → load agency from DB → return the ORM object.
    Any endpoint that uses this dependency is fully authenticated.
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    payload    = _decode_token(credentials.credentials)
    biz_type   = payload.get("business_type")
    agency_id  = payload.get("record_id")

    if biz_type != "travel_agency" or not agency_id:
        raise HTTPException(status_code=403, detail="Not a travel agency account.")

    agency = db.query(TravelAgency).filter(TravelAgency.id == agency_id).first()
    if not agency:
        raise HTTPException(status_code=404, detail="Agency not found.")

    return agency


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

class LoginRequest(BaseModel):
    email:    str
    password: str

class AgencyUpdate(BaseModel):
    name:            Optional[str]   = None
    agency_type:     Optional[str]   = None
    description:     Optional[str]   = None
    city:            Optional[str]   = None
    address:         Optional[str]   = None
    phone:           Optional[str]   = None
    email:           Optional[str]   = None
    website:         Optional[str]   = None
    languages:       Optional[str]   = None
    image_url:       Optional[str]   = None
    latitude:        Optional[float] = None
    longitude:       Optional[float] = None
    specializations: Optional[list]  = None

class TourCreate(BaseModel):
    tour_name:         str
    tour_type:         Optional[str]   = None
    description:       Optional[str]   = None
    duration_days:     Optional[int]   = None
    price:             Optional[float] = None
    currency:          Optional[str]   = "USD"
    max_group_size:    Optional[int]   = None
    image_url:         Optional[str]   = None
    highlights:        Optional[list]  = []
    included_services: Optional[list]  = []
    excluded_services: Optional[list]  = []
    difficulty_level:  Optional[str]   = None
    best_season:       Optional[str]   = None

class TourUpdate(TourCreate):
    pass

class ItineraryDayCreate(BaseModel):
    day_number:    int
    day_title:     str
    activities:    str
    meals:         Optional[str]  = None
    accommodation: Optional[str]  = None
    destinations:  Optional[list] = []
    coordinates:   Optional[list] = []

class DestinationCreate(BaseModel):
    destination_name: str
    latitude:         Optional[float] = None
    longitude:        Optional[float] = None
    visit_order:      Optional[int]   = 0
    nights_stay:      Optional[int]   = 0
    description:      Optional[str]   = None


# ─────────────────────────────────────────────
# AUTH
# ─────────────────────────────────────────────

@router.post("/login", summary="Agency partner login")
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate a travel agency partner.
    Checks partner_email + partner_password on the travel_agencies table.
    """
    agency = db.query(TravelAgency).filter(
        TravelAgency.email == data.email
    ).first()

    if not agency or not agency.partner_password:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    if agency.partner_password != _hash(data.password):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = _encode_token(data.email, agency.id)

    return {
        "access_token":  token,
        "token_type":    "bearer",
        "business_type": "travel_agency",
        "business_name": agency.name,
        "record_id":     agency.id,
        "dashboard_url": f"http://localhost:8000/travel-agency-admin-dashboard.html?id={agency.id}",
    }


# ─────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────

@router.get("/me", summary="Get current agency info")
async def get_me(agency: TravelAgency = Depends(get_current_agency), db: Session = Depends(get_db)):
    return _agency_dict(agency, db)


@router.get("/agency", summary="Get partner's agency profile")
async def get_agency(agency: TravelAgency = Depends(get_current_agency), db: Session = Depends(get_db)):
    return _agency_dict(agency, db)


@router.put("/agency", summary="Update agency profile")
async def update_agency(
    data:   AgencyUpdate,
    agency: TravelAgency = Depends(get_current_agency),
    db:     Session      = Depends(get_db),
):
    for field, value in data.dict(exclude_unset=True).items():
        if value is not None and hasattr(agency, field):
            setattr(agency, field, value)

    # Re-submit for approval after any profile change
    agency.status = "pending"
    db.commit()
    db.refresh(agency)

    return {"success": True, "message": "Agency updated. Waiting for admin approval.", "id": agency.id}


# ─────────────────────────────────────────────
# IMAGE UPLOAD
# ─────────────────────────────────────────────

@router.post("/upload-image", summary="Upload an image")
async def upload_image(
    file:   UploadFile = File(...),
    agency: TravelAgency = Depends(get_current_agency),
):
    try:
        allowed = {"image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"}
        if file.content_type not in allowed:
            raise HTTPException(status_code=400, detail="Invalid file type.")

        file.file.seek(0, 2)
        if file.file.tell() > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max 5 MB.")
        file.file.seek(0)

        upload_dir = Path("static/uploads/agencies")
        upload_dir.mkdir(parents=True, exist_ok=True)

        filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
        with (upload_dir / filename).open("wb") as buf:
            shutil.copyfileobj(file.file, buf)

        return {"url": f"/static/uploads/agencies/{filename}"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


# ─────────────────────────────────────────────
# STATS
# ─────────────────────────────────────────────

@router.get("/stats", summary="Dashboard statistics")
async def get_stats(
    agency: TravelAgency = Depends(get_current_agency),
    db:     Session      = Depends(get_db),
):
    total    = db.query(Tour).filter(Tour.agency_id == agency.id).count()
    pending  = db.query(Tour).filter(Tour.agency_id == agency.id, Tour.status == "pending").count()
    approved = db.query(Tour).filter(Tour.agency_id == agency.id, Tour.status == "approved").count()
    reviews  = db.query(AgencyReview).filter(AgencyReview.agency_id == agency.id).count()

    return {
        "agency_name":   agency.name,
        "agency_status": getattr(agency, "status", "approved"),
        "total_tours":   total,
        "pending_tours": pending,
        "approved_tours":approved,
        "total_reviews": reviews,
        "avg_rating":    float(agency.rating) if agency.rating else 0.0,
    }


# ─────────────────────────────────────────────
# TOURS
# ─────────────────────────────────────────────

@router.get("/tours", summary="Get all tours for this agency")
async def get_tours(
    agency: TravelAgency = Depends(get_current_agency),
    db:     Session      = Depends(get_db),
):
    tours = (
        db.query(Tour)
        .options(
            joinedload(Tour.destinations),
            joinedload(Tour.itinerary_days),
        )
        .filter(Tour.agency_id == agency.id)
        .all()
    )
    return [_tour_dict(t) for t in tours]


@router.post("/tours", status_code=201, summary="Create a new tour")
async def create_tour(
    data:   TourCreate,
    agency: TravelAgency = Depends(get_current_agency),
    db:     Session      = Depends(get_db),
):
    tour = Tour(
        agency_id         = agency.id,
        tour_name         = data.tour_name,
        tour_type         = data.tour_type,
        description       = data.description,
        duration_days     = data.duration_days,
        price             = data.price,
        currency          = data.currency or "USD",
        max_group_size    = data.max_group_size,
        image_url         = data.image_url,
        highlights        = data.highlights        or [],
        included_services = data.included_services or [],
        excluded_services = data.excluded_services or [],
        difficulty_level  = data.difficulty_level,
        best_season       = data.best_season,
        is_active         = True,
        status            = "pending",
    )
    db.add(tour)
    agency.tours_count = db.query(Tour).filter(Tour.agency_id == agency.id).count() + 1
    db.commit()
    db.refresh(tour)

    return {"success": True, "message": "Tour submitted for admin approval.", "id": tour.id, "status": "pending"}


@router.put("/tours/{tour_id}", summary="Update a tour")
async def update_tour(
    tour_id: int,
    data:    TourUpdate,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    tour = _get_tour(tour_id, agency.id, db)

    for field, value in data.dict(exclude_unset=True).items():
        if hasattr(tour, field):
            setattr(tour, field, value)

    # Re-submit for approval after edit
    tour.status           = "pending"
    tour.rejection_reason = None
    db.commit()
    db.refresh(tour)

    return {"success": True, "message": "Tour updated. Waiting for admin approval.", "id": tour.id}


@router.delete("/tours/{tour_id}", summary="Delete a tour")
async def delete_tour(
    tour_id: int,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    tour = _get_tour(tour_id, agency.id, db)

    db.query(TourItinerary).filter(TourItinerary.tour_id == tour_id).delete()
    db.query(TourDestination).filter(TourDestination.tour_id == tour_id).delete()
    db.delete(tour)

    agency.tours_count = max(0, (agency.tours_count or 1) - 1)
    db.commit()

    return {"success": True, "message": "Tour deleted."}


# ─────────────────────────────────────────────
# ITINERARY
# ─────────────────────────────────────────────

@router.get("/tours/{tour_id}/itinerary", summary="Get itinerary days")
async def get_itinerary(
    tour_id: int,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    _get_tour(tour_id, agency.id, db)  # ownership check
    days = (
        db.query(TourItinerary)
        .filter(TourItinerary.tour_id == tour_id)
        .order_by(TourItinerary.day_number)
        .all()
    )
    return [_day_dict(d) for d in days]


@router.post("/tours/{tour_id}/itinerary", status_code=201, summary="Add an itinerary day")
async def add_itinerary_day(
    tour_id: int,
    data:    ItineraryDayCreate,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    _get_tour(tour_id, agency.id, db)

    day = TourItinerary(
        tour_id       = tour_id,
        day_number    = data.day_number,
        day_title     = data.day_title,
        activities    = data.activities,
        meals         = data.meals,
        accommodation = data.accommodation,
        destinations  = data.destinations or [],
        coordinates   = data.coordinates  or [],
    )
    db.add(day)
    db.commit()
    db.refresh(day)
    return _day_dict(day)


@router.put("/tours/{tour_id}/itinerary/{day_id}", summary="Update an itinerary day")
async def update_itinerary_day(
    tour_id: int,
    day_id:  int,
    data:    ItineraryDayCreate,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    _get_tour(tour_id, agency.id, db)
    day = _get_day(day_id, tour_id, db)

    for field, value in data.dict(exclude_unset=True).items():
        setattr(day, field, value)

    db.commit()
    db.refresh(day)
    return _day_dict(day)


@router.delete("/tours/{tour_id}/itinerary/{day_id}", summary="Delete an itinerary day")
async def delete_itinerary_day(
    tour_id: int,
    day_id:  int,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    _get_tour(tour_id, agency.id, db)
    day = _get_day(day_id, tour_id, db)
    db.delete(day)
    db.commit()
    return {"success": True, "message": "Day deleted."}


# ─────────────────────────────────────────────
# DESTINATIONS
# ─────────────────────────────────────────────

@router.get("/tours/{tour_id}/destinations", summary="Get tour destinations")
async def get_destinations(
    tour_id: int,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    _get_tour(tour_id, agency.id, db)
    dests = (
        db.query(TourDestination)
        .filter(TourDestination.tour_id == tour_id)
        .order_by(TourDestination.visit_order)
        .all()
    )
    return [_dest_dict(d) for d in dests]


@router.post("/tours/{tour_id}/destinations", status_code=201, summary="Add a destination")
async def add_destination(
    tour_id: int,
    data:    DestinationCreate,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    _get_tour(tour_id, agency.id, db)

    dest = TourDestination(
        tour_id          = tour_id,
        destination_name = data.destination_name,
        latitude         = data.latitude,
        longitude        = data.longitude,
        visit_order      = data.visit_order  or 0,
        nights_stay      = data.nights_stay  or 0,
        description      = data.description,
    )
    db.add(dest)
    db.commit()
    db.refresh(dest)
    return _dest_dict(dest)


@router.delete("/tours/{tour_id}/destinations/{dest_id}", summary="Delete a destination")
async def delete_destination(
    tour_id: int,
    dest_id: int,
    agency:  TravelAgency = Depends(get_current_agency),
    db:      Session      = Depends(get_db),
):
    _get_tour(tour_id, agency.id, db)
    dest = db.query(TourDestination).filter(
        TourDestination.id == dest_id,
        TourDestination.tour_id == tour_id,
    ).first()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found.")
    db.delete(dest)
    db.commit()
    return {"success": True, "message": "Destination deleted."}


# ─────────────────────────────────────────────
# INTERNAL HELPERS  (not exposed as endpoints)
# ─────────────────────────────────────────────

def _get_tour(tour_id: int, agency_id: int, db: Session) -> Tour:
    """Fetch a tour and verify it belongs to this agency."""
    tour = db.query(Tour).filter(Tour.id == tour_id, Tour.agency_id == agency_id).first()
    if not tour:
        raise HTTPException(status_code=404, detail="Tour not found or does not belong to your agency.")
    return tour


def _get_day(day_id: int, tour_id: int, db: Session) -> TourItinerary:
    day = db.query(TourItinerary).filter(
        TourItinerary.id == day_id,
        TourItinerary.tour_id == tour_id,
    ).first()
    if not day:
        raise HTTPException(status_code=404, detail="Itinerary day not found.")
    return day


def _agency_dict(agency: TravelAgency, db: Session) -> dict:
    return {
        "id":              agency.id,
        "name":            agency.name,
        "agency_type":     agency.agency_type,
        "image_url":       agency.image_url,
        "city":            agency.city,
        "address":         agency.address,
        "phone":           agency.phone,
        "email":           agency.email,
        "website":         agency.website,
        "description":     agency.description,
        "specializations": agency.specializations,
        "languages":       agency.languages,
        "rating":          float(agency.rating) if agency.rating else 0.0,
        "tours_count":     db.query(Tour).filter(Tour.agency_id == agency.id).count(),
        "review_count":    db.query(AgencyReview).filter(AgencyReview.agency_id == agency.id).count(),
        "is_verified":     agency.is_verified,
        "is_partner":      agency.is_partner,
        "latitude":        float(agency.latitude)  if agency.latitude  else None,
        "longitude":       float(agency.longitude) if agency.longitude else None,
        "status":          getattr(agency, "status", "approved"),
    }


def _tour_dict(tour: Tour) -> dict:
    return {
        "id":                tour.id,
        "agency_id":         tour.agency_id,
        "tour_name":         tour.tour_name,
        "tour_type":         tour.tour_type,
        "description":       tour.description,
        "duration_days":     tour.duration_days,
        "price":             float(tour.price) if tour.price else None,
        "currency":          tour.currency,
        "max_group_size":    tour.max_group_size,
        "image_url":         tour.image_url,
        "highlights":        tour.highlights,
        "included_services": tour.included_services,
        "excluded_services": tour.excluded_services,
        "difficulty_level":  tour.difficulty_level,
        "best_season":       tour.best_season,
        "is_active":         tour.is_active,
        "status":            getattr(tour, "status", "approved"),
        "rejection_reason":  getattr(tour, "rejection_reason", None),
        "destinations":      [_dest_dict(d) for d in (tour.destinations    or [])],
        "itinerary_days":    [_day_dict(d)  for d in (tour.itinerary_days  or [])],
    }


def _day_dict(day: TourItinerary) -> dict:
    return {
        "id":            day.id,
        "tour_id":       day.tour_id,
        "day_number":    day.day_number,
        "day_title":     day.day_title,
        "activities":    day.activities,
        "meals":         day.meals,
        "accommodation": day.accommodation,
        "destinations":  day.destinations,
        "coordinates":   day.coordinates,
    }


def _dest_dict(dest: TourDestination) -> dict:
    return {
        "id":               dest.id,
        "tour_id":          dest.tour_id,
        "destination_name": dest.destination_name,
        "latitude":         float(dest.latitude)  if dest.latitude  else None,
        "longitude":        float(dest.longitude) if dest.longitude else None,
        "visit_order":      dest.visit_order,
        "nights_stay":      dest.nights_stay,
        "description":      dest.description,
    }