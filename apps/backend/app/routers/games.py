from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ..db import get_db
from .. import models, schemas


router = APIRouter()


@router.get("/games", response_model=List[schemas.GameRead])
def list_games(db: Session = Depends(get_db)):
    stmt = (
        select(
            models.Game,
            func.coalesce(func.avg(models.Review.rating), 0).label("avg_rating"),
        )
        .outerjoin(models.Review, models.Review.game_id == models.Game.id)
        .group_by(models.Game.id)
        .order_by(models.Game.created_at.desc())
    )
    rows = db.execute(stmt).all()
    return [
        schemas.GameRead(
            id=g.id,
            title=g.title,
            platform=g.platform,
            released_on=g.released_on,
            created_at=g.created_at,
            avg_rating=float(avg) if avg is not None else 0.0,
        )
        for g, avg in rows
    ]


@router.post("/games", response_model=schemas.GameRead, status_code=201)
def create_game(payload: schemas.GameCreate, db: Session = Depends(get_db)):
    game = models.Game(
        title=payload.title,
        platform=payload.platform,
        released_on=payload.released_on,
    )
    db.add(game)
    db.commit()
    db.refresh(game)
    return schemas.GameRead(
        id=game.id,
        title=game.title,
        platform=game.platform,
        released_on=game.released_on,
        created_at=game.created_at,
        avg_rating=0.0,
    )

