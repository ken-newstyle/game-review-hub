from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, conint, field_validator, EmailStr


class GameBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    platform: str = Field(..., min_length=1, max_length=100)
    released_on: Optional[date] = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("title must not be blank")
        return v

    @field_validator("platform")
    @classmethod
    def normalize_platform(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("platform must not be blank")
        return v


class GameCreate(GameBase):
    pass


class GameRead(GameBase):
    id: int
    created_at: datetime
    avg_rating: float = 0.0

    class Config:
        from_attributes = True


class GamePage(BaseModel):
    items: list[GameRead]
    total: int
    page: int
    limit: int


class ReviewBase(BaseModel):
    game_id: int
    rating: conint(ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


class ReviewCreate(ReviewBase):
    pass


class ReviewRead(ReviewBase):
    id: int
    created_at: datetime
    # 認証後に付与される（後方互換のためOptional）
    user_id: int | None = None

    class Config:
        from_attributes = True


class UserBase(BaseModel):
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserRead(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
