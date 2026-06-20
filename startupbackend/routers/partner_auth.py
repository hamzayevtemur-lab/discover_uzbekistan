# routers/partner_auth.py
# COMPLETE VERSION - login + get_partner_token dependency

from fastapi import APIRouter, Depends, HTTPException, Security
from fastapi.security import APIKeyHeader
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from jose import jwt, JWTError

from database import get_db
from models.restaurant import Restaurant
from models.hotel import Hotel

router = APIRouter(prefix="/api/partner", tags=["partner-auth"])

SECRET_KEY = "my-secret-key-change-in-production-123"
ALGORITHM  = "HS256"

# ── Token header extractor ────────────────────────────────────
_auth_header = APIKeyHeader(name="Authorization", auto_error=False)

def get_partner_token(
    authorization: str = Security(_auth_header),
) -> dict:
    """
    Dependency used by all partner routers.
    Extracts and validates the JWT from the Authorization header.
    Returns the decoded token payload as a dict.
    """
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated.")

    # Strip "Bearer " prefix if present
    token = authorization
    if authorization.lower().startswith("bearer "):
        token = authorization[7:]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")


# ── Login schema ──────────────────────────────────────────────
class LoginRequest(BaseModel):
    email:    str
    password: str


# ── Login endpoint ────────────────────────────────────────────
@router.post("/login")
async def partner_login(
    credentials: LoginRequest,
    db: Session = Depends(get_db)
):
    """
    Partner login for restaurants, hotels, travel agencies and guides.
    Checks each partner table in order.
    """

    # ── Restaurant ────────────────────────────────────────────
    restaurant = db.query(Restaurant).filter(
        Restaurant.partner_email == credentials.email,
        Restaurant.is_partner    == True
    ).first()

    if restaurant and restaurant.partner_password == credentials.password:
        token = jwt.encode(
            {
                "email":         credentials.email,
                "type":          "restaurant",
                "business_type": "restaurant",
                "id":            restaurant.id,
                "record_id":     restaurant.id,
                "exp":           datetime.utcnow() + timedelta(days=30)
            },
            SECRET_KEY,
            algorithm=ALGORITHM
        )
        return {
            "access_token": token,
            "token_type":   "bearer",
            "partner_type": "restaurant",
            "id":           restaurant.id,
            "name":         restaurant.name
        }

    # ── Hotel ─────────────────────────────────────────────────
    hotel = db.query(Hotel).filter(
        Hotel.partner_email == credentials.email,
        Hotel.is_partner    == True
    ).first()

    if hotel and hotel.partner_password == credentials.password:
        token = jwt.encode(
            {
                "email":         credentials.email,
                "type":          "hotel",
                "business_type": "hotel",
                "id":            hotel.id,
                "record_id":     hotel.id,
                "exp":           datetime.utcnow() + timedelta(days=30)
            },
            SECRET_KEY,
            algorithm=ALGORITHM
        )
        return {
            "access_token": token,
            "token_type":   "bearer",
            "partner_type": "hotel",
            "id":           hotel.id,
            "name":         hotel.name
        }

    # ── Travel Agency ─────────────────────────────────────────
    try:
        from models.travel_agency import TravelAgency
        agency = db.query(TravelAgency).filter(
            TravelAgency.partner_email == credentials.email,
            TravelAgency.is_partner    == True
        ).first()
        if agency and agency.partner_password == credentials.password:
            token = jwt.encode(
                {
                    "email":         credentials.email,
                    "type":          "travel_agency",
                    "business_type": "travel_agency",
                    "id":            agency.id,
                    "record_id":     agency.id,
                    "exp":           datetime.utcnow() + timedelta(days=30)
                },
                SECRET_KEY,
                algorithm=ALGORITHM
            )
            return {
                "access_token": token,
                "token_type":   "bearer",
                "partner_type": "travel_agency",
                "id":           agency.id,
                "name":         agency.name
            }
    except Exception:
        pass

    # ── Guide ─────────────────────────────────────────────────
    try:
        from routers.guides import Guide
        guide = db.query(Guide).filter(
            Guide.email     == credentials.email,
            Guide.is_active == True
        ).first()
        if guide and guide.password_hash == credentials.password:
            token = jwt.encode(
                {
                    "email":         credentials.email,
                    "type":          "guide",
                    "business_type": "guide",
                    "id":            guide.id,
                    "record_id":     guide.id,
                    "exp":           datetime.utcnow() + timedelta(days=30)
                },
                SECRET_KEY,
                algorithm=ALGORITHM
            )
            return {
                "access_token": token,
                "token_type":   "bearer",
                "partner_type": "guide",
                "id":           guide.id,
                "name":         guide.name
            }
    except Exception:
        pass

    # ── No match ──────────────────────────────────────────────
    raise HTTPException(
        status_code=401,
        detail="Invalid email or password. Please check your credentials."
    )