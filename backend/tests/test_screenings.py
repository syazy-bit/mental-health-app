"""M5 Mental Health Screening System tests.

Covers:
- PHQ-9 scoring & severity boundaries (min 0, max 27, boundaries 4, 5, 9, 10, 14, 15, 19, 20)
- GAD-7 scoring & severity boundaries (min 0, max 21, boundaries 4, 5, 9, 10, 14, 15)
- Validation for invalid response lengths, out-of-bounds values, non-integers
- PHQ-9 Item 9 safety triage (0 -> NO_SAFETY_SIGNAL, 1/2/3 -> POSITIVE_SAFETY_SCREEN + MODERATE, NOT HIGH_RISK)
- Safety follow-up actions (ESCALATE_CRISIS -> HIGH_RISK, SUPPORTIVE_CARE -> MODERATE)
- Persistence & Data Minimization (item9_score set for PHQ9, NULL for GAD7, ZERO raw response vectors stored)
- API endpoint validation (201, 200, 404, 400, 422)
- Transaction boundaries & atomic rollback
"""

import uuid
import pytest
from sqlalchemy import select

from app.models.screening import Screening as ScreeningModel
from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel
from app.screening.instruments import (
    PHQ9Instrument,
    GAD7Instrument,
    InstrumentID,
    ScreeningSafetyState,
    FollowUpAction,
)
from app.services.screenings import ScreeningService
from app.repositories.screenings import ScreeningRepository


# ============================================================================
# 1. PHQ-9 UNIT TESTS (Scoring, Boundaries, Validation)
# ============================================================================

def test_phq9_scoring_and_severity_boundaries():
    """Verify PHQ-9 score calculation and exact severity boundary mappings."""
    inst = PHQ9Instrument()

    # Minimum score = 0 -> Minimal
    res_min = inst.score([0] * 9)
    assert res_min.total_score == 0
    assert res_min.severity == "Minimal"
    assert res_min.safety_flag is False

    # Score = 4 -> Minimal
    res_4 = inst.score([1, 1, 1, 1, 0, 0, 0, 0, 0])
    assert res_4.total_score == 4
    assert res_4.severity == "Minimal"

    # Score = 5 -> Mild
    res_5 = inst.score([1, 1, 1, 1, 1, 0, 0, 0, 0])
    assert res_5.total_score == 5
    assert res_5.severity == "Mild"

    # Score = 9 -> Mild
    res_9 = inst.score([1, 1, 1, 1, 1, 1, 1, 1, 1])
    assert res_9.total_score == 9
    assert res_9.severity == "Mild"

    # Score = 10 -> Moderate
    res_10 = inst.score([2, 1, 1, 1, 1, 1, 1, 1, 1])
    assert res_10.total_score == 10
    assert res_10.severity == "Moderate"

    # Score = 14 -> Moderate
    res_14 = inst.score([2, 2, 2, 2, 2, 2, 2, 0, 0])
    assert res_14.total_score == 14
    assert res_14.severity == "Moderate"

    # Score = 15 -> Moderately severe
    res_15 = inst.score([2, 2, 2, 2, 2, 2, 2, 1, 0])
    assert res_15.total_score == 15
    assert res_15.severity == "Moderately severe"

    # Score = 19 -> Moderately severe
    res_19 = inst.score([3, 3, 3, 3, 3, 2, 2, 0, 0])
    assert res_19.total_score == 19
    assert res_19.severity == "Moderately severe"

    # Score = 20 -> Severe
    res_20 = inst.score([3, 3, 3, 3, 3, 3, 2, 0, 0])
    assert res_20.total_score == 20
    assert res_20.severity == "Severe"

    # Maximum score = 27 -> Severe
    res_max = inst.score([3] * 9)
    assert res_max.total_score == 27
    assert res_max.severity == "Severe"
    assert res_max.safety_flag is True  # Item 9 is 3


def test_phq9_invalid_responses():
    """Verify PHQ-9 validation rejects incorrect length, negative values, and out-of-range items."""
    inst = PHQ9Instrument()

    # Too few responses (8 items)
    with pytest.raises(ValueError, match="requires exactly 9 responses"):
        inst.validate_responses([0] * 8)

    # Too many responses (10 items)
    with pytest.raises(ValueError, match="requires exactly 9 responses"):
        inst.validate_responses([0] * 10)

    # Negative response value (-1)
    with pytest.raises(ValueError, match="must be between 0 and 3"):
        inst.validate_responses([-1, 0, 0, 0, 0, 0, 0, 0, 0])

    # Out of range (> 3)
    with pytest.raises(ValueError, match="must be between 0 and 3"):
        inst.validate_responses([4, 0, 0, 0, 0, 0, 0, 0, 0])

    # Non-integer value
    with pytest.raises(ValueError, match="must be integer"):
        inst.validate_responses(["1", 0, 0, 0, 0, 0, 0, 0, 0])  # type: ignore


# ============================================================================
# 2. GAD-7 UNIT TESTS (Scoring, Boundaries, Validation)
# ============================================================================

def test_gad7_scoring_and_severity_boundaries():
    """Verify GAD-7 score calculation and exact severity boundary mappings."""
    inst = GAD7Instrument()

    # Minimum score = 0 -> Minimal
    res_min = inst.score([0] * 7)
    assert res_min.total_score == 0
    assert res_min.severity == "Minimal"
    assert res_min.safety_flag is False

    # Score = 4 -> Minimal
    res_4 = inst.score([1, 1, 1, 1, 0, 0, 0])
    assert res_4.total_score == 4
    assert res_4.severity == "Minimal"

    # Score = 5 -> Mild
    res_5 = inst.score([1, 1, 1, 1, 1, 0, 0])
    assert res_5.total_score == 5
    assert res_5.severity == "Mild"

    # Score = 9 -> Mild
    res_9 = inst.score([2, 2, 2, 1, 1, 1, 0])
    assert res_9.total_score == 9
    assert res_9.severity == "Mild"

    # Score = 10 -> Moderate
    res_10 = inst.score([2, 2, 2, 2, 1, 1, 0])
    assert res_10.total_score == 10
    assert res_10.severity == "Moderate"

    # Score = 14 -> Moderate
    res_14 = inst.score([2, 2, 2, 2, 2, 2, 2])
    assert res_14.total_score == 14
    assert res_14.severity == "Moderate"

    # Score = 15 -> Severe
    res_15 = inst.score([3, 3, 3, 2, 2, 2, 0])
    assert res_15.total_score == 15
    assert res_15.severity == "Severe"

    # Maximum score = 21 -> Severe
    res_max = inst.score([3] * 7)
    assert res_max.total_score == 21
    assert res_max.severity == "Severe"


def test_gad7_invalid_responses():
    """Verify GAD-7 validation rejects incorrect length, negative values, and out-of-range items."""
    inst = GAD7Instrument()

    # Too few responses (6 items)
    with pytest.raises(ValueError, match="requires exactly 7 responses"):
        inst.validate_responses([0] * 6)

    # Too many responses (8 items)
    with pytest.raises(ValueError, match="requires exactly 7 responses"):
        inst.validate_responses([0] * 8)

    # Negative response value (-1)
    with pytest.raises(ValueError, match="must be between 0 and 3"):
        inst.validate_responses([-1, 0, 0, 0, 0, 0, 0])

    # Out of range (> 3)
    with pytest.raises(ValueError, match="must be between 0 and 3"):
        inst.validate_responses([4, 0, 0, 0, 0, 0, 0])

    # Non-integer value
    with pytest.raises(ValueError, match="must be integer"):
        inst.validate_responses(["1", 0, 0, 0, 0, 0, 0])  # type: ignore


# ============================================================================
# 3. MANDATORY PHQ-9 ITEM 9 SAFETY TRIAGE TESTS
# ============================================================================

def test_phq9_item9_zero_no_safety_signal():
    """Item 9 = 0 -> NO_SAFETY_SIGNAL, safety_flag=False, risk_level=NORMAL."""
    inst = PHQ9Instrument()
    score_res = inst.score([1, 1, 0, 0, 0, 0, 0, 0, 0])  # Item 9 = 0
    assert score_res.safety_flag is False
    assert score_res.item9_score == 0

    safety_assess = inst.assess_safety(item9_score=0)
    assert safety_assess.safety_state == ScreeningSafetyState.NO_SAFETY_SIGNAL
    assert safety_assess.risk_level == "NORMAL"
    assert safety_assess.requires_followup is False


def test_phq9_item9_one_positive_safety_screen():
    """Item 9 = 1 -> POSITIVE_SAFETY_SCREEN, safety_flag=True, risk_level=MODERATE, NOT HIGH_RISK."""
    inst = PHQ9Instrument()
    score_res = inst.score([0, 0, 0, 0, 0, 0, 0, 0, 1])  # Item 9 = 1
    assert score_res.safety_flag is True
    assert score_res.item9_score == 1

    safety_assess = inst.assess_safety(item9_score=1)
    assert safety_assess.safety_state == ScreeningSafetyState.POSITIVE_SAFETY_SCREEN
    assert safety_assess.risk_level == "MODERATE"
    assert safety_assess.risk_level != "HIGH_RISK"  # CRITICAL REQUIREMENT
    assert safety_assess.requires_followup is True
    assert len(safety_assess.safety_resources) > 0


def test_phq9_item9_two_positive_safety_screen():
    """Item 9 = 2 -> POSITIVE_SAFETY_SCREEN, safety_flag=True, risk_level=MODERATE, NOT HIGH_RISK."""
    inst = PHQ9Instrument()
    score_res = inst.score([0, 0, 0, 0, 0, 0, 0, 0, 2])  # Item 9 = 2
    assert score_res.safety_flag is True
    assert score_res.item9_score == 2

    safety_assess = inst.assess_safety(item9_score=2)
    assert safety_assess.safety_state == ScreeningSafetyState.POSITIVE_SAFETY_SCREEN
    assert safety_assess.risk_level == "MODERATE"
    assert safety_assess.risk_level != "HIGH_RISK"  # CRITICAL REQUIREMENT
    assert safety_assess.requires_followup is True


def test_phq9_item9_three_positive_safety_screen():
    """Item 9 = 3 -> POSITIVE_SAFETY_SCREEN, safety_flag=True, risk_level=MODERATE, NOT HIGH_RISK."""
    inst = PHQ9Instrument()
    score_res = inst.score([0, 0, 0, 0, 0, 0, 0, 0, 3])  # Item 9 = 3
    assert score_res.safety_flag is True
    assert score_res.item9_score == 3

    safety_assess = inst.assess_safety(item9_score=3)
    assert safety_assess.safety_state == ScreeningSafetyState.POSITIVE_SAFETY_SCREEN
    assert safety_assess.risk_level == "MODERATE"
    assert safety_assess.risk_level != "HIGH_RISK"  # CRITICAL REQUIREMENT
    assert safety_assess.requires_followup is True


# ============================================================================
# 4. SAFETY FOLLOW-UP TESTS
# ============================================================================

def test_safety_followup_escalate_crisis():
    """ESCALATE_CRISIS -> HIGH_RISK_AFTER_SAFETY_FOLLOWUP -> M3 HIGH_RISK + crisis pathway."""
    inst = PHQ9Instrument()
    current_state = ScreeningSafetyState.POSITIVE_SAFETY_SCREEN

    followup_assess = inst.assess_followup(current_state, FollowUpAction.ESCALATE_CRISIS)
    assert followup_assess.safety_state == ScreeningSafetyState.HIGH_RISK_AFTER_SAFETY_FOLLOWUP
    assert followup_assess.risk_level == "HIGH_RISK"
    assert followup_assess.requires_followup is False
    assert any("14416" in r or "112" in r for r in followup_assess.safety_resources)


def test_safety_followup_supportive_care():
    """SUPPORTIVE_CARE -> remains POSITIVE_SAFETY_SCREEN -> MODERATE, does NOT escalate to HIGH_RISK."""
    inst = PHQ9Instrument()
    current_state = ScreeningSafetyState.POSITIVE_SAFETY_SCREEN

    followup_assess = inst.assess_followup(current_state, FollowUpAction.SUPPORTIVE_CARE)
    assert followup_assess.safety_state == ScreeningSafetyState.POSITIVE_SAFETY_SCREEN
    assert followup_assess.risk_level == "MODERATE"
    assert followup_assess.risk_level != "HIGH_RISK"


def test_safety_followup_invalid_state():
    """Follow-up from NO_SAFETY_SIGNAL raises ValueError."""
    inst = PHQ9Instrument()
    with pytest.raises(ValueError, match="only valid from POSITIVE_SAFETY_SCREEN"):
        inst.assess_followup(ScreeningSafetyState.NO_SAFETY_SIGNAL, FollowUpAction.ESCALATE_CRISIS)


# ============================================================================
# 5. PERSISTENCE & PRIVACY (DATA MINIMIZATION) TESTS
# ============================================================================

def test_screening_persistence_and_privacy(client, db_session):
    """Verify screening model is persisted with summary metrics ONLY (no raw response vectors)."""
    # Create session
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    # Submit PHQ-9 with Item 9 = 1
    phq_payload = {
        "session_id": session_id,
        "instrument": "PHQ9",
        "responses": [1, 0, 2, 1, 0, 0, 1, 0, 1]
    }
    resp = client.post("/api/screenings", json=phq_payload)
    assert resp.status_code in (200, 201)
    screening_id = resp.json()["id"]

    # Query database directly
    screening = db_session.execute(
        select(ScreeningModel).where(ScreeningModel.id == uuid.UUID(screening_id))
    ).scalar_one_or_none()

    assert screening is not None
    assert screening.session_id == uuid.UUID(session_id)
    assert screening.instrument == "PHQ9"
    assert screening.total_score == 6
    assert screening.severity == "Mild"
    assert screening.safety_flag is True
    assert screening.item9_score == 1

    # CRITICAL PRIVACY CHECK: Verify model object has NO raw response vector attribute
    assert not hasattr(screening, "responses")
    assert not hasattr(screening, "raw_responses")
    assert not hasattr(screening, "answers")


def test_gad7_item9_score_is_null(client, db_session):
    """Verify GAD-7 persistence sets item9_score to NULL."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    gad_payload = {
        "session_id": session_id,
        "instrument": "GAD7",
        "responses": [1, 2, 1, 0, 0, 1, 1]
    }
    resp = client.post("/api/screenings", json=gad_payload)
    assert resp.status_code in (200, 201)
    screening_id = resp.json()["id"]

    screening = db_session.execute(
        select(ScreeningModel).where(ScreeningModel.id == uuid.UUID(screening_id))
    ).scalar_one_or_none()

    assert screening is not None
    assert screening.instrument == "GAD7"
    assert screening.total_score == 6
    assert screening.severity == "Mild"
    assert screening.safety_flag is False
    assert screening.item9_score is None  # GAD-7 has no Item 9


# ============================================================================
# 6. API ENDPOINT & VALIDATION TESTS
# ============================================================================

def test_api_valid_phq9_submission(client):
    """HTTP POST /api/screenings with valid PHQ-9 payload."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": "PHQ9", "responses": [0] * 9},
    )
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["session_id"] == session_id
    assert data["instrument"] == "PHQ9"
    assert data["total_score"] == 0
    assert data["severity"] == "Minimal"
    assert data["safety_flag"] is False
    assert data["item9_score"] == 0
    assert data["safety_info"] is None


def test_api_positive_item9_response_payload(client):
    """Positive Item 9 in API submission includes ScreeningSafetyInfo."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": "PHQ9", "responses": [0, 0, 0, 0, 0, 0, 0, 0, 2]},
    )
    assert resp.status_code in (200, 201)
    data = resp.json()
    assert data["safety_flag"] is True
    assert data["item9_score"] == 2
    assert data["safety_info"] is not None
    assert data["safety_info"]["safety_state"] == "POSITIVE_SAFETY_SCREEN"
    assert data["safety_info"]["risk_level"] == "MODERATE"
    assert data["safety_info"]["requires_followup"] is True


def test_api_safety_followup_escalate_crisis(client):
    """HTTP POST /api/screenings/followup with ESCALATE_CRISIS action."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    # First submit screening with Item 9 = 1
    scr_resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": "PHQ9", "responses": [0, 0, 0, 0, 0, 0, 0, 0, 1]},
    )
    screening_id = scr_resp.json()["id"]

    # Submit follow-up ESCALATE_CRISIS
    followup_resp = client.post(
        "/api/screenings/followup",
        json={
            "session_id": session_id,
            "screening_id": screening_id,
            "action": "ESCALATE_CRISIS"
        },
    )
    assert followup_resp.status_code == 200
    data = followup_resp.json()
    assert data["screening_id"] == screening_id
    assert data["action"] == "ESCALATE_CRISIS"
    assert data["new_safety_state"] == "HIGH_RISK_AFTER_SAFETY_FOLLOWUP"
    assert data["new_risk_level"] == "HIGH_RISK"
    assert any("14416" in r or "112" in r for r in data["safety_resources"])


def test_api_safety_followup_supportive_care(client):
    """HTTP POST /api/screenings/followup with SUPPORTIVE_CARE action."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    scr_resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": "PHQ9", "responses": [0, 0, 0, 0, 0, 0, 0, 0, 1]},
    )
    screening_id = scr_resp.json()["id"]

    followup_resp = client.post(
        "/api/screenings/followup",
        json={
            "session_id": session_id,
            "screening_id": screening_id,
            "action": "SUPPORTIVE_CARE"
        },
    )
    assert followup_resp.status_code == 200
    data = followup_resp.json()
    assert data["screening_id"] == screening_id
    assert data["action"] == "SUPPORTIVE_CARE"
    assert data["new_safety_state"] == "POSITIVE_SAFETY_SCREEN"
    assert data["new_risk_level"] == "MODERATE"


def test_api_invalid_session_returns_404(client):
    """Nonexistent session UUID returns 404."""
    fake_id = str(uuid.uuid4())
    resp = client.post(
        "/api/screenings",
        json={"session_id": fake_id, "instrument": "PHQ9", "responses": [0] * 9},
    )
    assert resp.status_code == 404


def test_api_malformed_uuid_rejected(client):
    """Malformed UUID returns 422."""
    resp = client.post(
        "/api/screenings",
        json={"session_id": "not-a-uuid", "instrument": "PHQ9", "responses": [0] * 9},
    )
    assert resp.status_code == 422


def test_api_unsupported_instrument_rejected(client):
    """Unsupported instrument returns 422 (Pydantic validation)."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": "BDI2", "responses": [0] * 9},
    )
    assert resp.status_code == 422


def test_api_invalid_response_values_rejected(client):
    """Out-of-range item value (4) returns 400."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": "PHQ9", "responses": [4, 0, 0, 0, 0, 0, 0, 0, 0]},
    )
    assert resp.status_code == 400


def test_api_invalid_followup_action_rejected(client):
    """Invalid follow-up action string returns 422."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/screenings/followup",
        json={
            "session_id": session_id,
            "screening_id": str(uuid.uuid4()),
            "action": "INVALID_ACTION"
        },
    )
    assert resp.status_code == 422


# ============================================================================
# 7. TRANSACTION ATOMICITY & REPOSITORY TESTS
# ============================================================================

def test_screening_transaction_commit_visible_in_other_session(client, db_session):
    """Successful screening submission commits transaction and is visible across sessions."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/screenings",
        json={"session_id": session_id, "instrument": "GAD7", "responses": [1] * 7},
    )
    assert resp.status_code in (200, 201)
    screening_id = resp.json()["id"]

    # Verify visible in test db_session (separate connection)
    screening = db_session.execute(
        select(ScreeningModel).where(ScreeningModel.id == uuid.UUID(screening_id))
    ).scalar_one_or_none()

    assert screening is not None
    assert screening.total_score == 7
    assert screening.severity == "Mild"


def test_screening_repository_commit_free(db_session):
    """Verify ScreeningRepository does NOT call db.commit() internally."""
    repo = ScreeningRepository(db_session)

    dummy_session_id = uuid.uuid4()

    # We manually create session row in DB
    from app.models.session import Session as SessionModel
    session_obj = SessionModel(id=dummy_session_id, language="en")
    db_session.add(session_obj)
    db_session.flush()

    # Call repository create
    screening = repo.create(
        session_id=dummy_session_id,
        instrument="PHQ9",
        total_score=5,
        severity="Mild",
        safety_flag=False,
        item9_score=0,
    )
    assert screening is not None

    # Rollback transaction - should unstage the repository creation
    db_session.rollback()

    # Query directly - should be 0 rows because repository did NOT commit
    result = db_session.execute(
        select(ScreeningModel).where(ScreeningModel.session_id == dummy_session_id)
    ).scalar_one_or_none()

    assert result is None
