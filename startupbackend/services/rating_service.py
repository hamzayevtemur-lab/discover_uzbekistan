from sqlalchemy.orm import Session
from sqlalchemy import func
from models import Restaurant, Review, Hotel, HotelReview, Attraction, AttractionReview


def update_restaurant_rating(db: Session, restaurant_id: int):
    """Recalculate and save average rating after new review"""
    result = (
        db.query(func.avg(Review.rating).label("avg_rating"))
         .filter(Review.restaurant_id == restaurant_id)
         .one()
    )
    avg_rating = result.avg_rating or 0
    count = db.query(Review).filter(Review.restaurant_id == restaurant_id).count()

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if restaurant:
        restaurant.rating = round(float(avg_rating), 1)
        db.commit()


def update_hotel_rating(db: Session, hotel_id: int):
    """Recalculate and save average rating after new hotel review"""
    result = (
        db.query(func.avg(HotelReview.rating).label("avg_rating"))
        .filter(HotelReview.hotel_id == hotel_id)
        .one()
    )
    avg_rating = result.avg_rating or 0
    count = db.query(HotelReview).filter(HotelReview.hotel_id == hotel_id).count()

    hotel = db.query(Hotel).filter(Hotel.id == hotel_id).first()
    if hotel:
        hotel.rating = round(float(avg_rating), 1)
        hotel.review_count = count
        db.commit()


def update_attraction_rating(db: Session, attraction_id: int):
    """Recalculate and save average rating after new attraction review"""
    result = (
        db.query(func.avg(AttractionReview.rating).label("avg_rating"))
        .filter(AttractionReview.attraction_id == attraction_id)
        .one()
    )
    avg_rating = result.avg_rating or 0
    count = db.query(AttractionReview).filter(AttractionReview.attraction_id == attraction_id).count()

    attraction = db.query(Attraction).filter(Attraction.id == attraction_id).first()
    if attraction:
        attraction.rating = round(float(avg_rating), 1)
        attraction.review_count = count
        db.commit()