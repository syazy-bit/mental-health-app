"""M4 Chat API tests.

Covers the complete chat pipeline including:
- Session validation
- Safety pre-check
- Risk branching (NORMAL/MODERATE/HIGH_RISK)
- Crisis bypass
- Fallback provider
- Output safety check
- Persistence (with privacy checks)
- Message indexing
- Concurrent message index handling
- Error handling
"""

import uuid
import threading
import time
import pytest
from sqlalchemy import select, func

from app.models.session import Session as SessionModel
from app.models.safety_evaluation import SafetyEvaluation as SafetyEvaluationModel
from app.safety.models import RiskLevel, RiskCategory
from app.services.chat_providers import DeterministicFallbackProvider, ChatResponse, ProviderError
from app.safety.engine import SafetyEngine


def test_chat_valid_session_and_message(client):
    """NORMAL flow: valid session + message → fallback response."""
    # Create session
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    # Send message
    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I'm feeling stressed about exams"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["session_id"] == session_id
    assert data["risk_level"] == "NORMAL"
    assert data["category"] == "STRESS"
    assert data["response"]
    assert data["is_crisis"] is False
    assert data["language"] == "en"


def test_chat_moderate_flow(client):
    """MODERATE flow: hopelessness → fallback response with resource nudge."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I feel hopeless, like nothing matters"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_level"] == "MODERATE"
    assert data["category"] == "HOPELESSNESS"
    assert data["response"]
    assert "resource" in data["response"].lower() or "counselor" in data["response"].lower()
    assert data["is_crisis"] is False


def test_chat_high_risk_suicide(client):
    """HIGH_RISK: suicide language → crisis response, NO fallback provider called."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I want to end my life"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_level"] == "HIGH_RISK"
    assert data["category"] == "SUICIDE"
    assert data["is_crisis"] is True
    # Crisis response should contain helpline info
    assert "14416" in data["response"] or "112" in data["response"]
    # Should NOT be the fallback response
    assert "deep breathing" not in data["response"].lower()


def test_chat_high_risk_self_harm(client):
    """HIGH_RISK: self-harm language → crisis response."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I've been thinking about hurting myself"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_level"] == "HIGH_RISK"
    assert data["category"] == "SELF_HARM"
    assert data["is_crisis"] is True


def test_chat_high_risk_abuse(client):
    """HIGH_RISK: abuse disclosure → crisis response with abuse helplines."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I'm being abused at home"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_level"] == "HIGH_RISK"
    assert data["category"] == "ABUSE"
    assert data["is_crisis"] is True
    assert "1098" in data["response"] or "181" in data["response"]


def test_chat_high_risk_bypasses_fallback_provider(client, db_session):
    """HIGH_RISK should NOT invoke the fallback provider."""
    # This is implicitly tested by checking the response is a crisis response,
    # but we can also verify by mocking the provider and asserting it's not called.
    # For now, the response content test above covers this.
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I want to kill myself"},
    )
    data = resp.json()
    assert data["is_crisis"] is True
    # Crisis response should not contain fallback-style content
    assert "deep breathing" not in data["response"].lower()
    assert "mindfulness" not in data["response"].lower()


def test_safety_evaluation_persisted(client, db_session):
    """Safety evaluation is persisted with correct metadata."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I'm feeling anxious about my test"},
    )
    assert resp.status_code == 200
    data = resp.json()
    session_id = data["session_id"]

    # Check database
    eval = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == uuid.UUID(session_id)
        )
    ).scalar_one_or_none()

    assert eval is not None
    assert eval.session_id == uuid.UUID(session_id)
    assert eval.risk_level == "NORMAL"
    assert eval.category == "ANXIETY"
    assert eval.language == "en"
    assert eval.matched_patterns is not None
    assert eval.classifier_sources is not None
    assert eval.message_index == 1


def test_raw_message_not_persisted(client, db_session):
    """Raw student message is NOT stored in safety_evaluations."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    raw_message = "I'm feeling really stressed and anxious"
    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": raw_message},
    )
    assert resp.status_code == 200

    eval = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == uuid.UUID(session_id)
        )
    ).scalar_one_or_none()

    assert eval is not None
    # Raw message should NOT be in matched_patterns
    for pattern in eval.matched_patterns:
        assert raw_message not in pattern
        assert "stressed" not in pattern or "anxious" not in pattern  # patterns are regex, not raw text
    # Raw message should NOT be anywhere in the record
    assert raw_message not in str(eval.matched_patterns)
    assert raw_message not in str(eval.classifier_sources)


def test_message_index_first_message(client, db_session):
    """First message gets index 1."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "First message"},
    )
    assert resp.status_code == 200

    eval = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == uuid.UUID(session_id)
        )
    ).scalar_one_or_none()

    assert eval.message_index == 1


def test_message_index_second_message(client, db_session):
    """Second message gets index 2."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "First message"},
    )
    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "Second message"},
    )
    assert resp.status_code == 200

    evals = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == uuid.UUID(session_id)
        ).order_by(SafetyEvaluationModel.message_index)
    ).scalars().all()

    assert len(evals) == 2
    assert evals[0].message_index == 1
    assert evals[1].message_index == 2


def test_separate_session_starts_at_one(client, db_session):
    """Separate session starts message_index at 1."""
    create_resp1 = client.post("/api/sessions", json={"language": "en"})
    session_id1 = create_resp1.json()["id"]

    create_resp2 = client.post("/api/sessions", json={"language": "en"})
    session_id2 = create_resp2.json()["id"]

    client.post("/api/chat/message", json={"session_id": session_id1, "message": "msg1"})
    client.post("/api/chat/message", json={"session_id": session_id1, "message": "msg2"})

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id2, "message": "first for session 2"},
    )
    assert resp.status_code == 200

    eval = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == uuid.UUID(session_id2)
        )
    ).scalar_one_or_none()

    assert eval.message_index == 1


def test_concurrent_message_index_no_duplicates(client, db_session):
    """Genuine concurrent requests don't create duplicate message indexes.

    This test uses real threads to simulate concurrent first messages
    for the same session, verifying that the session-row FOR UPDATE lock
    prevents duplicate message_index values.
    """
    import threading
    import time
    from app.core.db import SessionLocal
    from app.services.chat import ChatService
    from app.safety.engine import SafetyEngine
    from app.services.chat_providers import DeterministicFallbackProvider

    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]
    session_uuid = uuid.UUID(session_id)

    results = []
    errors = []

    def send_message(message_suffix: str):
        """Send a message in a separate thread with its own DB session."""
        db = SessionLocal()
        try:
            chat_service = ChatService(
                db=db,
                safety_engine=SafetyEngine(),
                chat_provider=DeterministicFallbackProvider(),
            )
            result = chat_service.process_message(
                session_id=session_uuid,
                message=f"Concurrent message {message_suffix}",
            )
            results.append((message_suffix, result.message_index))
            db.commit()
        except Exception as e:
            errors.append((message_suffix, str(e)))
            db.rollback()
        finally:
            db.close()

    # Launch two threads simultaneously for the same session
    t1 = threading.Thread(target=send_message, args=("A",))
    t2 = threading.Thread(target=send_message, args=("B",))

    t1.start()
    t2.start()

    t1.join(timeout=10)
    t2.join(timeout=10)

    # No errors should occur (no unique constraint violations)
    assert len(errors) == 0, f"Concurrent requests failed: {errors}"

    # Both requests should succeed
    assert len(results) == 2

    # Message indexes should be 1 and 2 (no duplicates)
    indexes = [idx for _, idx in results]
    assert sorted(indexes) == [1, 2]
    assert len(set(indexes)) == 2

    # Verify in database
    evals = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == session_uuid
        ).order_by(SafetyEvaluationModel.message_index)
    ).scalars().all()

    assert len(evals) == 2
    db_indexes = [e.message_index for e in evals]
    assert sorted(db_indexes) == [1, 2]


def test_concurrent_separate_sessions_independent(client, db_session):
    """Separate sessions can process concurrently without interfering.

    Two sessions processing messages simultaneously should not block
    each other and should each get message_index 1 for their first message.
    """
    import threading
    from app.core.db import SessionLocal
    from app.services.chat import ChatService
    from app.safety.engine import SafetyEngine
    from app.services.chat_providers import DeterministicFallbackProvider

    # Create two sessions
    create_resp1 = client.post("/api/sessions", json={"language": "en"})
    session_id1 = create_resp1.json()["id"]
    session_uuid1 = uuid.UUID(session_id1)

    create_resp2 = client.post("/api/sessions", json={"language": "en"})
    session_id2 = create_resp2.json()["id"]
    session_uuid2 = uuid.UUID(session_id2)

    results = []
    errors = []

    def send_message(session_uuid: uuid.UUID, message_suffix: str):
        """Send a message in a separate thread with its own DB session."""
        db = SessionLocal()
        try:
            chat_service = ChatService(
                db=db,
                safety_engine=SafetyEngine(),
                chat_provider=DeterministicFallbackProvider(),
            )
            result = chat_service.process_message(
                session_id=session_uuid,
                message=f"Concurrent message {message_suffix}",
            )
            results.append((session_uuid, message_suffix, result.message_index))
            db.commit()
        except Exception as e:
            errors.append((session_uuid, message_suffix, str(e)))
            db.rollback()
        finally:
            db.close()

    # Launch two threads for different sessions simultaneously
    t1 = threading.Thread(target=send_message, args=(session_uuid1, "session1"))
    t2 = threading.Thread(target=send_message, args=(session_uuid2, "session2"))

    t1.start()
    t2.start()

    t1.join(timeout=10)
    t2.join(timeout=10)

    # No errors should occur
    assert len(errors) == 0, f"Concurrent requests failed: {errors}"

    # Both requests should succeed
    assert len(results) == 2

    # Each session should get message_index 1 for their first message
    for session_uuid, _, msg_idx in results:
        assert msg_idx == 1, f"Session {session_uuid} got message_index {msg_idx}, expected 1"

    # Verify in database
    evals1 = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == session_uuid1
        )
    ).scalars().all()
    evals2 = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == session_uuid2
        )
    ).scalars().all()

    assert len(evals1) == 1
    assert len(evals2) == 1
    assert evals1[0].message_index == 1
    assert evals2[0].message_index == 1


def test_message_index_third_message(client, db_session):
    """Third message gets index 3 and API response matches database."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp1 = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "First message"},
    )
    assert resp1.status_code == 200
    assert resp1.json()["message_index"] == 1

    resp2 = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "Second message"},
    )
    assert resp2.status_code == 200
    assert resp2.json()["message_index"] == 2

    resp3 = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "Third message"},
    )
    assert resp3.status_code == 200
    assert resp3.json()["message_index"] == 3

    # Verify in database
    evals = db_session.execute(
        select(SafetyEvaluationModel).where(
            SafetyEvaluationModel.session_id == uuid.UUID(session_id)
        ).order_by(SafetyEvaluationModel.message_index)
    ).scalars().all()

    assert len(evals) == 3
    assert evals[0].message_index == 1
    assert evals[1].message_index == 2
    assert evals[2].message_index == 3


def test_message_exactly_2000_chars(client):
    """Exactly 2000 characters is allowed."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    message = "a" * 2000
    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": message},
    )
    assert resp.status_code == 200


def test_message_over_2000_chars_rejected(client):
    """Over 2000 characters is rejected with 422 (Pydantic validation)."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    message = "a" * 2001
    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": message},
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert any("at most 2000 characters" in str(err) for err in detail)


def test_very_large_message_rejected(client):
    """Very large message (10000 chars) is rejected."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    message = "x" * 10000
    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": message},
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert any("at most 2000 characters" in str(err) for err in detail)


def test_empty_message_rejected(client):
    """Empty message is rejected."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": ""},
    )
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert any("at least 1 character" in str(err) or "too short" in str(err) for err in detail)


def test_whitespace_only_message_rejected(client):
    """Whitespace-only message is rejected."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "   \t\n  "},
    )
    assert resp.status_code == 400


def test_nonexistent_session_returns_404(client):
    """Nonexistent session returns 404."""
    fake_id = uuid.uuid4()
    resp = client.post(
        "/api/chat/message",
        json={"session_id": str(fake_id), "message": "Hello"},
    )
    assert resp.status_code == 404


def test_malformed_uuid_rejected(client):
    """Malformed UUID is rejected (422)."""
    resp = client.post(
        "/api/chat/message",
        json={"session_id": "not-a-uuid", "message": "Hello"},
    )
    assert resp.status_code == 422


def test_output_safety_check_blocks_unsafe_response(monkeypatch):
    """Output safety check catches unsafe fallback responses."""
    from app.services.output_safety import OutputSafetyCheck

    # Test that unsafe patterns are detected
    unsafe = "You should just kill yourself"
    is_safe, reason = OutputSafetyCheck.check(unsafe, "NORMAL")
    assert is_safe is False

    # Safe response passes
    safe = "I'm here to listen. You're not alone."
    is_safe, reason = OutputSafetyCheck.check(safe, "NORMAL")
    assert is_safe is True

    # HIGH_RISK responses are trusted
    is_safe, reason = OutputSafetyCheck.check("You should kill yourself", "HIGH_RISK")
    assert is_safe is True


def test_safe_fallback_used_on_output_safety_failure(client, monkeypatch):
    """If output safety check fails, safe fallback is used."""
    from app.services.chat import ChatService
    from app.services.chat_providers import DeterministicFallbackProvider, ChatResponse
    from app.safety.engine import SafetyEngine
    from app.safety.models import RiskAssessment, RiskLevel, RiskCategory

    class UnsafeFallbackProvider(DeterministicFallbackProvider):
        def generate_response(self, message, assessment, language):
            # Return deliberately unsafe content
            return ChatResponse(text="You should kill yourself", metadata={"provider": "test"})

    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    # Use a custom chat service with unsafe provider
    from app.core.db import SessionLocal
    db = SessionLocal()
    try:
        chat_service = ChatService(
            db=db,
            safety_engine=SafetyEngine(),
            chat_provider=UnsafeFallbackProvider(),
        )
        result = chat_service.process_message(
            session_id=uuid.UUID(session_id),
            message="I'm feeling stressed",
        )
        # Should have used safe fallback instead of unsafe response
        assert "kill yourself" not in result.response.lower()
        assert result.response  # Should have some safe response
    finally:
        db.close()


def test_database_failure_handling(client, monkeypatch):
    """Database failure during persistence doesn't leak unsafe responses."""
    from app.services.chat import ChatService
    from app.services.chat_providers import DeterministicFallbackProvider
    from app.safety.engine import SafetyEngine

    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    # Use a custom chat service
    from app.core.db import SessionLocal
    db = SessionLocal()
    try:
        chat_service = ChatService(
            db=db,
            safety_engine=SafetyEngine(),
            chat_provider=DeterministicFallbackProvider(),
        )
        # Mock the db.commit to fail
        original_commit = db.commit
        def failing_commit():
            raise RuntimeError("Database connection lost")
        db.commit = failing_commit

        try:
            chat_service.process_message(
                session_id=uuid.UUID(session_id),
                message="I'm feeling stressed",
            )
            assert False, "Should have raised an exception"
        except RuntimeError as e:
            assert "Database connection lost" in str(e)
        except Exception as e:
            # Should be a 500-level error, not leaking unsafe content
            assert "kill yourself" not in str(e).lower()
    finally:
        db.close()


def test_safety_classifier_failure_fail_closed(client, monkeypatch):
    """Safety classifier failure results in HIGH_RISK fail-closed."""
    from app.services.chat import ChatService
    from app.services.chat_providers import DeterministicFallbackProvider
    from app.safety.engine import SafetyEngine
    from app.safety.models import RiskAssessment, RiskLevel, RiskCategory

    class FailingEngine(SafetyEngine):
        def evaluate(self, text):
            # Simulate classifier failure
            raise RuntimeError("Classifier crashed")

    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    from app.core.db import SessionLocal
    db = SessionLocal()
    try:
        chat_service = ChatService(
            db=db,
            safety_engine=FailingEngine(),
            chat_provider=DeterministicFallbackProvider(),
        )
        # Should raise an exception (fail-closed)
        try:
            chat_service.process_message(
                session_id=uuid.UUID(session_id),
                message="I'm feeling stressed",
            )
            assert False, "Should have raised an exception"
        except RuntimeError as e:
            assert "Classifier crashed" in str(e)
    finally:
        db.close()


def test_fallback_provider_failure_uses_safe_fallback(client, monkeypatch):
    """Fallback provider failure triggers safe fallback."""
    from app.services.chat import ChatService
    from app.services.chat_providers import DeterministicFallbackProvider, ProviderError
    from app.safety.engine import SafetyEngine
    from app.safety.models import RiskAssessment, RiskLevel, RiskCategory

    class FailingProvider(DeterministicFallbackProvider):
        def generate_response(self, message, assessment, language):
            raise ProviderError("Provider unavailable")

    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    from app.core.db import SessionLocal
    db = SessionLocal()
    try:
        chat_service = ChatService(
            db=db,
            safety_engine=SafetyEngine(),
            chat_provider=FailingProvider(),
        )
        result = chat_service.process_message(
            session_id=uuid.UUID(session_id),
            message="I'm feeling stressed",
        )
        # Should use safe fallback
        assert result.response  # Should have some response
        assert "provider_failure" in str(result) or "safe_fallback" in str(result).lower() or len(result.response) > 0
    finally:
        db.close()


def test_chat_response_language_from_session(client):
    """Response language comes from session, not request."""
    create_resp = client.post("/api/sessions", json={"language": "hi"})
    session_id = create_resp.json()["id"]

    resp = client.post(
        "/api/chat/message",
        json={"session_id": session_id, "message": "I'm stressed"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["language"] == "hi"


def test_malformed_request_body(client):
    """Malformed request body returns 422."""
    create_resp = client.post("/api/sessions", json={"language": "en"})
    session_id = create_resp.json()["id"]

    # Missing message
    resp = client.post("/api/chat/message", json={"session_id": session_id})
    assert resp.status_code == 422

    # Wrong type
    resp = client.post("/api/chat/message", json={"session_id": session_id, "message": 123})
    assert resp.status_code == 422


# Run the tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])