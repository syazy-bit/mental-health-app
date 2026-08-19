"""Admin UI backend extension tests (counselor/slot management).

Covers the approved admin-only API gaps built on top of M7/M8:
- GET  /api/admin/counselors                 (active + inactive)
- PATCH /api/admin/counselors/{id}           (edit / activate / deactivate)
- GET  /api/admin/counselors/{id}/slots      (future slots + booking status)
- DELETE /api/admin/counselors/{id}/slots/{id} (delete unused future slots)
- authoritative slot overlap prevention (incl. concurrency)
- privacy assertions on all new admin responses

Privacy: new admin responses must never contain session_id, chat data,
screening data, risk_level, screening scores, safety evaluations, or student
wellbeing data unrelated to booking.
"""

import threading
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import select

from app.core.db import SessionLocal
from app.models.counselor_slot import CounselorSlot as CounselorSlotModel
from app.repositories.counselor_slots import CounselorSlotRepository
from app.schemas.admin import AdminCreateInternal
from app.schemas.booking import CounselorSlotCreate
from app.services.admin import AdminService
from app.services.booking import BookingService

PRIVACY_FORBIDDEN = [
    "session_id",
    "message_index",
    "risk_level",
    "category",
    "total_score",
    "severity",
    "safety_flag",
    "item9_score",
    "response",
    "crisis",
]


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


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def create_counselor(client, token, **overrides):
    payload = {
        "name": "Dr. Priya Sharma",
        "title": "Staff Counselor",
        "areas_of_support": ["Academic stress", "Anxiety"],
        "bio": "Evidence-based, warm approach.",
        **overrides,
    }
    return client.post(
        "/api/admin/counselors",
        json=payload,
        headers=auth(token),
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
        headers=auth(token),
    )


def make_booking(client, slot_id, **overrides):
    payload = {"slot_id": str(slot_id), **overrides}
    return client.post("/api/bookings", json=payload)


def future_iso(hours=1, minutes=0):
    return (
        datetime.now(timezone.utc) + timedelta(hours=hours, minutes=minutes)
    ).isoformat()


# --- Authorization ---


class TestAuthorization:
    def test_admin_counselor_list_requires_auth(self, client):
        assert client.get("/api/admin/counselors").status_code == 401

    def test_admin_counselor_update_requires_auth(self, client):
        assert (
            client.patch(f"/api/admin/counselors/{uuid.uuid4()}", json={}).status_code
            == 401
        )

    def test_admin_slot_list_requires_auth(self, client):
        assert (
            client.get(f"/api/admin/counselors/{uuid.uuid4()}/slots").status_code == 401
        )

    def test_admin_slot_delete_requires_auth(self, client):
        assert (
            client.delete(
                f"/api/admin/counselors/{uuid.uuid4()}/slots/{uuid.uuid4()}"
            ).status_code
            == 401
        )


# --- Admin counselor list ---


class TestAdminCounselorList:
    def test_lists_active_and_inactive(self, client, db_session):
        token = admin_token(client, db_session)
        create_counselor(client, token, name="Active One", is_active=True)
        create_counselor(client, token, name="Inactive One", is_active=False)
        resp = client.get("/api/admin/counselors", headers=auth(token))
        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()]
        assert "Active One" in names
        assert "Inactive One" in names
        assert all("is_active" in c for c in resp.json())

    def test_public_list_still_hides_inactive(self, client, db_session):
        token = admin_token(client, db_session)
        create_counselor(client, token, name="Hidden", is_active=False)
        pub = client.get("/api/counselors")
        assert all(c["name"] != "Hidden" for c in pub.json())

    def test_admin_list_no_student_data(self, client, db_session):
        token = admin_token(client, db_session)
        create_counselor(client, token)
        resp = client.get("/api/admin/counselors", headers=auth(token))
        blob = str(resp.json()).lower()
        for forbidden in PRIVACY_FORBIDDEN:
            assert forbidden not in blob


# --- Counselor update ---


class TestCounselorUpdate:
    def test_update_fields(self, client, db_session):
        token = admin_token(client, db_session)
        c = create_counselor(client, token).json()
        resp = client.patch(
            f"/api/admin/counselors/{c['id']}",
            json={"title": "Senior Counselor", "areas_of_support": ["Grief", "Anxiety"]},
            headers=auth(token),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["title"] == "Senior Counselor"
        assert body["areas_of_support"] == ["Grief", "Anxiety"]
        assert body["name"] == c["name"]
        assert body["is_active"] is True

    def test_deactivate_and_reactivate(self, client, db_session):
        token = admin_token(client, db_session)
        c = create_counselor(client, token).json()
        resp = client.patch(
            f"/api/admin/counselors/{c['id']}",
            json={"is_active": False},
            headers=auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["is_active"] is False
        pub = client.get("/api/counselors")
        assert all(x["id"] != c["id"] for x in pub.json())
        resp2 = client.patch(
            f"/api/admin/counselors/{c['id']}",
            json={"is_active": True},
            headers=auth(token),
        )
        assert resp2.status_code == 200
        assert resp2.json()["is_active"] is True
        pub2 = client.get("/api/counselors")
        assert any(x["id"] == c["id"] for x in pub2.json())

    def test_clear_bio(self, client, db_session):
        token = admin_token(client, db_session)
        c = create_counselor(client, token).json()
        resp = client.patch(
            f"/api/admin/counselors/{c['id']}",
            json={"bio": ""},
            headers=auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["bio"] is None

    def test_empty_name_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        c = create_counselor(client, token).json()
        resp = client.patch(
            f"/api/admin/counselors/{c['id']}",
            json={"name": "   "},
            headers=auth(token),
        )
        assert resp.status_code == 422

    def test_update_unknown_counselor_404(self, client, db_session):
        token = admin_token(client, db_session)
        resp = client.patch(
            f"/api/admin/counselors/{uuid.uuid4()}",
            json={"title": "X"},
            headers=auth(token),
        )
        assert resp.status_code == 404

    def test_update_no_student_data(self, client, db_session):
        token = admin_token(client, db_session)
        c = create_counselor(client, token).json()
        resp = client.patch(
            f"/api/admin/counselors/{c['id']}",
            json={"title": "Updated"},
            headers=auth(token),
        )
        blob = str(resp.json()).lower()
        for forbidden in PRIVACY_FORBIDDEN:
            assert forbidden not in blob


# --- Admin slot list ---


class TestAdminSlotList:
    def test_lists_future_slots_with_status(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        free = create_slot(client, token, counselor["id"]).json()
        booked = create_slot(
            client,
            token,
            counselor["id"],
            starts_at=future_iso(26),
            ends_at=future_iso(27),
        ).json()
        make_booking(client, booked["id"])
        resp = client.get(
            f"/api/admin/counselors/{counselor['id']}/slots",
            headers=auth(token),
        )
        assert resp.status_code == 200
        slots = resp.json()
        status_by_id = {s["id"]: s["booking_status"] for s in slots}
        assert status_by_id[free["id"]] is None
        assert status_by_id[booked["id"]] == "PENDING"

    def test_confirmed_booking_shows_status(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        booking = make_booking(client, slot["id"]).json()
        client.patch(
            f"/api/admin/bookings/{booking['id']}/status",
            json={"status": "CONFIRMED"},
            headers=auth(token),
        )
        slots = client.get(
            f"/api/admin/counselors/{counselor['id']}/slots",
            headers=auth(token),
        ).json()
        assert slots[0]["booking_status"] == "CONFIRMED"

    def test_cancelled_booking_slot_shows_available(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        booking = make_booking(client, slot["id"]).json()
        client.patch(
            f"/api/admin/bookings/{booking['id']}/status",
            json={"status": "CANCELLED"},
            headers=auth(token),
        )
        slots = client.get(
            f"/api/admin/counselors/{counselor['id']}/slots",
            headers=auth(token),
        ).json()
        assert slots[0]["booking_status"] is None

    def test_excludes_past_slots(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        create_slot(client, token, counselor["id"])  # future
        past_start = datetime.now(timezone.utc) - timedelta(hours=3)
        past_end = past_start + timedelta(hours=1)
        CounselorSlotRepository(db_session).create(
            uuid.UUID(counselor["id"]), past_start, past_end
        )
        db_session.commit()
        slots = client.get(
            f"/api/admin/counselors/{counselor['id']}/slots",
            headers=auth(token),
        ).json()
        assert len(slots) == 1

    def test_inactive_counselor_slots_still_listable_for_admin(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token, is_active=False).json()
        create_slot(client, token, counselor["id"])
        resp = client.get(
            f"/api/admin/counselors/{counselor['id']}/slots",
            headers=auth(token),
        )
        assert resp.status_code == 200

    def test_unknown_counselor_404(self, client, db_session):
        token = admin_token(client, db_session)
        resp = client.get(
            f"/api/admin/counselors/{uuid.uuid4()}/slots",
            headers=auth(token),
        )
        assert resp.status_code == 404

    def test_no_student_data_in_slot_list(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        make_booking(
            client,
            slot["id"],
            student_name="A Student",
            contact_email="student@university.edu",
            contact_phone="555-0100",
            reason="Feeling anxious about exams",
        )
        resp = client.get(
            f"/api/admin/counselors/{counselor['id']}/slots",
            headers=auth(token),
        )
        blob = str(resp.json()).lower()
        for forbidden in PRIVACY_FORBIDDEN + [
            "student_name",
            "contact_email",
            "contact_phone",
            "reason",
        ]:
            assert forbidden not in blob, f"leaked {forbidden}: {blob}"


# --- Slot deletion ---


class TestSlotDeletion:
    def test_delete_unused_future_slot(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        resp = client.delete(
            f"/api/admin/counselors/{counselor['id']}/slots/{slot['id']}",
            headers=auth(token),
        )
        assert resp.status_code == 204
        slots = client.get(
            f"/api/admin/counselors/{counselor['id']}/slots",
            headers=auth(token),
        ).json()
        assert all(s["id"] != slot["id"] for s in slots)

    def test_delete_booked_slot_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        slot = create_slot(client, token, counselor["id"]).json()
        make_booking(client, slot["id"])
        resp = client.delete(
            f"/api/admin/counselors/{counselor['id']}/slots/{slot['id']}",
            headers=auth(token),
        )
        assert resp.status_code == 409

    def test_delete_past_slot_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        past_start = datetime.now(timezone.utc) - timedelta(hours=3)
        slot = CounselorSlotRepository(db_session).create(
            uuid.UUID(counselor["id"]), past_start, past_start + timedelta(hours=1)
        )
        db_session.commit()
        resp = client.delete(
            f"/api/admin/counselors/{counselor['id']}/slots/{slot.id}",
            headers=auth(token),
        )
        assert resp.status_code == 422

    def test_delete_slot_wrong_counselor_404(self, client, db_session):
        token = admin_token(client, db_session)
        c1 = create_counselor(client, token).json()
        c2 = create_counselor(client, token, name="Other").json()
        slot = create_slot(client, token, c1["id"]).json()
        resp = client.delete(
            f"/api/admin/counselors/{c2['id']}/slots/{slot['id']}",
            headers=auth(token),
        )
        assert resp.status_code == 404

    def test_delete_unknown_slot_404(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        resp = client.delete(
            f"/api/admin/counselors/{counselor['id']}/slots/{uuid.uuid4()}",
            headers=auth(token),
        )
        assert resp.status_code == 404


# --- Overlap prevention ---


class TestOverlapPrevention:
    def test_overlapping_slot_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        create_slot(client, token, counselor["id"])  # now+25h to +26h
        resp = create_slot(
            client,
            token,
            counselor["id"],
            starts_at=future_iso(25),
            ends_at=future_iso(26),
        )
        assert resp.status_code == 409

    def test_fully_inside_overlap_rejected(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        create_slot(client, token, counselor["id"])  # now+25h to +26h
        resp = create_slot(
            client,
            token,
            counselor["id"],
            starts_at=future_iso(25, minutes=15),
            ends_at=future_iso(25, minutes=45),
        )
        assert resp.status_code == 409

    def test_adjacent_slots_allowed(self, client, db_session):
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        create_slot(
            client, token, counselor["id"], starts_at=future_iso(25), ends_at=future_iso(26)
        )
        resp = create_slot(
            client, token, counselor["id"], starts_at=future_iso(26), ends_at=future_iso(27)
        )
        assert resp.status_code == 201

    def test_overlap_across_different_counselors_allowed(self, client, db_session):
        token = admin_token(client, db_session)
        c1 = create_counselor(client, token, name="First").json()
        c2 = create_counselor(client, token, name="Second").json()
        create_slot(client, token, c1["id"])
        resp = create_slot(client, token, c2["id"])
        assert resp.status_code == 201


class TestOverlapConcurrency:
    def test_concurrent_overlapping_slots_exactly_one_succeeds(self, client, db_session):
        """Concurrent overlapping slot creation for one counselor:
        exactly one succeeds, the other gets 409 (authoritative via the
        counselor row lock)."""
        token = admin_token(client, db_session)
        counselor = create_counselor(client, token).json()
        counselor_id = uuid.UUID(counselor["id"])

        start = datetime.now(timezone.utc) + timedelta(days=2, hours=9)
        end = start + timedelta(hours=1)

        results = []
        errors = []
        barrier = threading.Barrier(2)

        def attempt(tag: str):
            db = SessionLocal()
            try:
                barrier.wait(timeout=10)
                svc = BookingService(db)
                svc.create_slot(
                    counselor_id, CounselorSlotCreate(starts_at=start, ends_at=end)
                )
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

        db_slots = db_session.execute(
            select(CounselorSlotModel).where(
                CounselorSlotModel.counselor_id == counselor_id
            )
        ).scalars().all()
        assert len(db_slots) == 1