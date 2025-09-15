import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse
from sqlalchemy.exc import OperationalError, IntegrityError
from sqlalchemy.exc import OperationalError

from .db import Base, engine
from .routers import games, reviews, auth as auth_router
from . import storage


def create_app() -> FastAPI:
    app = FastAPI(title="Game Review Hub API", version="0.1.0")

    # CORS: 明示的にフロントのオリジンを許可（credentials対応のためワイルドカードを避ける）
    frontend_origins = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    allow_origins = [o.strip() for o in frontend_origins.split(",") if o.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )

    @app.get("/health")
    def health():
        return {"status": "ok"}

    # Routers
    app.include_router(games.router, prefix="/api", tags=["games"])
    app.include_router(reviews.router, prefix="/api", tags=["reviews"])
    app.include_router(auth_router.router, prefix="/api", tags=["auth"])

    @app.on_event("startup")
    def on_startup():
        # DB初期化はDB起動待ちのためリトライ
        attempts = 0
        while True:
            try:
                Base.metadata.create_all(bind=engine)
                # MinIO バケットの確保
                storage.ensure_bucket()
                break
            except OperationalError:
                attempts += 1
                if attempts >= 10:
                    raise
                time.sleep(3)

    # Error handlers (unified response shape)
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(_, exc: RequestValidationError):
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "validation_error",
                    "message": "Invalid request",
                    "details": exc.errors(),
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_, exc: HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": "http_error",
                    "message": exc.detail if isinstance(exc.detail, str) else str(exc.detail),
                }
            },
        )

    @app.exception_handler(IntegrityError)
    async def integrity_exception_handler(_, exc: IntegrityError):
        # 23505 = unique_violation (psycopg2)
        msg = "Integrity error"
        if hasattr(exc.orig, "pgcode") and getattr(exc.orig, "pgcode") == "23505":
            msg = "Duplicate resource"
            status = 409
        else:
            status = 400
        return JSONResponse(status_code=status, content={"error": {"code": "integrity_error", "message": msg}})

    return app


app = create_app()
