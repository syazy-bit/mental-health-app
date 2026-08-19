"""M7 University Counseling Booking tests.

Covers:
- Counselor management (admin create, public list)
- Slot management (validation rules, availability filtering)
- Booking creation (anonymous-first, double-booking protection)
- Booking ownership (session_id / confirmation_code)
- Cancellation and admin status state machine
- Privacy regression: no session content ever leaks into booking responses
- Concurrency: exactly one success for concurrent same-slot bookings
"""

import threading
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.core.db import SessionLocal
from app.models.booking import Booking as BookingModel
from app.models.counselor import Counselor as CounselorModel
from app.models.counselor_slot import CounselorSlot as CounselorSlotModel
from app.schemas.booking import BookingCreate
from app.services.admin import AdminService
from app.services.booking import BookingService
from app.schemas.admin import AdminCreateInternal


# --- Helpers ---


def admin_token(client, db_session, username="admin", password="right-password"):
    AdminService(db_session).create_admin(
        AdminCreateInternal(
            username=username,
            password_hash=AdminService(db_session).hash_password(password),
        )
    )
    resp = client.post(
        "/api/admin/auth/login",
        json={"username": username, "password": password},
    )
    assert resp.status_code == 200
    return resp.json()["access_token"]


def create_counselor(client, token, **overrides):
    payload = {
        "name": "Dr. Priya Sharma",
        "title": "Staff Counselor",
        "areas_of_support": ["Academic stress", "Anxiety", "Grief"],
        "bio": "Supporting students with a warm, evidence-based approach.",
        **overrides,
    }
    return client.post(
        "/api/admin/counselors",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )


def create_slot(client, token, counselor_id, **overrides):
    now = datetime.now(timezone.utc)
    starts = overrides.get("starts_at", (now + timedelta(days=1, hours=1)).isoformat())
    ends = overrides.get(
        "ends_at",
        (datetime.fromisoformat(starts) + timedelta(hours=1)).isoformat(),
    )
    payload = {"starts_at": starts, "ends_at": ends}
    return client.post(
        f"/api/admin/counselors/{counselor_id}/slots",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )


def make_booking(client, slot_id, **overrides):
    payload = {"slot_id": str(slot_id), **overrides}
    return client.post("/api/bookings", json=payload)


def future_iso(hours=1):
    return (datetime.now(timezone.utc) + timedelta(hours=hours)).isoformat()


# --- Counselors ---


class TestCounselors:
    def test_create_counselor_requires_admin(self, client):
        resp = create_counselor(client, token="not-a-token")
        assert resp.status_code == 401

    def test_create_counselor_success(self, client, db_session):
        token = admin_token(client, db_session)
        resp = create_counselor(client, token)
        assert resp.status_code == 201
        body = resp.json()
        assert body["name"] == "Dr. Priya Sharma"
        assert body["areas_of_support"] == ["Academic stress", "Anxiety", "Grief"]
        assert "id" in body
        assert "is_active" not in body  # admin field not exposed publicly

    def test_public_list_returns_active_only(self, client, db_session):
        token = admin_token(client, db_session)
        create_counselor(client, token, name="Active Counselor", is_active=True)
        create_counselor(client, token, name="Hidden Counselor", is_active=False)
        resp = client.get("/api/counselors")
        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Active Counselor" in names
        assert "Hidden Counselor" not in names

    def test_public_list_has_no_admin_fields(self, client, db_session):
        token = admin_token(client, db_session)
        create_counselor(client, token)
        resp = client.get("/api/counselors")
        body = resp.json()
        assert len(body) == 1
        assert "is_active" not in body[0]
        assert "created_at" not in body[0]


# --- Slots ---


class TestSlots:
    def test_create_slot_requires_admin(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        resp = create_slot(client, "bad-token", counselor["id"])
        assert resp.status_code == 401

    def test_create_slot_success(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        resp = create_slot(client, token, counselor["id"])
        assert resp.status_code == 201
        body = resp.json()
        assert body["counselor_id"] == counselor["id"]
        assert "starts_at" in body and "ends_at" in body

    def test_create_slot_unknown_counselor_404(self, client, db_session):
        token = admin_token(client, db_session)
        resp = create_slot(client, token, str(uuid.uuid4()))
        assert resp.status_code == 404

    def test_create_slot_end_before_start_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        resp = create_slot(
            client,
            token,
            counselor["id"],
            starts_at=future_iso(5),
            ends_at=future_iso(4),
        )
        assert resp.status_code == 422

    def test_create_slot_over_4_hours_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        resp = create_slot(
            client,
            token,
            counselor["id"],
            starts_at=future_iso(1),
            ends_at=future_iso(6),
        )
        assert resp.status_code == 422

    def test_create_slot_in_past_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        past = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
        resp = create_slot(
            client, token, counselor["id"], starts_at=past, ends_at=future_iso(1)
        )
        assert resp.status_code == 422

    def test_list_slots_public_and_future_only(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        create_slot(client, token, counselor["id"])  # future slot
        past = (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat()
        create_slot(
            client,
            token,
            counselor["id"],
            starts_at=past,
            ends_at=(datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
        )
        resp = client.get(f"/api/counselors/{counselor['id']}/slots")
        assert resp.status_code == 200
        slots = resp.json()
        assert len(slots) == 1  # past slot excluded

    def test_list_slots_unknown_counselor_404(self, client, db_session):
        resp = client.get(f"/api/counselors/{uuid.uuid4()}/slots")
        assert resp.status_code == 404

    def test_list_slots_inactive_counselor_404(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token, is_active=False).json()
        resp = client.get(f"/api/counselors/{counselor['id']}/slots")
        assert resp.status_code == 404


# --- Booking creation ---


class TestCreateBooking:
    def test_create_booking_anonymous(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        resp = make_booking(client, slot["id"])
        assert resp.status_code == 201
        body = resp.json()
        assert body["status"] == "PENDING"
        assert len(body["confirmation_code"]) == 8
        assert body["counselor"]["name"] == "Dr. Priya Sharma"
        assert body["slot"]["id"] == slot["id"]
        assert "session_id" not in body

    def test_create_booking_with_session_and_contact(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        session_id = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        resp = make_booking(
            client,
            slot["id"],
            session_id=session_id,
            student_name="A Student",
            contact_email="student@university.edu",
            contact_phone="555-0100",
            reason="Feeling anxious about exams",
        )
        assert resp.status_code == 201
        body = resp.json()
        assert body["student_name"] == "A Student"
        assert body["contact_email"] == "student@university.edu"
        assert "session_id" not in body

    def test_create_booking_invalid_session_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        resp = make_booking(client, slot["id"], session_id=str(uuid.uuid4()))
        assert resp.status_code == 400

    def test_create_booking_unknown_slot_404(self, client):
        resp = make_booking(client, str(uuid.uuid4()))
        assert resp.status_code == 404

    def test_create_booking_cannot_set_status(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        resp = make_booking(client, slot["id"], status="CONFIRMED")
        assert resp.status_code == 422  # extra="forbid"

    def test_create_booking_slot_no_longer_available_409(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        assert make_booking(client, slot["id"]).status_code == 201
        resp = make_booking(client, slot["id"])
        assert resp.status_code == 409

    def test_confirmation_codes_unique(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        codes = set()
        for i in range(3):
            slot = create_slot(client, token, counselor["id"], starts_at=future_iso(10 + i)).json()
            body = make_booking(client, slot["id"]).json()
            codes.add(body["confirmation_code"])
        assert len(codes) == 3

    def test_booking_response_omits_session_content(self, client, db_session):
        """Privacy regression: even with chat + screening data on the session,
        the booking response must never expose it."""
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        session_id = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        client.post(
            "/api/chat/message",
            json={"session_id": session_id, "message": "I feel overwhelmed"},
        )
        client.post(
            "/api/screenings",
            json={
                "session_id": session_id,
                "instrument": "GAD7",
                "responses": [3, 3, 3, 3, 3, 3, 3],
            },
        )
        body = make_booking(
            client, slot["id"], session_id=session_id
        ).json()
        blob = str(body).lower()
        for forbidden in [
            "session_id",
            "message_index",
            "risk_level",
            "category",
            "matched_patterns",
            "total_score",
            "severity",
            "safety_flag",
            "item9_score",
            "response",
            "crisis",
        ]:
            assert forbidden not in blob, f"leaked {forbidden}: {body}"


# --- Inactive counselor protection (F2) ---


class TestInactiveCounselorBooking:
    """A deactivated counselor's slots must not be bookable, even with a known
    slot_id. The backend remains authoritative."""

    def _setup(self, client, db_session, counselor_is_active=True):
        token = admin_token(client, db_session)
        counselor = create_counselor(
            client, token, is_active=counselor_is_active
        ).json()
        slot = create_slot(client, token, counselor["id"]).json()
        return token, counselor, slot

    def test_active_counselor_slot_bookable(self, client, db_session):
        _, _, slot = self._setup(client, db_session)
        resp = make_booking(client, slot["id"])
        assert resp.status_code == 201

    def test_inactive_counselor_slot_not_bookable(self, client, db_session):
        _, _, slot = self._setup(client, db_session, counselor_is_active=False)
        resp = make_booking(client, slot["id"])
        assert resp.status_code == 409

    def test_future_slot_unbookable_after_deactivation(self, client, db_session):
        token, counselor, slot = self._setup(client, db_session)
        resp = client.patch(
            f"/api/admin/counselors/{counselor['id']}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert make_booking(client, slot["id"]).status_code == 409

    def test_reactivated_counselor_slot_bookable_again(self, client, db_session):
        token, counselor, slot = self._setup(client, db_session)
        client.patch(
            f"/api/admin/counselors/{counselor['id']}",
            json={"is_active": False},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert make_booking(client, slot["id"]).status_code == 409
        resp = client.patch(
            f"/api/admin/counselors/{counselor['id']}",
            json={"is_active": True},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert make_booking(client, slot["id"]).status_code == 201


# --- Booking retrieval / ownership ---


class TestGetBooking:
    def _setup_booking(self, client, db_session, session_id=None):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        resp = make_booking(client, slot["id"], session_id=session_id)
        return resp.json()

    def test_get_by_confirmation_code(self, client, db_session):
        booking = self._setup_booking(client, db_session)
        resp = client.get(
            f"/api/bookings/{booking['id']}", params={"code": booking["confirmation_code"]}
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == booking["id"]
        assert "session_id" not in resp.json()

    def test_get_by_session_id(self, client, db_session):
        session_id = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        booking = self._setup_booking(client, db_session, session_id=session_id)
        resp = client.get(
            f"/api/bookings/{booking['id']}", params={"session_id": session_id}
        )
        assert resp.status_code == 200

    def test_get_without_ownership_404(self, client, db_session):
        booking = self._setup_booking(client, db_session)
        resp = client.get(f"/api/bookings/{booking['id']}")
        assert resp.status_code == 404

    def test_get_wrong_code_404(self, client, db_session):
        booking = self._setup_booking(client, db_session)
        resp = client.get(
            f"/api/bookings/{booking['id']}", params={"code": "XXXXXXXX"}
        )
        assert resp.status_code == 404

    def test_get_unknown_booking_404(self, client):
        resp = client.get(f"/api/bookings/{uuid.uuid4()}")
        assert resp.status_code == 404


# --- Cancellation ---


class TestCancelBooking:
    def test_student_can_cancel_pending(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        booking = make_booking(client, slot["id"]).json()
        resp = client.patch(
            f"/api/bookings/{booking['id']}/cancel",
            params={"code": booking["confirmation_code"]},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "CANCELLED"

    def test_slot_rebookable_after_cancel(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        booking = make_booking(client, slot["id"]).json()
        client.patch(
            f"/api/bookings/{booking['id']}/cancel",
            params={"code": booking["confirmation_code"]},
        )
        resp = make_booking(client, slot["id"])
        assert resp.status_code == 201

    def test_cancel_without_ownership_404(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        booking = make_booking(client, slot["id"]).json()
        resp = client.patch(f"/api/bookings/{booking['id']}/cancel")
        assert resp.status_code == 404


# --- Admin status state machine ---


class TestAdminStatus:
    def _confirmed_booking(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        booking = make_booking(client, slot["id"]).json()
        return token, booking

    def _set_status(self, client, token, booking, status):
        return client.patch(
            f"/api/admin/bookings/{booking['id']}/status",
            json={"status": status},
            headers={"Authorization": f"Bearer {token}"},
        )

    def test_admin_requires_auth(self, client, db_session):
        token, booking = self._confirmed_booking(client, db_session)
        resp = self._set_status(client, "bad-token", booking, "CONFIRMED")
        assert resp.status_code == 401

    def test_pending_to_confirmed(self, client, db_session):
        token, booking = self._confirmed_booking(client, db_session)
        resp = self._set_status(client, token, booking, "CONFIRMED")
        assert resp.status_code == 200
        assert resp.json()["status"] == "CONFIRMED"

    def test_pending_to_cancelled(self, client, db_session):
        token, booking = self._confirmed_booking(client, db_session)
        resp = self._set_status(client, token, booking, "CANCELLED")
        assert resp.status_code == 200

    def test_confirmed_to_completed(self, client, db_session):
        token, booking = self._confirmed_booking(client, db_session)
        assert self._set_status(client, token, booking, "CONFIRMED").status_code == 200
        resp = self._set_status(client, token, booking, "COMPLETED")
        assert resp.status_code == 200

    def test_confirmed_to_pending_rejected(self, client, db_session):
        token, booking = self._confirmed_booking(client, db_session)
        assert self._set_status(client, token, booking, "CONFIRMED").status_code == 200
        resp = self._set_status(client, token, booking, "PENDING")
        assert resp.status_code == 409

    def test_cancelled_to_confirmed_rejected(self, client, db_session):
        token, booking = self._confirmed_booking(client, db_session)
        assert self._set_status(client, token, booking, "CANCELLED").status_code == 200
        resp = self._set_status(client, token, booking, "CONFIRMED")
        assert resp.status_code == 409

    def test_completed_to_anything_rejected(self, client, db_session):
        token, booking = self._confirmed_booking(client, db_session)
        assert self._set_status(client, token, booking, "CONFIRMED").status_code == 200
        assert self._set_status(client, token, booking, "COMPLETED").status_code == 200
        assert self._set_status(client, token, booking, "CANCELLED").status_code == 409

    def test_unknown_booking_404(self, client, db_session):
        token = admin_token(client, db_session)
        resp = client.patch(
            f"/api/admin/bookings/{uuid.uuid4()}/status",
            json={"status": "CONFIRMED"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    def test_admin_notes_saved(self, client, db_session):
        token, booking = self._confirmed_booking(client, db_session)
        resp = client.patch(
            f"/api/admin/bookings/{booking['id']}/status",
            json={"status": "CONFIRMED", "admin_notes": "Confirmed via phone"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert resp.json()["admin_notes"] == "Confirmed via phone"


class TestAdminList:
    def test_list_requires_auth(self, client):
        assert client.get("/api/admin/bookings").status_code == 401

    def test_list_returns_bookings(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        for i in range(2):
            slot = create_slot(client, token, counselor["id"], starts_at=future_iso(10 + i)).json()
            make_booking(client, slot["id"], student_name=f"Student {i}")
        resp = client.get(
            "/api/admin/bookings",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body) == 2
        assert all("session_id" not in b for b in body)
        assert all("reason" in b for b in body)  # admin may see reason

    def test_list_filter_by_status(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        make_booking(client, slot["id"]).json()
        resp = client.get(
            "/api/admin/bookings",
            params={"status_filter": "PENDING"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert len(resp.json()) == 1
        resp = client.get(
            "/api/admin/bookings",
            params={"status_filter": "CANCELLED"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert len(resp.json()) == 0

    def test_list_invalid_status_filter_422(self, client, db_session):
        token = admin_token(client, db_session)
        resp = client.get(
            "/api/admin/bookings",
            params={"status_filter": "BOGUS"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422

    def test_admin_list_never_leaks_session_content(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        session_id = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        client.post(
            "/api/chat/message",
            json={"session_id": session_id, "message": "I want to end my life"},
        )
        make_booking(client, slot["id"], session_id=session_id)
        resp = client.get(
            "/api/admin/bookings",
            headers={"Authorization": f"Bearer {token}"},
        )
        blob = str(resp.json()).lower()
        for forbidden in ["session_id", "message_index", "risk_level", "total_score", "response", "crisis"]:
            assert forbidden not in blob, f"leaked {forbidden}: {resp.json()}"


# --- Admin booking detail (F3) ---


class TestAdminBookingDetail:
    """GET /api/admin/bookings/{id} returns exactly one booking, admin-only,
    without session_id or any wellbeing/session content."""

    def _setup(self, client, db_session, **booking_overrides):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        booking = make_booking(client, slot["id"], **booking_overrides).json()
        return token, booking

    def _detail(self, client, token, booking_id):
        return client.get(
            f"/api/admin/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    def test_requires_auth(self, client, db_session):
        _, booking = self._setup(client, db_session)
        resp = client.get(f"/api/admin/bookings/{booking['id']}")
        assert resp.status_code == 401

    def test_fetches_single_booking(self, client, db_session):
        token, booking = self._setup(
            client,
            db_session,
            student_name="A Student",
            contact_email="student@university.edu",
            contact_phone="555-0100",
            reason="Feeling anxious about exams",
        )
        resp = self._detail(client, token, booking["id"])
        assert resp.status_code == 200
        body = resp.json()
        assert body["id"] == booking["id"]
        assert body["confirmation_code"] == booking["confirmation_code"]
        assert body["status"] == "PENDING"
        assert body["student_name"] == "A Student"
        assert body["contact_email"] == "student@university.edu"
        assert body["contact_phone"] == "555-0100"
        assert body["reason"] == "Feeling anxious about exams"

    def test_unknown_booking_404(self, client, db_session):
        token = admin_token(client, db_session)
        resp = self._detail(client, token, str(uuid.uuid4()))
        assert resp.status_code == 404

    def test_malformed_uuid_422(self, client, db_session):
        token = admin_token(client, db_session)
        resp = client.get(
            "/api/admin/bookings/not-a-uuid",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 422

    def test_response_has_no_session_id(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        session_id = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        booking = make_booking(client, slot["id"], session_id=session_id).json()
        resp = self._detail(client, token, booking["id"])
        assert resp.status_code == 200
        body = resp.json()
        assert "session_id" not in body
        assert str(session_id) not in str(body)

    def test_response_has_no_wellbeing_data(self, client, db_session):
        """Privacy regression: even with chat + screening data on the linked
        session, the detail response must never expose it."""
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        session_id = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        client.post(
            "/api/chat/message",
            json={"session_id": session_id, "message": "I want to end my life"},
        )
        client.post(
            "/api/screenings",
            json={
                "session_id": session_id,
                "instrument": "GAD7",
                "responses": [3, 3, 3, 3, 3, 3, 3],
            },
        )
        booking = make_booking(client, slot["id"], session_id=session_id).json()
        resp = self._detail(client, token, booking["id"])
        assert resp.status_code == 200
        blob = str(resp.json()).lower()
        for forbidden in [
            "session_id",
            "message_index",
            "risk_level",
            "category",
            "matched_patterns",
            "total_score",
            "severity",
            "safety_flag",
            "item9_score",
            "response",
            "crisis",
        ]:
            assert forbidden not in blob, f"leaked {forbidden}: {resp.json()}"


# --- Anonymous appointment-status lookup (M7.x) ---


class TestBookingStatusLookup:
    """Public confirmation-code status lookup: minimal, privacy-safe response."""

    def _setup(self, client, db_session, **booking_overrides):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        booking = make_booking(client, slot["id"], **booking_overrides).json()
        return token, booking

    def _set_status(self, client, token, booking, status):
        return client.patch(
            f"/api/admin/bookings/{booking['id']}/status",
            json={"status": status},
            headers={"Authorization": f"Bearer {token}"},
        )

    def _status(self, client, code):
        return client.get(f"/api/bookings/status/{code}")

    def test_valid_lookup_returns_minimal_fields(self, client, db_session):
        _, booking = self._setup(client, db_session)
        resp = self._status(client, booking["confirmation_code"])
        assert resp.status_code == 200
        body = resp.json()
        assert set(body.keys()) == {
            "confirmation_code",
            "status",
            "counselor_name",
            "starts_at",
            "ends_at",
        }
        assert body["confirmation_code"] == booking["confirmation_code"]
        assert body["status"] == "PENDING"
        assert body["counselor_name"] == "Dr. Priya Sharma"

    def test_lookup_is_case_insensitive(self, client, db_session):
        _, booking = self._setup(client, db_session)
        resp = self._status(client, booking["confirmation_code"].lower())
        assert resp.status_code == 200
        assert resp.json()["confirmation_code"] == booking["confirmation_code"]

    def test_unknown_code_404(self, client, db_session):
        self._setup(client, db_session)
        resp = self._status(client, "ZZZZZZZZ")
        assert resp.status_code == 404

    def test_malformed_code_404(self, client, db_session):
        self._setup(client, db_session)
        for bad in ["abc!@#$", "12 34 56 78", "----", "................"]:
            resp = self._status(client, bad)
            assert resp.status_code == 404, f"expected 404 for {bad!r}"

    def test_blank_code_404(self, client, db_session):
        self._setup(client, db_session)
        resp = client.get("/api/bookings/status/%20%20")
        assert resp.status_code == 404

    def test_booking_id_not_accepted_as_code(self, client, db_session):
        """A booking's internal UUID must never be accepted as a lookup code."""
        _, booking = self._setup(client, db_session)
        resp = self._status(client, booking["id"])
        assert resp.status_code == 404

    def test_pending_response(self, client, db_session):
        _, booking = self._setup(client, db_session)
        resp = self._status(client, booking["confirmation_code"])
        assert resp.status_code == 200
        assert resp.json()["status"] == "PENDING"

    def test_confirmed_response(self, client, db_session):
        token, booking = self._setup(client, db_session)
        assert self._set_status(client, token, booking, "CONFIRMED").status_code == 200
        resp = self._status(client, booking["confirmation_code"])
        assert resp.status_code == 200
        assert resp.json()["status"] == "CONFIRMED"

    def test_cancelled_response(self, client, db_session):
        token, booking = self._setup(client, db_session)
        assert self._set_status(client, token, booking, "CANCELLED").status_code == 200
        resp = self._status(client, booking["confirmation_code"])
        assert resp.status_code == 200
        assert resp.json()["status"] == "CANCELLED"

    def test_completed_response(self, client, db_session):
        token, booking = self._setup(client, db_session)
        assert self._set_status(client, token, booking, "CONFIRMED").status_code == 200
        assert self._set_status(client, token, booking, "COMPLETED").status_code == 200
        resp = self._status(client, booking["confirmation_code"])
        assert resp.status_code == 200
        assert resp.json()["status"] == "COMPLETED"

    def test_response_omits_private_fields(self, client, db_session):
        _, booking = self._setup(
            client,
            db_session,
            student_name="A Student",
            contact_email="student@university.edu",
            contact_phone="555-0100",
            reason="Feeling anxious about exams",
        )
        resp = self._status(client, booking["confirmation_code"])
        body = resp.json()
        for forbidden in [
            "session_id",
            "admin_notes",
            "student_name",
            "contact_email",
            "contact_phone",
            "reason",
            "id",
        ]:
            assert forbidden not in body, f"leaked {forbidden}: {body}"

    def test_response_omits_session_content(self, client, db_session):
        """Privacy regression: even with chat + screening data on the linked
        session, the status response must never expose it."""
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        session_id = client.post("/api/sessions", json={"language": "en"}).json()["id"]
        client.post(
            "/api/chat/message",
            json={"session_id": session_id, "message": "I want to end my life"},
        )
        client.post(
            "/api/screenings",
            json={
                "session_id": session_id,
                "instrument": "GAD7",
                "responses": [3, 3, 3, 3, 3, 3, 3],
            },
        )
        booking = make_booking(client, slot["id"], session_id=session_id).json()
        resp = self._status(client, booking["confirmation_code"])
        assert resp.status_code == 200
        blob = str(resp.json()).lower()
        for forbidden in [
            "session_id",
            "message_index",
            "risk_level",
            "category",
            "matched_patterns",
            "total_score",
            "severity",
            "safety_flag",
            "item9_score",
            "response",
            "crisis",
        ]:
            assert forbidden not in blob, f"leaked {forbidden}: {resp.json()}"


# --- Concurrency ---


class TestConcurrency:
    def test_concurrent_same_slot_exactly_one_succeeds(self, client, db_session):
        """Two simultaneous bookings for the same slot: exactly one 201 and one 409."""
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        slot_id = uuid.UUID(slot["id"])

        results = []
        errors = []
        barrier = threading.Barrier(2)

        def attempt(tag: str):
            db = SessionLocal()
            try:
                barrier.wait(timeout=10)
                svc = BookingService(db)
                booking = svc.create_booking(BookingCreate(slot_id=slot_id))
                results.append(tag)
                db.commit()
            except HTTPException as e:
                errors.append((tag, e.status_code))
                db.rollback()
            except Exception as e:  # noqa: BLE001
                errors.append((tag, type(e).__name__))
                db.rollback()
            finally:
                db.close()

        t1 = threading.Thread(target=attempt, args=("A",))
        t2 = threading.Thread(target=attempt, args=("B",))
        t1.start()
        t2.start()
        t1.join(timeout=30)
        t2.join(timeout=30)

        assert len(results) == 1, f"expected exactly one success: {results} {errors}"
        assert [e[1] for e in errors] == [409], f"expected one 409: {errors}"

        db_bookings = db_session.execute(select(BookingModel)).scalars().all()
        assert len(db_bookings) == 1