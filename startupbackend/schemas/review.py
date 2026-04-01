from pydantic import BaseModel
from datetime import datetime


class ReviewCreate(BaseModel):
    restaurant_id: int
    reviewer_name: str
    rating: int   # we'll validate 1–5 in the function
    comment: str


class ReviewOut(BaseModel):
    id: int
    reviewer_name: str
    rating: int
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True


class HotelReviewCreate(BaseModel):
    hotel_id: int
    reviewer_name: str
    rating: int
    comment: str


class HotelReviewOut(BaseModel):
    id: int
    reviewer_name: str
    rating: int
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True


class AttractionReviewCreate(BaseModel):
    attraction_id: int
    reviewer_name: str
    rating: int
    comment: str


class AttractionReviewOut(BaseModel):
    id: int
    reviewer_name: str
    rating: int
    comment: str
    created_at: datetime

    class Config:
        from_attributes = True