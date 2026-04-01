# services/__init__.py

from .rating_service import (
    update_restaurant_rating,
    update_hotel_rating,
    update_attraction_rating
)


__all__ = [
    # Rating services
    "update_restaurant_rating",
    "update_hotel_rating",
    "update_attraction_rating",
    
    # Like services
    "get_place_likes",
    "toggle_like",
    "check_user_has_liked",
    "get_all_likes",
    "get_top_liked_places",  # ← ADD THIS LINE
]