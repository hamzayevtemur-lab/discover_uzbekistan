from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt
import os

from database import get_db
from models.restaurant import Restaurant
from models.hotel import Hotel

router = APIRouter(prefix="/api/partner", tags=["partner-auth"])

SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = "HS256"
security = HTTPBearer(auto_error=False)

class LoginRequest(BaseModel):
    email: str
    password: str

# ── TOKEN CREATION ──
def create_partner_token(email: str, business_type: str, record_id: int) -> str:
    payload = {
        "sub": email,
        "type": business_type,
        "id": record_id,
        "exp": datetime.utcnow() + timedelta(days=30)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ── TOKEN VERIFICATION (reusable dependency) ──
def get_partner_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired. Please log in again.")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token.")

# ── OWNERSHIP CHECK HELPERS ──
def require_hotel_owner(hotel_id: int, token: dict = Depends(get_partner_token)):
    if token.get("type") != "hotel":
        raise HTTPException(status_code=403, detail="Not a hotel partner account.")
    if token.get("id") != hotel_id:
        raise HTTPException(status_code=403, detail="You can only modify your own hotel.")
    return token

def require_restaurant_owner(restaurant_id: int, token: dict = Depends(get_partner_token)):
    if token.get("type") != "restaurant":
        raise HTTPException(status_code=403, detail="Not a restaurant partner account.")
    if token.get("id") != restaurant_id:
        raise HTTPException(status_code=403, detail="You can only modify your own restaurant.")
    return token

# ── LOGIN ──
@router.post("/login")
async def partner_login(credentials: LoginRequest, db: Session = Depends(get_db)):
    import hashlib
    hashed = hashlib.sha256(credentials.password.encode()).hexdigest()

    # Try restaurant
    restaurant = db.query(Restaurant).filter(
        Restaurant.partner_email == credentials.email,
        Restaurant.is_partner == True,
        Restaurant.partner_password == hashed
    ).first()

    if restaurant:
        token = create_partner_token(credentials.email, "restaurant", restaurant.id)
        return {
            "access_token": token,
            "token_type": "bearer",
            "partner_type": "restaurant",
            "id": restaurant.id,
            "name": restaurant.name
        }

    # Try hotel
    hotel = db.query(Hotel).filter(
        Hotel.partner_email == credentials.email,
        Hotel.is_partner == True,
        Hotel.partner_password == hashed
    ).first()

    if hotel:
        token = create_partner_token(credentials.email, "hotel", hotel.id)
        return {
            "access_token": token,
            "token_type": "bearer",
            "partner_type": "hotel",
            "id": hotel.id,
            "name": hotel.name
        }

    raise HTTPException(status_code=401, detail="Invalid email or password.")