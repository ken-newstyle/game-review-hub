import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from .db import Base, engine
from .routers import games, reviews


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

    return app


app = create_app()

