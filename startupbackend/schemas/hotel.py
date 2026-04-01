from pydantic import BaseModel
from typing import Optional


class HotelBase(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    rating: float = 0.0
    review_count: int = 0
    image_url: Optional[str] = None
    type: Optional[str] = None
    phone: Optional[str] = None
    opening_hours: Optional[str] = None
    is_partner: bool = False
    website: Optional[str] = None
    offer: Optional[str] = None


class HotelOut(HotelBase):
    id: int

    class Config:
        from_attributes = True


class HotelRoomOut(BaseModel):
    id: int
    hotel_id: int
    room_type: str
    price: float
    capacity: Optional[int] = None
    image_url: Optional[str] = None
    description: Optional[str] = None
    available: bool = True

    class Config:
        from_attributes = True