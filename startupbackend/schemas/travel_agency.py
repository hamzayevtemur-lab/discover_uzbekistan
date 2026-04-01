from pydantic import BaseModel, validator
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal


# ═══════════════════════════════════════
# HELPER
# ═══════════════════════════════════════

def _list_or_empty(v):
    """Return [] if value is None, otherwise the value."""
    return v if v is not None else []


# ═══════════════════════════════════════
# AGENCY
# ═══════════════════════════════════════

class TravelAgencyCreate(BaseModel):
    name: str
    agency_type: Optional[str] = "Tour Operator"
    logo_url: Optional[str] = None
    image_url: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    specializations: Optional[List[Any]] = []
    languages: Optional[str] = "English, Russian, Uzbek"
    is_verified: Optional[bool] = False
    is_partner: Optional[bool] = False
    is_featured: Optional[bool] = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @validator('specializations', pre=True, always=True)
    def coerce_specializations(cls, v):
        return _list_or_empty(v)


class TravelAgencyOut(BaseModel):
    id: int
    name: str
    agency_type: Optional[str] = None
    logo_url: Optional[str] = None
    image_url: Optional[str] = None
    city: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    description: Optional[str] = None
    specializations: Optional[List[Any]] = []
    languages: Optional[str] = None
    rating: Optional[float] = 0.0
    tours_count: Optional[int] = 0
    is_verified: Optional[bool] = False
    is_partner: Optional[bool] = False
    is_featured: Optional[bool] = False
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = "approved"
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @validator('specializations', pre=True, always=True)
    def coerce_specializations(cls, v):
        return _list_or_empty(v)

    @validator('rating', pre=True, always=True)
    def coerce_rating(cls, v):
        if v is None:
            return 0.0
        try:
            return float(v)
        except Exception:
            return 0.0

    class Config:
        from_attributes = True   # Pydantic v2
        # orm_mode = True         # Pydantic v1 — uncomment if needed


# ═══════════════════════════════════════
# TOUR
# ═══════════════════════════════════════

class TourCreate(BaseModel):
    agency_id: int
    tour_name: str
    tour_type: Optional[str] = None
    description: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = "USD"
    max_group_size: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = True
    highlights: Optional[List[Any]] = []
    included_services: Optional[List[Any]] = []
    excluded_services: Optional[List[Any]] = []
    difficulty_level: Optional[str] = None
    best_season: Optional[str] = None
    status: Optional[str] = "approved"

    @validator('highlights', 'included_services', 'excluded_services', pre=True, always=True)
    def coerce_lists(cls, v):
        return _list_or_empty(v)


class TourOut(BaseModel):
    id: int
    agency_id: int
    tour_name: str
    tour_type: Optional[str] = None
    description: Optional[str] = None
    duration_days: Optional[int] = None
    price: Optional[float] = None
    currency: Optional[str] = "USD"
    max_group_size: Optional[int] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = True
    highlights: Optional[List[Any]] = []
    included_services: Optional[List[Any]] = []
    excluded_services: Optional[List[Any]] = []
    difficulty_level: Optional[str] = None
    best_season: Optional[str] = None
    status: Optional[str] = "approved"
    rejection_reason: Optional[str] = None
    created_at: Optional[datetime] = None

    @validator('highlights', 'included_services', 'excluded_services', pre=True, always=True)
    def coerce_lists(cls, v):
        return _list_or_empty(v)

    @validator('price', pre=True, always=True)
    def coerce_price(cls, v):
        if v is None:
            return None
        try:
            return float(v)
        except Exception:
            return None

    class Config:
        from_attributes = True
        # orm_mode = True


# ═══════════════════════════════════════
# ITINERARY IMAGE
# ═══════════════════════════════════════

# ═══════════════════════════════════════
# TOUR ITINERARY
# ═══════════════════════════════════════

class TourItineraryOut(BaseModel):
    id: int
    tour_id: int
    day_number: int
    day_title: str
    activities: str
    meals: Optional[str] = None
    accommodation: Optional[str] = None
    destinations: Optional[List[Any]] = []
    coordinates: Optional[List[Any]] = []
    image_url: Optional[str] = None          # first/primary photo (used for map marker)
    images: Optional[List[Any]] = []         # all photos for this day

    @validator('destinations', 'coordinates', 'images', pre=True, always=True)
    def coerce_lists(cls, v):
        return _list_or_empty(v)

    class Config:
        from_attributes = True
        # orm_mode = True


# ═══════════════════════════════════════
# TOUR DESTINATION
# ═══════════════════════════════════════

class TourDestinationOut(BaseModel):
    id: int
    tour_id: int
    destination_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    visit_order: Optional[int] = None
    nights_stay: Optional[int] = 0
    description: Optional[str] = None
    image_url: Optional[str] = None          # stored directly on this row

    @validator('latitude', 'longitude', pre=True, always=True)
    def coerce_coords(cls, v):
        if v is None:
            return None
        try:
            return float(v)
        except Exception:
            return None

    class Config:
        from_attributes = True
        # orm_mode = True


# ═══════════════════════════════════════
# TOUR DETAILED (includes itinerary + destinations)
# ═══════════════════════════════════════

class TourDetailedOut(TourOut):
    itinerary_days: Optional[List[TourItineraryOut]] = []
    destinations: Optional[List[TourDestinationOut]] = []

    @validator('itinerary_days', 'destinations', pre=True, always=True)
    def coerce_nested_lists(cls, v):
        return _list_or_empty(v)

    class Config:
        from_attributes = True
        # orm_mode = True


# ═══════════════════════════════════════
# REVIEWS
# ═══════════════════════════════════════

class AgencyReviewCreate(BaseModel):
    agency_id: int
    tourist_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    tour_taken: Optional[str] = None


class AgencyReviewOut(BaseModel):
    id: int
    agency_id: int
    tourist_name: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    tour_taken: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        # orm_mode = True