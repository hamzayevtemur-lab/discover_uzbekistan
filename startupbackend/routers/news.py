"""
routers/news.py  — v2
News & Events router with extra contact/location fields
"""
from __future__ import annotations
from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, Numeric
from sqlalchemy.orm import Session
from database import Base, get_db

router = APIRouter(prefix="/api/news", tags=["news"])

# ── Model ─────────────────────────────────────────────────────
class NewsEvent(Base):
    __tablename__ = "news_events"
    id            = Column(Integer, primary_key=True, index=True)
    title         = Column(String(255), nullable=False)
    description   = Column(Text)
    image_url     = Column(String(500))
    category      = Column(String(50),  default="news")
    location_name = Column(String(255))
    location_lat  = Column(Numeric(10, 6))
    location_lng  = Column(Numeric(10, 6))
    phone         = Column(String(50))
    telegram      = Column(String(100))
    instagram     = Column(String(100))
    start_date    = Column(Date, nullable=False)
    end_date      = Column(Date)
    is_active     = Column(Boolean, default=True)
    created_at    = Column(DateTime, default=datetime.utcnow)
    created_by    = Column(String(100))

# ── Schemas ───────────────────────────────────────────────────
class NewsCreate(BaseModel):
    title:         str
    description:   Optional[str]   = None
    image_url:     Optional[str]   = None
    category:      Optional[str]   = "news"
    location_name: Optional[str]   = None
    location_lat:  Optional[float] = None
    location_lng:  Optional[float] = None
    phone:         Optional[str]   = None
    telegram:      Optional[str]   = None
    instagram:     Optional[str]   = None
    start_date:    date
    end_date:      Optional[date]  = None
    is_active:     bool            = True
    created_by:    Optional[str]   = None

class NewsUpdate(NewsCreate):
    pass

def _to_dict(n: NewsEvent) -> dict:
    return {
        "id":            n.id,
        "title":         n.title,
        "description":   n.description,
        "image_url":     n.image_url,
        "category":      n.category,
        "location_name": n.location_name,
        "location_lat":  float(n.location_lat)  if n.location_lat  else None,
        "location_lng":  float(n.location_lng)  if n.location_lng  else None,
        "phone":         n.phone,
        "telegram":      n.telegram,
        "instagram":     n.instagram,
        "start_date":    n.start_date.isoformat() if n.start_date else None,
        "end_date":      n.end_date.isoformat()   if n.end_date   else None,
        "is_active":     bool(n.is_active),
        "created_at":    n.created_at.isoformat() if n.created_at else None,
        "created_by":    n.created_by,
    }

# ── Public — index page ───────────────────────────────────────
@router.get("/active")
async def get_active_news(db: Session = Depends(get_db)):
    today = date.today()
    # Get all active items
    active_items = db.query(NewsEvent).filter(
        NewsEvent.is_active == 1,
    ).order_by(NewsEvent.start_date.desc()).all()

    # Filter out expired
    result = [n for n in active_items
              if not (n.end_date and n.end_date < today)]

    # If no active items, show last 5 expired ones
    if not result:
        expired = db.query(NewsEvent).filter(
            NewsEvent.is_active == 1,
            NewsEvent.end_date != None,
            NewsEvent.end_date < today,
        ).order_by(NewsEvent.end_date.desc()).limit(5).all()
        result = expired

    return [_to_dict(n) for n in result]

# ── Admin endpoints ───────────────────────────────────────────
@router.get("/admin/all")
async def get_all_news(db: Session = Depends(get_db)):
    items = db.query(NewsEvent).order_by(NewsEvent.created_at.desc()).all()
    return [_to_dict(n) for n in items]

@router.post("/admin/create", status_code=201)
async def create_news(data: NewsCreate, db: Session = Depends(get_db)):
    item = NewsEvent(**{k: v for k, v in data.dict().items()})
    item.is_active = bool(data.is_active)
    db.add(item)
    db.commit()
    db.refresh(item)
    return _to_dict(item)

@router.put("/admin/{item_id}")
async def update_news(item_id: int, data: NewsUpdate, db: Session = Depends(get_db)):
    item = db.query(NewsEvent).filter(NewsEvent.id == item_id).first()
    if not item:
        raise HTTPException(404, "News item not found.")
    for field, value in data.dict(exclude_unset=True).items():
        setattr(item, field, value)
    item.is_active = bool(item.is_active)
    db.commit()
    db.refresh(item)
    return _to_dict(item)

@router.delete("/admin/{item_id}")
async def delete_news(item_id: int, db: Session = Depends(get_db)):
    item = db.query(NewsEvent).filter(NewsEvent.id == item_id).first()
    if not item:
        raise HTTPException(404, "News item not found.")
    db.delete(item)
    db.commit()
    return {"success": True, "message": "Deleted."}

@router.post("/admin/upload-image")
async def upload_news_image(file: UploadFile = File(...)):
    import shutil, uuid
    from pathlib import Path
    allowed = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
    if file.content_type not in allowed:
        raise HTTPException(400, "Invalid file type.")
    upload_dir = Path("static/uploads/news")
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}{Path(file.filename).suffix}"
    with (upload_dir / filename).open("wb") as buf:
        shutil.copyfileobj(file.file, buf)
    return {"url": f"/static/uploads/news/{filename}"}