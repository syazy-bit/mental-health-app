"""M12 Analytics endpoint tests.

Covers:
- Authorization (admin-only; 401 for unauthenticated/invalid/inactive tokens;
  200 for a valid active admin; student sessions can never access analytics)
- Data correctness for every dashboard section (overview, sessions, screenings,
  safety, bookings, counselors) and utilization calculation
- Zero-data behavior
- Privacy: the response contains no student PII, booking PII, chat content,
  screening answers, session IDs, booking IDs, or individual risk/screening
  records
- CRITICAL regression: analytics never exposes a bookings -> sessions ->
  wellbeing join
- Small-cell suppression (sensitive cells < 5 suppressed, >= 5 returned;
  high-level totals never suppressed)
"""

import json
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from jose import jwt as jose_jwt
from sqlalchemy import select

from app.core.config import ADMIN_AUTH_ALGORITHM, settings
from app.models.admin import Admin as AdminModel
from app.schemas.admin import AdminCreateInternal
from app.services.admin import AdminService

# Sensitive mental-health cells smaller than this must be suppressed.
MIN_CELL_SIZE = 5


# --- Helpers ----------------------------------------------------------------


def create_admin(db_session, username="admin", password="right-password"):
    service = AdminService(db_session)
    hashed = service.hash_password(password)
    return service.create_admin(AdminCreateInternal(username=username, password_hash=hashed))


def _login(client, username, password):
    resp = client.post(
        "/api/admin/auth/login",
        json={"username": username, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _analytics(client, token):
    resp = client.get("/api/admin/analytics", headers=_auth(token))
    assert resp.status_code == 200, resp.text
    return resp.json()


def _seed_sessions(client, count=6):
    session_ids = []
    for _ in range(count):
        resp = client.post("/api/sessions", json={"language": "en"})
        assert resp.status_code == 201, resp.text
        session_ids.append(resp.json()["id"])
    return session_ids


def _seed_messages(client, session_ids):
    """Two NORMAL messages per session -> STRESS and SLEEP categories."""
    for sid in session_ids:
        for msg in ("I feel stressed about exams", "My sleep quality is poor"):
            resp = client.post(
                "/api/chat/message", json={"session_id": sid, "message": msg}
            )
            assert resp.status_code == 200, resp.text


def _seed_high_risk_message(client, session_id):
    """One HIGH_RISK (SUICIDE) message for a session."""
    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I want to end my life"},
    )
    assert resp.status_code == 200, resp.text


def _seed_screenings(client, session_ids):
    """Four PHQ-9 screenings: Minimal, Mild, Moderate(flagged), Severe(flagged)."""
    datasets = [
        [0] * 9,                       # 0   -> Minimal, no flag
        [1] * 8 + [0],                 # 8   -> Mild, no flag
        [2, 1, 2, 1, 2, 1, 2, 1, 1],   # 13  -> Moderate, item9=1 flagged
        [3, 3, 3, 3, 3, 3, 3, 3, 2],   # 26  -> Severe, item9=2 flagged
    ]
    for sid, responses in zip(session_ids, datasets):
        resp = client.post(
            "/api/screenings",
            json={"session_id": sid, "instrument": "PHQ9", "responses": responses},
        )
        assert resp.status_code == 201, resp.text


def _seed_counselor_flow(client, token, slots=4, name="Dr. Analia"):
    """One active counselor with N slots and N bookings:
    slots 0..1 COMPLETED, slot 2 PENDING, slot 3 CANCELLED."""
    now = datetime.now(timezone.utc)
    resp = client.post(
        "/api/admin/counselors",
        json={
            "name": name,
            "title": "Psychologist",
            "areas_of_support": ["anxiety"],
            "is_active": True,
        },
        headers=_auth(token),
    )
    assert resp.status_code == 201, resp.text
    counselor_id = resp.json()["id"]

    slot_ids = []
    for i in range(slots):
        start = now + timedelta(days=i + 1, hours=10)
        end = start + timedelta(hours=1)
        resp = client.post(
            f"/api/admin/counselors/{counselor_id}/slots",
            json={"starts_at": start.isoformat(), "ends_at": end.isoformat()},
            headers=_auth(token),
        )
        assert resp.status_code == 201, resp.text
        slot_ids.append(resp.json()["id"])

    booking_ids = []
    for slot_id in slot_ids:
        resp = client.post("/api/bookings", json={"slot_id": slot_id})
        assert resp.status_code == 201, resp.text
        booking_ids.append(resp.json()["id"])

    for booking_id in booking_ids[0:2]:
        resp = client.patch(
            f"/api/admin/bookings/{booking_id}/status",
            json={"status": "CONFIRMED"},
            headers=_auth(token),
        )
        assert resp.status_code == 200, resp.text
        resp = client.patch(
            f"/api/admin/bookings/{booking_id}/status",
            json={"status": "COMPLETED"},
            headers=_auth(token),
        )
        assert resp.status_code == 200, resp.text

    resp = client.patch(
        f"/api/admin/bookings/{booking_ids[3]}/status",
        json={"status": "CANCELLED"},
        headers=_auth(token),
    )
    assert resp.status_code == 200, resp.text

    return {"counselor_id": counselor_id, "slot_ids": slot_ids, "booking_ids": booking_ids}


def _seed_full_demo(client, token):
    """Deterministic dataset:
    - 6 sessions (en), 2 NORMAL messages each + 1 HIGH_RISK message on session 0
      -> 13 safety evaluations (12 NORMAL, 1 HIGH_RISK/SUICIDE)
    - 4 PHQ-9 screenings (2 flagged, 1 each of Minimal/Mild/Moderate/Severe)
    - 1 active counselor, 4 slots, 4 bookings (2 COMPLETED, 1 PENDING, 1 CANCELLED)
    """
    session_ids = _seed_sessions(client, 6)
    _seed_messages(client, session_ids)
    _seed_high_risk_message(client, session_ids[0])
    _seed_screenings(client, session_ids[:4])
    flow = _seed_counselor_flow(client, token)
    return {"session_ids": session_ids, "flow": flow}


# --- Authorization ----------------------------------------------------------


class TestAnalyticsAuthorization:
    def test_unauthenticated_analytics_returns_401(self, client):
        assert client.get("/api/admin/analytics").status_code == 401

    def test_invalid_token_returns_401(self, client):
        resp = client.get("/api/admin/analytics", headers=_auth("not-a-real-token"))
        assert resp.status_code == 401

    def test_forged_token_returns_401(self, client):
        forged = jose_jwt.encode(
            {"sub": str(uuid.uuid4()), "type": "access"},
            "wrong-secret",
            algorithm=ADMIN_AUTH_ALGORITHM,
        )
        resp = client.get("/api/admin/analytics", headers=_auth(forged))
        assert resp.status_code == 401

    def test_inactive_admin_rejected(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        admin = db_session.execute(
            select(AdminModel).where(AdminModel.username == "admin")
        ).scalar_one()
        admin.is_active = False
        db_session.commit()
        resp = client.get("/api/admin/analytics", headers=_auth(token))
        assert resp.status_code == 401

    def test_student_session_cannot_access_analytics(self, client):
        sid = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        resp = client.get("/api/admin/analytics", headers=_auth(sid))
        assert resp.status_code == 401

    def test_valid_admin_returns_200(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        resp = client.get("/api/admin/analytics", headers=_auth(token))
        assert resp.status_code == 200
        body = resp.json()
        for section in ("overview", "sessions", "screenings", "safety", "bookings", "counselors"):
            assert section in body


# --- Data correctness -------------------------------------------------------


class TestAnalyticsData:
    def _setup(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        return _analytics(client, token)

    def test_overview_aggregates(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        _seed_full_demo(client, token)
        o = _analytics(client, token)["overview"]
        assert o["total_sessions"] == 6
        assert o["total_screenings"] == 4
        assert o["total_safety_evaluations"] == 13
        assert o["total_bookings"] == 4
        assert o["active_counselors"] == 1
        assert o["total_counselor_slots"] == 4
        assert o["booking_completion_rate"] == pytest.approx(0.5)
        assert o["booking_cancellation_rate"] == pytest.approx(0.25)

    def test_session_metrics(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        _seed_full_demo(client, token)
        s = _analytics(client, token)["sessions"]
        assert s["average_messages_per_session"] == pytest.approx(13 / 6, abs=0.01)
        languages = {item["language"]: item["count"] for item in s["language_distribution"]}
        assert languages.get("en") == 6
        assert sum(item["count"] for item in s["over_time"]) == 6

    def test_screening_metrics(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        _seed_full_demo(client, token)
        s = _analytics(client, token)["screenings"]
        instruments = {item["instrument"]: item["count"] for item in s["by_instrument"]}
        assert instruments == {"PHQ9": 4}
        cells = s["severity_distribution"]
        assert len(cells) == 4
        for cell in cells:
            assert cell["count"] is None
            assert cell["suppressed"] is True
        assert s["safety_flag_rate"]["value"] is None
        assert s["safety_flag_rate"]["suppressed"] is True

    def test_safety_metrics(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        _seed_full_demo(client, token)
        s = _analytics(client, token)["safety"]
        levels = {item["risk_level"]: item for item in s["risk_level_distribution"]}
        assert levels["NORMAL"]["count"] == 12
        assert levels["NORMAL"]["suppressed"] is False
        assert levels["HIGH_RISK"]["count"] is None
        assert levels["HIGH_RISK"]["suppressed"] is True
        categories = {item["category"]: item for item in s["risk_category_distribution"]}
        assert categories["STRESS"]["count"] == 6
        assert categories["SLEEP"]["count"] == 6
        assert categories["SUICIDE"]["count"] is None
        assert categories["SUICIDE"]["suppressed"] is True
        normal_trend = sum(
            item["count"] for item in s["risk_trends"] if item["risk_level"] == "NORMAL"
        )
        assert normal_trend == 12

    def test_booking_metrics(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        _seed_full_demo(client, token)
        b = _analytics(client, token)["bookings"]
        statuses = {item["status"]: item["count"] for item in b["by_status"]}
        assert statuses["COMPLETED"] == 2
        assert statuses["PENDING"] == 1
        assert statuses["CANCELLED"] == 1
        funnel = {item["stage"]: item["count"] for item in b["funnel"]}
        assert funnel == {
            "created": 4,
            "confirmed": 2,
            "completed": 2,
            "cancelled": 1,
        }
        assert b["cancellation_rate"] == pytest.approx(0.25)
        assert sum(item["count"] for item in b["over_time"]) == 4

    def test_counselor_metrics_and_utilization(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        flow = _seed_counselor_flow(client, token)
        body = _analytics(client, token)
        counselors = body["counselors"]
        assert len(counselors) == 1
        c = counselors[0]
        assert c["counselor_id"] == str(flow["counselor_id"])
        assert c["name"] == "Dr. Analia"
        assert c["is_active"] is True
        assert c["total_slots"] == 4
        assert c["booked_slots"] == 3
        assert c["completed_bookings"] == 2
        assert c["pending_bookings"] == 1
        assert c["cancelled_bookings"] == 1
        assert c["utilization_rate"] == pytest.approx(0.75)

    def test_zero_data(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        body = _analytics(client, token)
        o = body["overview"]
        assert o["total_sessions"] == 0
        assert o["total_screenings"] == 0
        assert o["total_safety_evaluations"] == 0
        assert o["total_bookings"] == 0
        assert o["active_counselors"] == 0
        assert o["total_counselor_slots"] == 0
        assert o["booking_completion_rate"] is None
        assert o["booking_cancellation_rate"] is None
        assert body["sessions"]["average_messages_per_session"] is None
        assert body["sessions"]["over_time"] == []
        assert body["sessions"]["language_distribution"] == []
        assert body["safety"]["risk_level_distribution"] == []
        assert body["safety"]["risk_category_distribution"] == []
        assert body["safety"]["risk_trends"] == []
        assert body["screenings"]["safety_flag_rate"] == {
            "value": None,
            "suppressed": False,
        }
        assert body["bookings"]["funnel"] == [
            {"stage": "created", "count": 0},
            {"stage": "confirmed", "count": 0},
            {"stage": "completed", "count": 0},
            {"stage": "cancelled", "count": 0},
        ]
        assert body["counselors"] == []

    def test_invalid_granularity_returns_422(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        resp = client.get(
            "/api/admin/analytics?granularity=hour", headers=_auth(token)
        )
        assert resp.status_code == 422

    def test_invalid_days_returns_422(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        resp = client.get("/api/admin/analytics?days=0", headers=_auth(token))
        assert resp.status_code == 422


# --- Privacy -----------------------------------------------------------------


class TestAnalyticsPrivacy:
    def _seed_linked_scenario(self, client, token):
        """A booking carrying PII is linked (via session_id) to a session that
        holds HIGH_RISK chat data and a Severe, safety-flagged PHQ-9 screening.
        This is exactly the join the analytics layer must never expose."""
        sid = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        _seed_high_risk_message(client, sid)
        resp = client.post(
            "/api/screenings",
            json={"session_id": sid, "instrument": "PHQ9", "responses": [3] * 9},
        )
        assert resp.status_code == 201, resp.text

        now = datetime.now(timezone.utc)
        resp = client.post(
            "/api/admin/counselors",
            json={
                "name": "Dr. Link",
                "title": "Counsellor",
                "areas_of_support": [],
                "is_active": True,
            },
            headers=_auth(token),
        )
        assert resp.status_code == 201, resp.text
        counselor_id = resp.json()["id"]
        start = now + timedelta(days=1, hours=10)
        end = start + timedelta(hours=1)
        resp = client.post(
            f"/api/admin/counselors/{counselor_id}/slots",
            json={"starts_at": start.isoformat(), "ends_at": end.isoformat()},
            headers=_auth(token),
        )
        assert resp.status_code == 201, resp.text
        slot_id = resp.json()["id"]
        resp = client.post(
            "/api/bookings",
            json={
                "slot_id": slot_id,
                "session_id": sid,
                "student_name": "Alice Student",
                "contact_email": "alice@example.com",
                "contact_phone": "+919000000000",
                "reason": "Feeling very unwell",
            },
        )
        assert resp.status_code == 201, resp.text
        booking_id = resp.json()["id"]
        return {"counselor_id": counselor_id, "booking_id": booking_id}

    def test_response_contains_no_identifying_fields(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        seeded = self._seed_linked_scenario(client, token)
        body = _analytics(client, token)
        text = json.dumps(body)

        forbidden_substrings = (
            "student_name",
            "contact_email",
            "contact_phone",
            "session_id",
            "confirmation_code",
            "reason",
            "admin_notes",
            "alice@example.com",
            "Alice Student",
            "+919000000000",
            seeded["booking_id"],
        )
        for forbidden in forbidden_substrings:
            assert forbidden not in text, f"analytics leaked forbidden value: {forbidden}"

    def test_counselor_metrics_are_operational_only(self, client, db_session):
        """Counselor analytics carry only slot/status numbers — even when the
        sole booking on the counselor's slot is linked to a session with
        HIGH_RISK + severe-screening data."""
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        seeded = self._seed_linked_scenario(client, token)
        body = _analytics(client, token)
        counselor = next(
            c for c in body["counselors"] if c["counselor_id"] == str(seeded["counselor_id"])
        )
        assert set(counselor.keys()) == {
            "counselor_id",
            "name",
            "is_active",
            "total_slots",
            "booked_slots",
            "completed_bookings",
            "pending_bookings",
            "cancelled_bookings",
            "utilization_rate",
        }
        assert counselor["total_slots"] == 1
        assert counselor["booked_slots"] == 1
        assert counselor["pending_bookings"] == 1
        assert counselor["completed_bookings"] == 0
        assert counselor["cancelled_bookings"] == 0

    def test_no_booking_to_wellbeing_join(self, client, db_session):
        """CRITICAL regression: analytics must never join bookings -> sessions
        -> screenings / safety_evaluations. The wellbeing aggregate (SUICIDE)
        is computed globally, while the linked booking's PII and identity never
        appear, and counselor rows expose only operational numbers."""
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        self._seed_linked_scenario(client, token)
        body = _analytics(client, token)
        text = json.dumps(body)

        # The aggregate risk metric exists (as a suppressed cell)...
        assert "SUICIDE" in text
        # ...but no booking identity, PII, or session id is present anywhere.
        assert "session_id" not in text
        assert "alice" not in text.lower()
        assert "+919000000000" not in text
        # Counselor rows are strictly operational (no per-counselor wellbeing).
        for counselor in body["counselors"]:
            assert set(counselor.keys()) == {
                "counselor_id",
                "name",
                "is_active",
                "total_slots",
                "booked_slots",
                "completed_bookings",
                "pending_bookings",
                "cancelled_bookings",
                "utilization_rate",
            }


# --- Small-cell suppression -------------------------------------------------


class TestAnalyticsSmallCellSuppression:
    def test_sensitive_cells_below_threshold_suppressed(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        sid = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        _seed_high_risk_message(client, sid)
        resp = client.post(
            "/api/screenings",
            json={"session_id": sid, "instrument": "PHQ9", "responses": [3] * 9},
        )
        assert resp.status_code == 201

        body = _analytics(client, token)
        levels = {item["risk_level"]: item for item in body["safety"]["risk_level_distribution"]}
        assert levels["HIGH_RISK"]["count"] is None
        assert levels["HIGH_RISK"]["suppressed"] is True

        categories = {
            item["category"]: item for item in body["safety"]["risk_category_distribution"]
        }
        assert categories["SUICIDE"]["count"] is None
        assert categories["SUICIDE"]["suppressed"] is True

        severe = next(
            c for c in body["screenings"]["severity_distribution"] if c["severity"] == "Severe"
        )
        assert severe["count"] is None
        assert severe["suppressed"] is True

        assert body["screenings"]["safety_flag_rate"]["value"] is None
        assert body["screenings"]["safety_flag_rate"]["suppressed"] is True

    def test_sensitive_cells_at_or_above_threshold_returned(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        for _ in range(MIN_CELL_SIZE):
            sid = client.post("/api/sessions", json={"language": "en"}).json()["id"]
            _seed_high_risk_message(client, sid)
        for _ in range(MIN_CELL_SIZE):
            sid = client.post("/api/sessions", json={"language": "en"}).json()["id"]
            resp = client.post(
                "/api/screenings",
                json={"session_id": sid, "instrument": "PHQ9", "responses": [3] * 9},
            )
            assert resp.status_code == 201

        body = _analytics(client, token)
        levels = {item["risk_level"]: item for item in body["safety"]["risk_level_distribution"]}
        assert levels["HIGH_RISK"]["count"] == MIN_CELL_SIZE
        assert levels["HIGH_RISK"]["suppressed"] is False

        categories = {
            item["category"]: item for item in body["safety"]["risk_category_distribution"]
        }
        assert categories["SUICIDE"]["count"] == MIN_CELL_SIZE
        assert categories["SUICIDE"]["suppressed"] is False

        severe = next(
            c for c in body["screenings"]["severity_distribution"] if c["severity"] == "Severe"
        )
        assert severe["count"] == MIN_CELL_SIZE
        assert severe["suppressed"] is False

        rate = body["screenings"]["safety_flag_rate"]
        assert rate["suppressed"] is False
        assert rate["value"] == pytest.approx(1.0)

    def test_high_level_totals_never_suppressed(self, client, db_session):
        create_admin(db_session, username="admin", password="right-password")
        token = _login(client, "admin", "right-password")
        sid = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        _seed_high_risk_message(client, sid)
        body = _analytics(client, token)
        assert body["overview"]["total_sessions"] == 1
        assert body["overview"]["total_safety_evaluations"] == 1
        assert body["sessions"]["language_distribution"][0]["count"] == 1
        assert body["sessions"]["average_messages_per_session"] == pytest.approx(1.0)