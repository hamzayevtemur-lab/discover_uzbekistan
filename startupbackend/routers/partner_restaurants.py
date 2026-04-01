from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
from fastapi import UploadFile, File
import shutil
from pathlib import Path
import uuid

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

# ==================== ENDPOINTS ====================

@router.get("/restaurant/{restaurant_id}")
async def get_partner_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    """Get restaurant data for a partner"""
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
    db: Session = Depends(get_db)
):
    """Update restaurant basic information - sets to pending for approval"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Update fields
    restaurant.name = data.name
    restaurant.description = data.description
    restaurant.cuisine_type = data.cuisine_type
    restaurant.phone = data.phone
    restaurant.website = data.website
    restaurant.image_url = data.image_url
    
    # Set to pending if status column exists
    if hasattr(restaurant, 'status'):
        restaurant.status = 'pending'
    
    db.commit()
    db.refresh(restaurant)
    
    return {
        "success": True, 
        "message": "Restaurant updated successfully. Changes are pending admin approval.",
        "status": getattr(restaurant, 'status', 'approved')
    }


@router.put("/restaurant/{restaurant_id}/location")
async def update_restaurant_location(
    restaurant_id: int,
    data: LocationUpdate,
    db: Session = Depends(get_db)
):
    """Update restaurant location and hours - sets to pending for approval"""
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    restaurant.address = data.address
    restaurant.latitude = data.latitude
    restaurant.longitude = data.longitude
    restaurant.opening_hours = data.opening_hours
    
    # Set to pending if status column exists
    if hasattr(restaurant, 'status'):
        restaurant.status = 'pending'
    
    db.commit()
    db.refresh(restaurant)
    
    return {
        "success": True, 
        "message": "Location updated successfully. Changes are pending admin approval.",
        "status": getattr(restaurant, 'status', 'approved')
    }


@router.post("/restaurant/{restaurant_id}/menu")
async def add_menu_item(
    restaurant_id: int,
    data: MenuItemCreate,
    db: Session = Depends(get_db)
):
    """Add a new menu item - sets to pending for approval"""
    # Verify restaurant exists
    restaurant = db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    
    # Create menu item with pending status
    menu_item = RestaurantMenu(
        restaurant_id=restaurant_id,
        item_name=data.item_name,
        price=data.price,
        category=data.category,
        image_url=data.image_url
    )
    
    # Set to pending if status column exists
    if hasattr(menu_item, 'status'):
        menu_item.status = 'pending'
    
    db.add(menu_item)
    db.commit()
    db.refresh(menu_item)
    
    return {
        "success": True,
        "message": "Menu item added successfully. Pending admin approval.",
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
    db: Session = Depends(get_db)
):
    """Update a menu item - sets to pending for approval"""
    menu_item = db.query(RestaurantMenu).filter(RestaurantMenu.id == item_id).first()
    
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    # Update only provided fields
    if data.item_name is not None:
        menu_item.item_name = data.item_name
    if data.price is not None:
        menu_item.price = data.price
    if data.category is not None:
        menu_item.category = data.category
    if data.image_url is not None:
        menu_item.image_url = data.image_url
    
    # Set to pending if status column exists
    if hasattr(menu_item, 'status'):
        menu_item.status = 'pending'
    
    db.commit()
    db.refresh(menu_item)
    
    return {
        "success": True, 
        "message": "Menu item updated successfully. Changes are pending admin approval.",
        "status": getattr(menu_item, 'status', 'approved')
    }


@router.delete("/menu/{item_id}")     # Delete a menu item
async def delete_menu_item(item_id: int, db: Session = Depends(get_db)):
    """Delete a menu item"""
    menu_item = db.query(RestaurantMenu).filter(RestaurantMenu.id == item_id).first()
    
    if not menu_item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    db.delete(menu_item)
    db.commit()
    
    return {"success": True, "message": "Menu item deleted successfully"}

@router.get("/menu/{item_id}")       # Get a single menu item by ID for edit form
async def get_menu_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    """
    Get a single menu item by ID (needed for edit form)
    """
    menu_item = db.query(RestaurantMenu).filter(RestaurantMenu.id == item_id).first()
    
    if not menu_item:
        raise HTTPException(
            status_code=404,
            detail="Menu item not found"
        )
    
    return {
        "id": menu_item.id,
        "item_name": menu_item.item_name,
        "price": float(menu_item.price),  # ensure it's a number
        "category": menu_item.category,
        "image_url": menu_item.image_url or None,
        # optional: include status if you use it
        "status": getattr(menu_item, 'status', 'approved')
    }


@router.get("/restaurant/{restaurant_id}/stats")
async def get_restaurant_stats(restaurant_id: int, db: Session = Depends(get_db)):
    """Get statistics for partner dashboard"""
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
async def get_restaurant_reviews(restaurant_id: int, db: Session = Depends(get_db)):
    """Get reviews for a partner restaurant"""
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
async def upload_partner_image(file: UploadFile = File(...)):
    """Upload an image for partner (restaurant/menu items)"""
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/jpg", "image/webp", "image/gif"]
        if file.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="Invalid file type. Only images allowed.")
        
        # Validate file size (max 5MB)
        file.file.seek(0, 2)  # Move to end of file
        file_size = file.file.tell()  # Get file size
        file.file.seek(0)  # Reset to beginning
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            raise HTTPException(status_code=400, detail="File too large. Max size is 5MB.")
        
        # Create uploads directory if it doesn't exist
        upload_dir = Path("static/uploads/partners")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = upload_dir / unique_filename
        
        # Save file
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Return the URL
        image_url = f"/static/uploads/partners/{unique_filename}"
        return {"url": image_url, "filename": unique_filename}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload image: {str(e)}")