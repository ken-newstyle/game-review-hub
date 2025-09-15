from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ..db import get_db
from .. import models, schemas


router = APIRouter()


@router.get("/games", response_model=schemas.GamePage)
def list_games(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    sort: str = Query("created_at_desc", description="created_at_desc|created_at_asc|title_asc|title_desc|avg_rating_desc|avg_rating_asc"),
):
    # total count (without join)
    total = db.scalar(select(func.count()).select_from(models.Game)) or 0

    # avg subquery to avoid GROUP BY pagination pitfalls
    avg_subq = (
        select(
            models.Review.game_id.label("game_id"),
            func.avg(models.Review.rating).label("avg_rating"),
        )
        .group_by(models.Review.game_id)
        .subquery()
    )

    avg_col = func.coalesce(avg_subq.c.avg_rating, 0)

    stmt = (
        select(
            models.Game,
            avg_col.label("avg_rating"),
        )
        .outerjoin(avg_subq, avg_subq.c.game_id == models.Game.id)
    )

    # sorting
    sort_map = {
        "created_at_desc": models.Game.created_at.desc(),
        "created_at_asc": models.Game.created_at.asc(),
        "title_asc": models.Game.title.asc(),
        "title_desc": models.Game.title.desc(),
        "avg_rating_desc": avg_col.desc(),
        "avg_rating_asc": avg_col.asc(),
    }
    order_expr = sort_map.get(sort, sort_map["created_at_desc"])
    stmt = stmt.order_by(order_expr, models.Game.id.desc())

    # pagination
    offset = (page - 1) * limit
    stmt = stmt.limit(limit).offset(offset)

    rows = db.execute(stmt).all()
    items = [
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

    return schemas.GamePage(items=items, total=int(total), page=page, limit=limit)


@router.post("/games", response_model=schemas.GameRead, status_code=201)
def create_game(payload: schemas.GameCreate, db: Session = Depends(get_db)):
    # duplicate check (case-insensitive)
    exists_stmt = select(models.Game.id).where(
        func.lower(models.Game.title) == func.lower(payload.title),
        func.lower(models.Game.platform) == func.lower(payload.platform),
    )
    if db.execute(exists_stmt).first():
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="Game with same title and platform already exists")

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
