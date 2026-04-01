from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class RestaurantBase(BaseModel):
    name: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    rating: Optional[float] = None
    image_url: Optional[str] = None
    cuisine_type: Optional[str] = None
    phone: Optional[str] = None
    opening_hours: Optional[str] = None
    is_partner: bool = False
    website: Optional[str] = None


class RestaurantOut(RestaurantBase):
    id: int
    review_count: int = 0

    class Config:
        from_attributes = True


class MenuItemOut(BaseModel):
    id: int
    item_name: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    category: Optional[str] = None

    class Config:
        from_attributes = True