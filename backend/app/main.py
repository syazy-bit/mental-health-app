"""FastAPI application factory.

Milestone 1 scope: minimal API with a /health endpoint and database plumbing.
Chat, screening, resources, booking, admin, safety, and AI are added in later
milestones and will be mounted here as routers.
"""

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    health,
    sessions,
    chat,
    screenings,
    auth,
    admin_auth,
    admin,
    counselors,
    bookings,
    admin_bookings,
    analytics,
    moments,
    helpful_marks,
)
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
    app.include_router(auth.router)
    app.include_router(admin_auth.router)
    app.include_router(admin.router)
    app.include_router(counselors.router)
    app.include_router(bookings.router)
    app.include_router(admin_bookings.router)
    app.include_router(analytics.router)
    app.include_router(moments.router)
    app.include_router(helpful_marks.router)

    # Moments 422s never echo submitted text; the handler delegates every
    # other route to FastAPI's default, so existing error contracts hold.
    app.add_exception_handler(RequestValidationError, moments.moments_validation_handler)

    return app


app = create_app()