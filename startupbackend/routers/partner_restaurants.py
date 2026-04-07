from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from fastapi import UploadFile, File
import shutil
from pathlib import Path
import uuid

from routers.partner_auth import get_partner_token
from database import get_db
from models.restaurant import Restaurant, RestaurantMenu, Review

router = APIRouter(prefix="/api/partner", tags=["partner-restaurant"])

# ==================== SCHEMAS ====================

class RestaurantUpdate(BaseModel):
    name: str
    description: str
    cuisine_type: str
    phone: str
    website: Optional[str] = None
    image_url: Optional[str] = None

class LocationUpdate(BaseModel):
    address: str
    latitude: float
    longitude: float
    opening_hours: str

class MenuItemCreate(BaseModel):
    item_name: str
    price: float
    category: str
    image_url: Optional[str] = None

class MenuItemUpdate(BaseModel):
    item_name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    image_url: Optional[str] = None

# ==================== HELPER ====================

def check_restaurant_owner(restaurant_id: int, token: dict):
    biz_type = token.get("business_type") or token.get("type")
    biz_id = token.get("record_id") or token.get("id")
    if biz_type != "restaurant" or biz_id != restaurant_id:
        raise HTTPException(status_code=403, detail="Not authorized")

# ==================== ENDPOINTS ====================

@router.get("/restaurant/{restaurant_id}")
async def get_partner_restaurant(
    restaurant_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    check_restaurant_owner(restaurant_id, token)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    return {
        "id": restaurant.id,
        "name": restaurant.name,
        "description": restaurant.description,
        "cuisine_type": restaurant.cuisine_type,
        "phone": restaurant.phone,
        "website": restaurant.website,
        "image_url": restaurant.image_url,
        "address": restaurant.address,
        "latitude": restaurant.latitude,
        "longitude": restaurant.longitude,
        "opening_hours": restaurant.opening_hours,
        "rating": restaurant.rating,
        "is_partner": restaurant.is_partner,
        "status": getattr(restaurant, 'status', 'approved')
    }


@router.put("/restaurant/{restaurant_id}/info")
async def update_restaurant_info(
    restaurant_id: int,
    data: RestaurantUpdate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    check_restaurant_owner(restaurant_id, token)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant.name = data.name
    restaurant.description = data.description
    restaurant.cuisine_type = data.cuisine_type
    restaurant.phone = data.phone
    restaurant.website = data.website
    restaurant.image_url = data.image_url

    if hasattr(restaurant, 'status'):
        restaurant.status = 'pending'

    db.commit()
    db.refresh(restaurant)

    return {
        "success": True,
        "message": "Restaurant updated. Changes are pending admin approval.",
        "status": getattr(restaurant, 'status', 'approved')
    }


@router.put("/restaurant/{restaurant_id}/location")
async def update_restaurant_location(
    restaurant_id: int,
    data: LocationUpdate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    check_restaurant_owner(restaurant_id, token)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    restaurant.address = data.address
    restaurant.latitude = data.latitude
    restaurant.longitude = data.longitude
    restaurant.opening_hours = data.opening_hours

    if hasattr(restaurant, 'status'):
        restaurant.status = 'pending'

    db.commit()
    db.refresh(restaurant)

    return {
        "success": True,
        "message": "Location updated. Changes are pending admin approval.",
        "status": getattr(restaurant, 'status', 'approved')
    }


@router.post("/restaurant/{restaurant_id}/menu")
async def add_menu_item(
    restaurant_id: int,
    data: MenuItemCreate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    check_restaurant_owner(restaurant_id, token)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    menu_item = RestaurantMenu(
        restaurant_id=restaurant_id,
        item_name=data.item_name,
        price=data.price,
        category=data.category,
        image_url=data.image_url
    )

    if hasattr(menu_item, 'status'):
        menu_item.status = 'pending'

    db.add(menu_item)
    db.commit()
    db.refresh(menu_item)

    return {
        "success": True,
        "message": "Menu item added. Pending admin approval.",
        "item": {
            "id": menu_item.id,
            "item_name": menu_item.item_name,
            "price": menu_item.price,
            "category": menu_item.category,
            "image_url": menu_item.image_url,
            "status": getattr(menu_item, 'status', 'approved')
        }
    }


@router.put("/menu/{item_id}")
async def update_menu_item(
    item_id: int,
    data: MenuItemUpdate,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    menu_item = db.query(RestaurantMenu).filter(RestaurantMenu.id == item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Verify this item belongs to the partner's restaurant
    check_restaurant_owner(menu_item.restaurant_id, token)

    if data.item_name is not None:
        menu_item.item_name = data.item_name
    if data.price is not None:
        menu_item.price = data.price
    if data.category is not None:
        menu_item.category = data.category
    if data.image_url is not None:
        menu_item.image_url = data.image_url

    if hasattr(menu_item, 'status'):
        menu_item.status = 'pending'

    db.commit()
    db.refresh(menu_item)

    return {
        "success": True,
        "message": "Menu item updated. Changes are pending admin approval.",
        "status": getattr(menu_item, 'status', 'approved')
    }


@router.delete("/menu/{item_id}")
async def delete_menu_item(
    item_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    menu_item = db.query(RestaurantMenu).filter(RestaurantMenu.id == item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Verify this item belongs to the partner's restaurant
    check_restaurant_owner(menu_item.restaurant_id, token)

    db.delete(menu_item)
    db.commit()

    return {"success": True, "message": "Menu item deleted successfully"}


@router.get("/menu/{item_id}")
async def get_menu_item(
    item_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    menu_item = db.query(RestaurantMenu).filter(RestaurantMenu.id == item_id).first()
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    # Verify this item belongs to the partner's restaurant
    check_restaurant_owner(menu_item.restaurant_id, token)

    return {
        "id": menu_item.id,
        "item_name": menu_item.item_name,
        "price": float(menu_item.price),
        "category": menu_item.category,
        "image_url": menu_item.image_url or None,
        "status": getattr(menu_item, 'status', 'approved')
    }


@router.get("/restaurant/{restaurant_id}/stats")
async def get_restaurant_stats(
    restaurant_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    check_restaurant_owner(restaurant_id, token)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    menu_count = db.query(RestaurantMenu).filter(
        RestaurantMenu.restaurant_id == restaurant_id
    ).count()

    review_count = db.query(Review).filter(
        Review.restaurant_id == restaurant_id
    ).count()

    return {
        "total_restaurants": 1,
        "total_menu_items": menu_count,
        "avg_rating": float(restaurant.rating) if restaurant.rating else 0.0,
        "total_reviews": review_count
    }


@router.get("/restaurant/{restaurant_id}/reviews")
async def get_restaurant_reviews(
    restaurant_id: int,
    token: dict = Depends(get_partner_token),
    db: Session = Depends(get_db)
):
    check_restaurant_owner(restaurant_id, token)

    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")

    reviews = db.query(Review).filter(Review.restaurant_id == restaurant_id).all()

    return [
        {
            "id": review.id,
            "reviewer_name": review.reviewer_name,
            "rating": review.rating,
            "comment": review.comment,
            "created_at": review.created_at.isoformat()
        }
        for review in reviews
    ]


@router.post("/upload-image")
async def upload_partner_image(
    file: UploadFile = File(...),
    token: dict = Depends(get_partner_token)   # just verify token is valid
):
    try:
        allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")

        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > 5 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File too large. Max size is 5MB.")

        upload_dir = Path("static/uploads/partners")
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename

        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        return {"url": f"/static/uploads/partners/{unique_filename}", "filename": unique_filename}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")