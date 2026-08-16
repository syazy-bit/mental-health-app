"""Milestone 1 test: the /health endpoint responds and reports the API running."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["service"] == "mental-health-backend"
    assert body["version"]
    assert body["database"] in {"connected", "unavailable", "not_configured"}