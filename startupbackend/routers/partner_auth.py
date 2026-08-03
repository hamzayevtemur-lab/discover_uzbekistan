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

import os
SECRET_KEY = os.environ.get("SECRET_KEY", "changeme-in-production")

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


def require_hotel_owner(
    hotel_id: int,
    authorization: str = Security(_auth_header),
    db: Session = Depends(get_db)
) -> dict:
    """
    Dependency for hotel partner routes.
    Validates JWT, ensures the partner is a hotel type, AND confirms
    the token's record_id matches the hotel_id in the URL — this last
    check is what stops one partner from touching another partner's
    hotel by changing the ID in the request.
    """
    payload = get_partner_token(authorization)
    biz_type = payload.get("business_type") or payload.get("type")
    if biz_type != "hotel":
        raise HTTPException(status_code=403, detail="Hotel access required.")
    if payload.get("record_id") != hotel_id:
        raise HTTPException(status_code=403, detail="Not authorized for this hotel.")
    return payload


def require_restaurant_owner(
    authorization: str = Security(_auth_header),
) -> dict:
    """
    Dependency for restaurant partner routes.
    Validates JWT and ensures the partner is a restaurant type.
    """
    payload = get_partner_token(authorization)
    biz_type = payload.get("business_type") or payload.get("type")
    if biz_type != "restaurant":
        raise HTTPException(status_code=403, detail="Restaurant access required.")
    return payload


def require_agency_owner(
    authorization: str = Security(_auth_header),
) -> dict:
    """
    Dependency for travel agency partner routes.
    """
    payload = get_partner_token(authorization)
    biz_type = payload.get("business_type") or payload.get("type")
    if biz_type != "travel_agency":
        raise HTTPException(status_code=403, detail="Agency access required.")
    return payload


def require_guide_owner(
    authorization: str = Security(_auth_header),
) -> dict:
    """
    Dependency for guide partner routes.
    """
    payload = get_partner_token(authorization)
    biz_type = payload.get("business_type") or payload.get("type")
    if biz_type != "guide":
        raise HTTPException(status_code=403, detail="Guide access required.")
    return payload


