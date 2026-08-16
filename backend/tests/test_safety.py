"""Unit tests for the deterministic safety engine (no database, no LLM)."""

import pytest

from app.safety.engine import SafetyEngine
from app.safety.models import RiskCategory, RiskLevel
from app.safety.crisis import select_crisis_response
from app.safety.normalizers import normalize_text

engine = SafetyEngine()


def evaluate(text: str):
    return engine.evaluate(text)


# --- P0-1: Unicode normalization tests ---


def test_normalize_preserves_english():
    assert normalize_text("Hello World") == "hello world"


def test_normalize_preserves_hindi_devanagari():
    # "I am stressed" in Hindi
    hindi = "मैं तनाव में हूँ"
    normalized = normalize_text(hindi)
    assert normalized == hindi  # casefold no-op for Devanagari
    assert "मैं" in normalized
    assert "तनाव" in normalized


def test_normalize_preserves_assamese_bengali():
    # "I am stressed" in Assamese
    assamese = "মই মানসিক চাপত আছোঁ"
    normalized = normalize_text(assamese)
    assert normalized == assamese
    assert "মানসিক" in normalized
    assert "চাপত" in normalized


def test_normalize_mixed_english_hindi():
    mixed = "I am तनाव में हूँ stressed"
    normalized = normalize_text(mixed)
    assert "i am" in normalized
    assert "तनाव" in normalized
    assert "stressed" in normalized


def test_normalize_mixed_english_assamese():
    mixed = "I am মানসিক চাপত stressed"
    normalized = normalize_text(mixed)
    assert "i am" in normalized
    assert "মানসিক" in normalized
    assert "stressed" in normalized


def test_normalize_unicode_punctuation():
    # Various Unicode punctuation should be normalized to space or preserved
    text = "Hello… world—how are you?"
    normalized = normalize_text(text)
    # Ellipsis, em-dash become spaces
    assert "hello" in normalized
    assert "world" in normalized
    assert "how" in normalized
    assert "you" in normalized


def test_normalize_empty_input():
    assert normalize_text("") == ""
    assert normalize_text("   ") == " "
    assert normalize_text("\t\n\r") == " "


def test_normalize_preserves_contractions_hyphens():
    assert "don't" in normalize_text("I don't know")
    assert "self-harm" in normalize_text("self-harm")
    assert "can't" in normalize_text("I can't stop")


# --- NORMAL ---


def test_normal_student_stress():
    assessment = evaluate("I'm so stressed about my exams and deadlines")
    assert assessment.level is RiskLevel.NORMAL
    assert assessment.category is RiskCategory.STRESS


def test_anxiety_is_normal_risk():
    assessment = evaluate("I keep feeling anxious and worried before class")
    assert assessment.level is RiskLevel.NORMAL
    assert assessment.category is RiskCategory.ANXIETY


def test_ambiguous_message_is_normal():
    assessment = evaluate("I had a really bad day but I'll be okay")
    assert assessment.level is RiskLevel.NORMAL
    assert assessment.category is RiskCategory.GENERAL


def test_empty_input_is_normal():
    assessment = evaluate("   ")
    assert assessment.level is RiskLevel.NORMAL


# --- MODERATE ---


def test_hopelessness_is_moderate():
    assessment = evaluate("I feel hopeless, like nothing I do matters")
    assert assessment.level is RiskLevel.MODERATE
    assert assessment.category is RiskCategory.HOPELESSNESS


def test_depression_is_moderate():
    assessment = evaluate("I've been feeling really depressed lately")
    assert assessment.level is RiskLevel.MODERATE
    assert assessment.category is RiskCategory.DEPRESSION


def test_panic_attack_is_moderate():
    assessment = evaluate("I had a panic attack in class today")
    assert assessment.level is RiskLevel.MODERATE
    assert assessment.category is RiskCategory.PANIC


# --- HIGH_RISK ---


def test_self_harm_language_is_high_risk():
    assessment = evaluate("I've been thinking about hurting myself")
    assert assessment.level is RiskLevel.HIGH_RISK
    assert assessment.category is RiskCategory.SELF_HARM
    assert assessment.is_high_risk


def test_suicide_language_is_high_risk():
    assessment = evaluate("I want to end my life")
    assert assessment.level is RiskLevel.HIGH_RISK
    assert assessment.category is RiskCategory.SUICIDE


def test_passive_suicidal_ideation_is_high_risk():
    assessment = evaluate("there's no point in living anymore")
    assert assessment.level is RiskLevel.HIGH_RISK
    assert assessment.category is RiskCategory.PASSIVE_SI


def test_abuse_disclosure_is_high_risk():
    assessment = evaluate("I'm being abused at home")
    assert assessment.level is RiskLevel.HIGH_RISK
    assert assessment.category is RiskCategory.ABUSE


def test_high_risk_overrides_moderate_and_normal():
    assessment = evaluate("I'm stressed about exams but I also want to hurt myself")
    assert assessment.level is RiskLevel.HIGH_RISK
    assert assessment.category is RiskCategory.SELF_HARM
    assert any("stress" in pattern for pattern in assessment.matched_patterns)


# --- P0-2: Negation logic tests ---


def test_negation_genuine_suicide_negation():
    """Legitimate negation: 'I don't want to kill myself' -> not HIGH_RISK"""
    assessment = evaluate("I don't want to kill myself anymore, I'm getting help")
    assert assessment.level is not RiskLevel.HIGH_RISK


def test_negation_genuine_self_harm_negation():
    assessment = evaluate("I would never want to hurt myself, that scares me")
    assert assessment.level is not RiskLevel.HIGH_RISK


def test_negation_false_positive_cant_stop():
    """'I can't stop thinking about hurting myself' -> STILL HIGH_RISK (inability to stop = ongoing intent)"""
    assessment = evaluate("I can't stop thinking about hurting myself")
    assert assessment.level is RiskLevel.HIGH_RISK
    assert assessment.category is RiskCategory.SELF_HARM


def test_negation_false_positive_unable_to_stop():
    assessment = evaluate("I am unable to stop thinking about suicide")
    assert assessment.level is RiskLevel.HIGH_RISK
    assert assessment.category is RiskCategory.SUICIDE


def test_negation_false_positive_without_help():
    """'I have no one to help me, I want to die' -> STILL HIGH_RISK"""
    assessment = evaluate("I have no one to help me, I want to end my life")
    assert assessment.level is RiskLevel.HIGH_RISK


def test_negation_false_positive_no_one():
    assessment = evaluate("There is no one who cares, I want to kill myself")
    assert assessment.level is RiskLevel.HIGH_RISK


def test_negation_false_positive_no_way_out():
    assessment = evaluate("I see no way out, I want to hurt myself")
    assert assessment.level is RiskLevel.HIGH_RISK


def test_negation_false_positive_conditional_no_help():
    """'If no one helps me I will hurt myself' -> STILL HIGH_RISK"""
    assessment = evaluate("If no one helps me I will hurt myself")
    assert assessment.level is RiskLevel.HIGH_RISK


def test_negation_legitimate_benign():
    """Benign negations should still work: 'I don't want to harm my grades' -> NORMAL"""
    assessment = evaluate("I don't want to harm my grades")
    assert assessment.level is RiskLevel.NORMAL


def test_negation_legitimate_benign2():
    assessment = evaluate("I would never hurt anyone else")
    assert assessment.level is RiskLevel.NORMAL


def test_negation_uncertainty():
    """'I'm not sure if I want to hurt myself' -> ambiguous, should NOT be negated to normal"""
    assessment = evaluate("I'm not sure if I want to hurt myself")
    # Uncertainty about intent is still a risk signal
    assert assessment.level is RiskLevel.HIGH_RISK


# --- False positives (existing) ---


def test_false_positive_accidental_injury():
    assessment = evaluate("I hurt myself playing football last week")
    assert assessment.level is RiskLevel.NORMAL


def test_false_positive_non_suicidal_suicide_mention_in_help_context():
    assessment = evaluate("The doctor says I don't want to die, but recovery takes time")
    assert assessment.level is not RiskLevel.HIGH_RISK


# --- P0-3: Input length limit tests ---


MAX_INPUT_LENGTH = 2000


def test_input_length_exactly_max():
    text = "a" * MAX_INPUT_LENGTH
    # Should not raise, should process normally
    assessment = evaluate(text)
    assert assessment.level is RiskLevel.NORMAL


def test_input_length_over_max():
    text = "a" * (MAX_INPUT_LENGTH + 1)
    # Should raise validation error at engine boundary
    with pytest.raises(ValueError, match="exceeds maximum length"):
        evaluate(text)


def test_input_length_very_large():
    text = "x" * 10000
    with pytest.raises(ValueError, match="exceeds maximum length"):
        evaluate(text)


# --- Additional Safety Fix: Classifier failure ---


def test_classifier_failure_returns_high_risk_fail_closed():
    """When a classifier throws, engine should fail closed (HIGH_RISK) to prevent bypass."""
    from app.safety.models import ClassificationMatch, RiskCategory

    class FailingClassifier:
        source = "failing"

        def classify(self, normalized_text: str):
            raise RuntimeError("Classifier crashed")

    failing_engine = SafetyEngine(classifiers=[FailingClassifier()])
    assessment = failing_engine.evaluate("any text")
    assert assessment.level is RiskLevel.HIGH_RISK
    assert assessment.category == RiskCategory.GENERAL  # fallback
    # Engine marks failure with special pattern and source
    assert any("classifier_failure" in p for p in assessment.matched_patterns)
    assert "safety_engine" in assessment.classifier_sources


def test_classifier_failure_with_other_classifiers():
    """If one classifier fails but others work, engine should still process valid ones AND include failure signal."""
    from app.safety.models import ClassificationMatch, RiskCategory

    class PartialFailingClassifier:
        source = "partial_fail"

        def classify(self, normalized_text: str):
            if "crash" in normalized_text:
                raise RuntimeError("Boom")
            return [ClassificationMatch(RiskCategory.STRESS, "custom:stress", self.source)]

    custom_engine = SafetyEngine(classifiers=[PartialFailingClassifier()])
    # Normal case works
    assessment = custom_engine.evaluate("so much homework stress")
    assert assessment.category is RiskCategory.STRESS
    # Crash case: should still produce HIGH_RISK fail-closed
    crash_assessment = custom_engine.evaluate("crash me")
    assert crash_assessment.level is RiskLevel.HIGH_RISK


# --- Classifier interface / extensibility ---


def test_custom_classifier_can_be_injected():
    from app.safety.models import ClassificationMatch

    class CustomClassifier:
        source = "custom"

        def classify(self, normalized_text: str):
            if "homework" in normalized_text:
                return [ClassificationMatch(RiskCategory.STRESS, "custom:homework", self.source)]
            return []

    custom_engine = SafetyEngine(classifiers=[CustomClassifier()])
    assessment = custom_engine.evaluate("so much homework")
    assert assessment.category is RiskCategory.STRESS
    assert "custom" in assessment.classifier_sources
    assert custom_engine.evaluate("just relaxing today").level is RiskLevel.NORMAL


# --- Crisis pathway ---


def test_crisis_response_selected_for_high_risk():
    assessment = evaluate("I want to end my life")
    crisis = select_crisis_response(assessment)
    assert crisis.message
    assert len(crisis.helplines) >= 1
    assert any("14416" in line for line in crisis.helplines)
    assert any("112" in line for line in crisis.helplines)


def test_crisis_response_category_specific_for_abuse():
    assessment = evaluate("I'm being abused at home")
    crisis = select_crisis_response(assessment)
    assert crisis.category is RiskCategory.ABUSE
    assert any("1098" in line or "181" in line for line in crisis.helplines)


def test_crisis_response_rejected_for_non_high_risk():
    assessment = evaluate("I'm a bit stressed about an assignment")
    with pytest.raises(ValueError):
        select_crisis_response(assessment)