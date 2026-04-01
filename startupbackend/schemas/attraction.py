from pydantic import BaseModel
from typing import Optional


class AttractionBase(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    rating: float = 0.0
    review_count: int = 0
    image_url: Optional[str] = None
    category: Optional[str] = None
    phone: Optional[str] = None
    opening_hours: Optional[str] = None
    entry_fee: Optional[str] = None
    website: Optional[str] = None
    is_partner: bool = False
    year_built: Optional[str] = None
    historical_period: Optional[str] = None


class AttractionOut(AttractionBase):
    id: int

    class Config:
        from_attributes = True


class TimelineEventOut(BaseModel):
    id: int
    year: str
    event_title: str
    event_description: str

    class Config:
        from_attributes = True


class GalleryImageOut(BaseModel):
    id: int
    image_url: str
    caption: Optional[str] = None

    class Config:
        from_attributes = True