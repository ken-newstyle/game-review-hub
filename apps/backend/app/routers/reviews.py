from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from ..db import get_db
from .. import models, schemas
from ..auth import get_current_user


router = APIRouter()


@router.get("/reviews", response_model=List[schemas.ReviewRead])
def list_reviews(
    game_id: int = Query(..., description="Filter by game id"),
    db: Session = Depends(get_db),
):
    stmt = select(models.Review).where(models.Review.game_id == game_id).order_by(models.Review.created_at.desc())
    reviews = db.execute(stmt).scalars().all()
    return reviews


@router.post("/reviews", response_model=schemas.ReviewRead, status_code=201)
def create_review(
    payload: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Ensure target game exists
    game = db.get(models.Game, payload.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    review = models.Review(
        game_id=payload.game_id,
        rating=payload.rating,
        comment=payload.comment,
    )
    # ユーザー関連（カラムは後方互換のためオプショナル）
    if hasattr(models.Review, "user_id"):
        setattr(review, "user_id", current_user.id)
    db.add(review)
    db.commit()
    db.refresh(review)
    return review
