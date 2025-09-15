from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, conint


class GameBase(BaseModel):
    title: str = Field(..., max_length=255)
    platform: str = Field(..., max_length=100)
    released_on: Optional[date] = None


class GameCreate(GameBase):
    pass


class GameRead(GameBase):
    id: int
    created_at: datetime
    avg_rating: float = 0.0

    class Config:
        from_attributes = True


class ReviewBase(BaseModel):
    game_id: int
    rating: conint(ge=1, le=5)
    comment: Optional[str] = None


class ReviewCreate(ReviewBase):
    pass


class ReviewRead(ReviewBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

