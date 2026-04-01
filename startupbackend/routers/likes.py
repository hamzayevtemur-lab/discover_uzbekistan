from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.like import Like
from schemas.like import LikeRequest, LikeResponse

router = APIRouter(prefix="/api/likes", tags=["likes"])

@router.post("/{place_id}/add", response_model=LikeResponse)
async def add_like(place_id: str, request: LikeRequest, db: Session = Depends(get_db)):
    """Add a like to a place"""
    like = db.query(Like).filter(Like.page_id == place_id).first()
    
    if not like:
        like = Like(page_id=place_id, like_count=1)
        db.add(like)
    else:
        like.like_count += 1
    
    db.commit()
    db.refresh(like)
    
    return LikeResponse(page_id=place_id, like_count=like.like_count)

@router.post("/{place_id}/remove", response_model=LikeResponse)
async def remove_like(place_id: str, request: LikeRequest, db: Session = Depends(get_db)):
    """Remove a like from a place"""
    like = db.query(Like).filter(Like.page_id == place_id).first()
    
    if not like or like.like_count <= 0:
        raise HTTPException(status_code=400, detail="No likes to remove")
    
    like.like_count -= 1
    db.commit()
    db.refresh(like)
    
    return LikeResponse(page_id=place_id, like_count=like.like_count)

@router.get("/all")
async def get_all_likes(db: Session = Depends(get_db)):
    """Get all likes for all places"""
    likes = db.query(Like).order_by(Like.like_count.desc()).all()
    return [{"page_id": l.page_id, "like_count": l.like_count} for l in likes]

@router.get("/{place_id}")
async def get_place_likes(place_id: str, db: Session = Depends(get_db)):
    """Get likes for a specific place"""
    like = db.query(Like).filter(Like.page_id == place_id).first()
    return {"page_id": place_id, "like_count": like.like_count if like else 0}
