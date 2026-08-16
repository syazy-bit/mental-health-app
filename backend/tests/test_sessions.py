"""Tests for anonymous session creation, retrieval, validation, and persistence."""

import uuid

import pytest

from app.models.session import Session as SessionModel
from app.repositories.sessions import SessionRepository
from app.services.sessions import SessionService


def test_create_session_returns_201_with_fields(client):
    response = client.post("/api/sessions", json={"language": "en"})
    assert response.status_code == 201
    body = response.json()
    assert uuid.UUID(body["id"])
    assert body["language"] == "en"
    assert body["created_at"]
    assert body["updated_at"]


def test_create_session_defaults_to_english(client):
    response = client.post("/api/sessions", json={})
    assert response.status_code == 201
    assert response.json()["language"] == "en"


def test_create_session_supports_targeted_languages(client):
    for language in ("hi", "as"):
        response = client.post("/api/sessions", json={"language": language})
        assert response.status_code == 201
        assert response.json()["language"] == language


def test_create_session_rejects_unknown_language(client):
    response = client.post("/api/sessions", json={"language": "xx"})
    assert response.status_code == 422


def test_create_session_normalizes_language_case(client):
    response = client.post("/api/sessions", json={"language": "EN"})
    assert response.status_code == 201
    assert response.json()["language"] == "en"


def test_get_session_returns_created_session(client):
    created = client.post("/api/sessions", json={"language": "hi"}).json()
    response = client.get(f"/api/sessions/{created['id']}")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == created["id"]
    assert body["language"] == "hi"


def test_get_session_unknown_id_returns_404(client):
    response = client.get(f"/api/sessions/{uuid.uuid4()}")
    assert response.status_code == 404


def test_get_session_invalid_uuid_returns_422(client):
    response = client.get("/api/sessions/not-a-uuid")
    assert response.status_code == 422


def test_session_is_persisted_in_database(client, db_session):
    created = client.post("/api/sessions", json={"language": "as"}).json()
    row = db_session.get(SessionModel, uuid.UUID(created["id"]))
    assert row is not None
    assert row.language == "as"
    assert row.created_at is not None
    assert row.updated_at is not None


def test_repository_does_not_commit_transaction(client, db_session):
    from app.core.db import SessionLocal

    repo = SessionRepository(db_session)
    created = repo.create("en")
    db_session.flush()
    assert created.id is not None

    observer = SessionLocal()
    try:
        assert observer.get(SessionModel, created.id) is None
    finally:
        observer.close()

    db_session.commit()

    observer = SessionLocal()
    try:
        assert observer.get(SessionModel, created.id) is not None
    finally:
        observer.close()


def test_service_owns_transaction_boundary(client, db_session):
    service = SessionService(db_session)
    created = service.create("hi")
    assert service.get(created.id) is not None
    assert created.language == "hi"


def test_service_normalizes_language(client, db_session):
    service = SessionService(db_session)
    assert service.create(" AS ").language == "as"


def test_service_rejects_unsupported_language(client, db_session):
    service = SessionService(db_session)
    with pytest.raises(ValueError):
        service.create("xx")