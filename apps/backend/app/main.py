import time
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.responses import JSONResponse
from sqlalchemy.exc import OperationalError, IntegrityError
from sqlalchemy.exc import OperationalError

from .db import Base, engine
from .routers import games, reviews, auth as auth_router


def create_app() -> FastAPI:
    app = FastAPI(title="Game Review Hub API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
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
