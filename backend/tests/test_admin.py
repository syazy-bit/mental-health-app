"""M8 Admin Authentication & Authorization tests.

Covers:
- Password hashing (bcrypt via passlib)
- Admin login (success, failure, enumeration resistance)
- JWT authentication (valid, missing, malformed, expired)
- Authorization (authenticated admin access, unauthenticated rejection,
  non-admin rejection, client-side manipulation resistance)
- Security (no plaintext passwords, no hash leakage, no token leakage)
"""

import uuid

import pytest
from jose import jwt
from sqlalchemy import select

from app.core.config import settings
from app.models.admin import Admin as AdminModel
from app.services.admin import AdminService
from app.schemas.admin import AdminCreateInternal


# --- Helpers ---


def create_admin(db_session, username="admin", password="correct-horse-battery-staple"):
    """Create an admin directly via service layer with hashed password."""
    service = AdminService(db_session)
    hashed = service.hash_password(password)
    admin = service.create_admin(AdminCreateInternal(username=username, password_hash=hashed))
    return admin


def login(client, username, password):
    """Attempt login and return response."""
    return client.post(
        "/api/admin/auth/login",
        json={"username": username, "password": password},
    )


# --- Password hashing ---


class TestPasswordHashing:
    def test_password_is_hashed(self, db_session):
        service = AdminService(db_session)
        hashed = service.hash_password("s3cret-password")
        assert hashed != "s3cret-password"
        assert "$2" in hashed  # bcrypt prefix

    def test_plaintext_password_never_stored(self, db_session):
        plaintext = "super-secret-password"
        create_admin(db_session, password=plaintext)
        admin = db_session.execute(
            select(AdminModel).where(AdminModel.username == "admin")
        ).scalar_one()
        assert admin.password_hash != plaintext
        assert plaintext not in admin.password_hash

    def test_correct_password_verifies(self, db_session):
        service = AdminService(db_session)
        hashed = service.hash_password("my-password")
        assert service.verify_password("my-password", hashed) is True

    def test_incorrect_password_fails(self, db_session):
        service = AdminService(db_session)
        hashed = service.hash_password("my-password")
        assert service.verify_password("wrong-password", hashed) is False

    def test_hash_is_salted_and_unique(self, db_session):
        service = AdminService(db_session)
        h1 = service.hash_password("same-password")
        h2 = service.hash_password("same-password")
        assert h1 != h2  # bcrypt uses random salts

    def test_password_exactly_72_bytes_hashes(self, db_session):
        service = AdminService(db_session)
        hashed = service.hash_password("a" * 72)
        assert hashed != "a" * 72
        assert service.verify_password("a" * 72, hashed) is True

    def test_password_over_72_bytes_rejected_not_truncated(self, db_session):
        """Passwords over bcrypt's 72-byte limit are rejected explicitly,
        never silently truncated."""
        service = AdminService(db_session)
        long_password = "a" * 73
        with pytest.raises(ValueError, match="72-byte"):
            service.hash_password(long_password)

    def test_password_over_72_bytes_fails_verification(self, db_session):
        """Verification of an over-72-byte password fails safely (no
        silent truncation means it can never match a truncated hash)."""
        service = AdminService(db_session)
        hashed = service.hash_password("a" * 72)
        assert service.verify_password("a" * 73, hashed) is False

    def test_multibyte_password_byte_limit(self, db_session):
        """The 72-byte limit applies to UTF-8 bytes, not characters.
        25 emoji (4 bytes each = 100 bytes) must be rejected even though
        they are fewer than 72 characters."""
        service = AdminService(db_session)
        multi_byte = "😀" * 25  # 100 bytes > 72
        with pytest.raises(ValueError, match="72-byte"):
            service.hash_password(multi_byte)


# --- Login ---


class TestLogin:
    def test_valid_login_succeeds(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        resp = login(client, "admin", "right-password")
        assert resp.status_code == 200
        body = resp.json()
        assert body["access_token"]
        assert body["token_type"] == "bearer"
        assert body["expires_in"] > 0

    def test_invalid_password_fails(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        resp = login(client, "admin", "wrong-password")
        assert resp.status_code == 401

    def test_unknown_admin_fails(self, client, db_session):
        resp = login(client, "does-not-exist", "any-password")
        assert resp.status_code == 401

    def test_unknown_admin_and_wrong_password_same_error(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        resp_unknown = login(client, "does-not-exist", "wrong-password")
        resp_wrong_pw = login(client, "admin", "wrong-password")
        assert resp_unknown.status_code == 401
        assert resp_wrong_pw.status_code == 401
        # Same error message — no user enumeration
        assert resp_unknown.json()["detail"] == resp_wrong_pw.json()["detail"]
        assert resp_unknown.json()["detail"] == "Invalid credentials"

    def test_malformed_request_fails_safely(self, client):
        # Missing password
        resp = client.post("/api/admin/auth/login", json={"username": "admin"})
        assert resp.status_code == 422
        # Missing username
        resp = client.post("/api/admin/auth/login", json={"password": "pw"})
        assert resp.status_code == 422
        # Empty body
        resp = client.post("/api/admin/auth/login", json={})
        assert resp.status_code == 422
        # Non-JSON body
        resp = client.post("/api/admin/auth/login", data="not json")
        assert resp.status_code in (400, 422)

    def test_password_hash_not_returned(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        resp = login(client, "admin", "right-password")
        body = resp.json()
        assert "password" not in str(body).lower()
        assert "hash" not in str(body).lower()
        assert "$2" not in str(body)

    def test_login_response_no_password_field(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        resp = login(client, "admin", "right-password")
        assert "password" not in resp.json()
        assert "password_hash" not in resp.json()

    def test_inactive_admin_cannot_login(self, client, db_session):
        admin = create_admin(db_session, username="admin", password="right-password")
        admin.is_active = False
        db_session.commit()
        resp = login(client, "admin", "right-password")
        assert resp.status_code == 401


# --- Authentication ---


class TestAuthentication:
    def _get_token(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        resp = login(client, "admin", "right-password")
        return resp.json()["access_token"]

    def test_valid_authentication_succeeds(self, client, db_session):
        token = self._get_token(client, db_session)
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["username"] == "admin"
        assert "password" not in body
        assert "password_hash" not in body

    def test_missing_authentication_fails(self, client):
        resp = client.get("/api/admin/auth/me")
        assert resp.status_code == 401

    def test_malformed_token_fails(self, client):
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": "Bearer not-a-real-token"},
        )
        assert resp.status_code == 401

    def test_malformed_auth_header_fails(self, client):
        # No "Bearer" prefix
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": "Basic abc123"},
        )
        assert resp.status_code == 401
        # Empty Authorization header
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": ""},
        )
        assert resp.status_code == 401

    def test_tampered_token_fails(self, client, db_session):
        token = self._get_token(client, db_session)
        # Flip a character in the token payload/signature
        tampered = token[:-2] + ("a" if token[-2] != "a" else "b")
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {tampered}"},
        )
        assert resp.status_code == 401

    def test_token_signed_with_wrong_secret_fails(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        forged = jwt.encode(
            {"sub": str(uuid.uuid4()), "type": "access", "username": "admin"},
            "a-completely-different-secret",
            algorithm="HS256",
        )
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {forged}"},
        )
        assert resp.status_code == 401

    def test_alg_none_token_rejected(self, client, db_session):
        """alg=none tokens must be rejected (no signature)."""
        create_admin(db_session, username="admin", password="right-password")
        import base64
        import json

        def _b64url(data: bytes) -> str:
            return base64.urlsafe_b64encode(data).rstrip(b"=").decode()

        header = _b64url(json.dumps({"alg": "none", "typ": "JWT"}).encode())
        payload = _b64url(json.dumps({"sub": str(uuid.uuid4()), "type": "access"}).encode())
        none_token = f"{header}.{payload}."
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {none_token}"},
        )
        assert resp.status_code == 401

    def test_unintended_algorithm_token_rejected(self, client, db_session):
        """Tokens signed with a non-HS256 algorithm must be rejected even
        if they carry a valid signature."""
        create_admin(db_session, username="admin", password="right-password")
        from datetime import datetime, timedelta, timezone
        hs512_token = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "type": "access",
                "username": "admin",
                "exp": datetime.now(timezone.utc) + timedelta(hours=1),
                "iat": datetime.now(timezone.utc),
            },
            settings.admin_auth_secret,
            algorithm="HS512",
        )
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {hs512_token}"},
        )
        assert resp.status_code == 401

    def test_expired_credential_fails(self, client, db_session, monkeypatch):
        create_admin(db_session, username="admin", password="right-password")
        # Create an already-expired token directly
        from datetime import datetime, timedelta, timezone
        expired = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "type": "access",
                "username": "admin",
                "exp": datetime.now(timezone.utc) - timedelta(hours=1),
                "iat": datetime.now(timezone.utc) - timedelta(hours=2),
            },
            settings.admin_auth_secret,
            algorithm=settings.admin_auth_algorithm,
        )
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {expired}"},
        )
        assert resp.status_code == 401

    def test_token_with_wrong_type_fails(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        from datetime import datetime, timedelta, timezone
        refresh_token = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "type": "refresh",  # Not an access token
                "username": "admin",
                "exp": datetime.now(timezone.utc) + timedelta(hours=1),
                "iat": datetime.now(timezone.utc),
            },
            settings.admin_auth_secret,
            algorithm=settings.admin_auth_algorithm,
        )
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {refresh_token}"},
        )
        assert resp.status_code == 401

    def test_session_uuid_not_treated_as_credential(self, client, db_session):
        """A student session UUID must not grant admin access."""
        create_resp = client.post("/api/sessions", json={"language": "en"})
        session_id = create_resp.json()["id"]
        # Try using session UUID as a bearer token
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {session_id}"},
        )
        assert resp.status_code == 401

    def test_token_for_unknown_admin_fails(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        from datetime import datetime, timedelta, timezone
        # Valid signature but admin id doesn't exist in DB
        forged = jwt.encode(
            {
                "sub": str(uuid.uuid4()),
                "type": "access",
                "username": "ghost",
                "exp": datetime.now(timezone.utc) + timedelta(hours=1),
                "iat": datetime.now(timezone.utc),
            },
            settings.admin_auth_secret,
            algorithm=settings.admin_auth_algorithm,
        )
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {forged}"},
        )
        assert resp.status_code == 401


# --- Authorization / Protected routes ---


class TestAuthorization:
    def test_authenticated_admin_can_access_protected_route(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = login(client, "admin", "right-password").json()["access_token"]
        resp = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert "statistics" in resp.json()

    def test_unauthenticated_user_cannot_access_protected_route(self, client):
        resp = client.get("/api/admin/dashboard")
        assert resp.status_code == 401

    def test_authenticated_non_admin_cannot_access_protected_route(self, client, db_session):
        """A session token (non-admin) is not a valid admin credential."""
        create_resp = client.post("/api/sessions", json={"language": "en"})
        session_id = create_resp.json()["id"]
        resp = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {session_id}"},
        )
        assert resp.status_code == 401

    def test_client_side_manipulation_cannot_bypass_auth(self, client, db_session):
        """Tampering with session/client values must not grant admin access."""
        # Create a real student session
        create_resp = client.post("/api/sessions", json={"language": "en"})
        session_id = create_resp.json()["id"]
        # Even if client sends session id as bearer token, admin routes reject
        resp = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {session_id}"},
        )
        assert resp.status_code == 401

    def test_public_endpoints_still_public(self, client):
        """Non-admin endpoints remain accessible without authentication."""
        assert client.get("/health").status_code == 200
        assert client.post("/api/sessions", json={"language": "en"}).status_code == 201

    def test_admin_list_excludes_password_hash(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = login(client, "admin", "right-password").json()["access_token"]
        resp = client.get(
            "/api/admin/admins",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["admins"]) == 1
        assert "password" not in body["admins"][0]
        assert "password_hash" not in body["admins"][0]
        assert body["admins"][0]["username"] == "admin"

    def test_inactive_admin_token_rejected(self, client, db_session):
        admin = create_admin(db_session, username="admin", password="right-password")
        token = login(client, "admin", "right-password").json()["access_token"]
        # Deactivate the admin, then verify token no longer works
        admin.is_active = False
        db_session.commit()
        resp = client.get(
            "/api/admin/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 401


# --- Security / No leakage ---


class TestSecurity:
    def test_admin_dashboard_returns_no_pii(self, client, db_session):
        """Dashboard stats must not expose student-level data."""
        create_admin(db_session, username="admin", password="right-password")
        token = login(client, "admin", "right-password").json()["access_token"]
        # Create some student data first
        session_resp = client.post("/api/sessions", json={"language": "en"})
        session_id = session_resp.json()["id"]
        client.post(
            "/api/chat/message",
            json={"session_id": session_id, "message": "I'm feeling stressed"},
        )
        resp = client.get(
            "/api/admin/dashboard",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert "sessions" not in body  # no raw session data
        assert "messages" not in body  # no raw message content
        assert "statistics" in body

    def test_login_error_does_not_leak_details(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        for attempt in [
            {"username": "admin", "password": "wrong"},
            {"username": "nobody", "password": "anything"},
        ]:
            resp = client.post("/api/admin/auth/login", json=attempt)
            assert resp.status_code == 401
            assert "Invalid credentials" == resp.json()["detail"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])