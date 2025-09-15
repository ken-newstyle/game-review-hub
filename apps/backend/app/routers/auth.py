from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from ..db import get_db
from .. import models, schemas
from ..auth import hash_password, verify_password, create_access_token, get_current_user


router = APIRouter()


@router.post("/auth/register", response_model=schemas.UserRead, status_code=201)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # 既存メール
    exists = db.scalar(select(models.User).where(func.lower(models.User.email) == func.lower(payload.email)))
    if exists:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = models.User(email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/auth/login", response_model=schemas.TokenResponse)
def login(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    # 使い回しのためUserCreateを流用（password必須のため）。emailのみバリデーションとして利用
    user = db.scalar(select(models.User).where(func.lower(models.User.email) == func.lower(payload.email)))
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token, expires_in = create_access_token(user.id)
    return schemas.TokenResponse(access_token=token, expires_in=expires_in)


@router.get("/me", response_model=schemas.UserRead)
def me(current=Depends(get_current_user)):
    return current

