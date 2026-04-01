from .restaurants import router as restaurants_router
from .hotels import router as hotels_router
from .attractions import router as attractions_router
from .likes import router as likes_router
from .admin import router as admin_router
from .partner_restaurants import router as partner_restaurants_router  
from .admin_approval import router as admin_approval_router 
from .partner_auth import router as partner_auth_router
from .partner_hotels import router as partner_hotels_router




__all__ = [
    "restaurants_router",
    "hotels_router",
    "attractions_router",
    "likes_router",
    "admin_router",
    "partner_restaurants_router",
    "admin_approval_router",
    "partner_auth_router",
    "partner_hotels_router",
]