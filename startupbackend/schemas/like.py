from pydantic import BaseModel

class LikeRequest(BaseModel):
    page_id: str
    user_id: str  # For frontend tracking only

class LikeResponse(BaseModel):
    page_id: str
    like_count: int