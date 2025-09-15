from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ..db import get_db
from .. import models, schemas
from .. import storage
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse
from starlette.background import BackgroundTask
from ..auth import get_current_user


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
    items: list[schemas.GameRead] = []
    for g, avg in rows:
        cover_url = storage.presigned_get_url(g.cover_key) if getattr(g, "cover_key", None) else None
        items.append(
            schemas.GameRead(
                id=g.id,
                title=g.title,
                platform=g.platform,
                released_on=g.released_on,
                created_at=g.created_at,
                avg_rating=float(avg) if avg is not None else 0.0,
                cover_url=cover_url,
            )
        )

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
        cover_url=None,
    )


@router.post("/games/{game_id}/cover", status_code=201)
def upload_cover(
    game_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    game = db.get(models.Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # read file once
    data = file.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Empty file")

    # upload original
    cover_key = storage.new_cover_key(game_id, file.filename)
    storage.put_object_from_fileobj(
        fileobj=BytesIO(data),
        length=len(data),
        content_type=file.content_type or "application/octet-stream",
        object_name=cover_key,
    )

    # generate & upload thumbnail
    try:
        thumb_bytes = storage.generate_thumbnail(data, max_size=320)
        thumb_key = storage.new_thumb_key(game_id, file.filename)
        storage.put_object_from_fileobj(
            fileobj=BytesIO(thumb_bytes),
            length=len(thumb_bytes),
            content_type="image/jpeg",
            object_name=thumb_key,
        )
        game.thumb_key = thumb_key
    except Exception:
        # thumbnail generation failure shouldn't block upload
        game.thumb_key = None

    game.cover_key = cover_key
    db.add(game)
    db.commit()
    url = storage.presigned_get_url(cover_key)
    return {"cover_url": url}


@router.delete("/games/{game_id}/cover", status_code=204)
def delete_cover(
    game_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    game = db.get(models.Game, game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    if getattr(game, "cover_key", None):
        try:
            storage.delete_object(game.cover_key)  # 失敗は無視
        finally:
            game.cover_key = None
            db.add(game)
            db.commit()
    return


@router.get("/games/{game_id}/cover")
def get_cover(game_id: int, size: str = Query("thumb"), db: Session = Depends(get_db)):
    game = db.get(models.Game, game_id)
    if not game or not getattr(game, "cover_key", None):
        raise HTTPException(status_code=404, detail="Cover not found")
    key = game.cover_key
    if size == "thumb" and getattr(game, "thumb_key", None):
        key = game.thumb_key
    client = storage.get_client()
    obj = client.get_object(storage.MINIO_BUCKET, key)

    # ensure connection close after response is sent
    def _cleanup():
        try:
            obj.close()
        finally:
            try:
                obj.release_conn()
            except Exception:
                pass

    media_type = obj.headers.get('Content-Type', 'application/octet-stream') if hasattr(obj, 'headers') else 'application/octet-stream'
    return StreamingResponse(obj, media_type=media_type, background=BackgroundTask(_cleanup))
