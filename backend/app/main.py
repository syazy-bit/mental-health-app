"""FastAPI application factory.

Milestone 1 scope: minimal API with a /health endpoint and database plumbing.
Chat, screening, resources, booking, admin, safety, and AI are added in later
milestones and will be mounted here as routers.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import health, sessions, chat, screenings
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="Privacy-first student mental health support pathway.",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(sessions.router)
    app.include_router(chat.router)
    app.include_router(screenings.router)

    return app


app = create_app()