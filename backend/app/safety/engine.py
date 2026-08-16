"""The SafetyEngine: orchestrates normalization -> classification -> risk decision.

Deterministic and fully independent of any LLM. New classifiers implement the
RiskClassifier protocol and are passed to the engine constructor.

P0-3: Enforces maximum input length at engine boundary (fail-fast).
Additional Safety Fix: Classifier failures fail closed (HIGH_RISK) to prevent
safety bypass.
"""

from app.safety.classifiers.base import RiskClassifier
from app.safety.classifiers.keyword_classifier import KeywordClassifier
from app.safety.models import (
    RiskAssessment,
    RiskCategory,
    RiskLevel,
)
from app.safety.normalizers import normalize_text

MAX_INPUT_LENGTH = 2000

CATEGORY_RISK_LEVELS: dict[RiskCategory, RiskLevel] = {
    RiskCategory.SUICIDE: RiskLevel.HIGH_RISK,
    RiskCategory.SELF_HARM: RiskLevel.HIGH_RISK,
    RiskCategory.PASSIVE_SI: RiskLevel.HIGH_RISK,
    RiskCategory.ABUSE: RiskLevel.HIGH_RISK,
    RiskCategory.HOPELESSNESS: RiskLevel.MODERATE,
    RiskCategory.DEPRESSION: RiskLevel.MODERATE,
    RiskCategory.PANIC: RiskLevel.MODERATE,
    RiskCategory.ANXIETY: RiskLevel.NORMAL,
    RiskCategory.STRESS: RiskLevel.NORMAL,
    RiskCategory.BURNOUT: RiskLevel.NORMAL,
    RiskCategory.SLEEP: RiskLevel.NORMAL,
    RiskCategory.GENERAL: RiskLevel.NORMAL,
}

_RISK_LEVEL_ORDER = {
    RiskLevel.NORMAL: 0,
    RiskLevel.MODERATE: 1,
    RiskLevel.HIGH_RISK: 2,
}


class SafetyEngine:
    def __init__(self, classifiers: list[RiskClassifier] | None = None) -> None:
        self.classifiers: list[RiskClassifier] = (
            list(classifiers) if classifiers else [KeywordClassifier()]
        )

    def evaluate(self, text: str) -> RiskAssessment:
        """Classify free text into a risk assessment.

        Raises:
            ValueError: If input exceeds MAX_INPUT_LENGTH characters.
        """
        # P0-3: Input length limit enforced at engine boundary (fail-fast)
        if len(text) > MAX_INPUT_LENGTH:
            raise ValueError(
                f"Input text exceeds maximum length of {MAX_INPUT_LENGTH} characters"
            )

        normalized = normalize_text(text)
        if not normalized or normalized.strip() == "":
            return RiskAssessment(RiskLevel.NORMAL, RiskCategory.GENERAL, normalized)

        matches: list = []
        classifier_failed = False

        # Additional Safety Fix: Classifier failures fail closed (HIGH_RISK)
        # to prevent safety bypass. We catch exceptions, record the failure,
        # and continue with other classifiers. If all fail, fail closed.
        for classifier in self.classifiers:
            try:
                matches.extend(classifier.classify(normalized))
            except Exception:
                classifier_failed = True
                # Record the failure source for debugging/transparency
                matches.append(
                    type("FailureMatch", (), {
                        "category": RiskCategory.GENERAL,
                        "pattern": f"classifier_failure:{classifier.source}",
                        "source": classifier.source,
                    })()
                )

        if classifier_failed and not any(
            m.category != RiskCategory.GENERAL
            or getattr(m, "pattern", "").startswith("classifier_failure")
            for m in matches
        ):
            # All classifiers failed or only failures recorded -> fail closed
            return RiskAssessment(
                level=RiskLevel.HIGH_RISK,
                category=RiskCategory.GENERAL,
                normalized_text=normalized,
                matched_patterns=("classifier_failure:all",),
                classifier_sources=("safety_engine",),
            )

        if not matches:
            return RiskAssessment(RiskLevel.NORMAL, RiskCategory.GENERAL, normalized)

        # Filter out failure markers for risk calculation
        valid_matches = [
            m for m in matches
            if not getattr(m, "pattern", "").startswith("classifier_failure")
        ]

        if not valid_matches:
            # Only failure markers present
            if classifier_failed:
                return RiskAssessment(
                    level=RiskLevel.HIGH_RISK,
                    category=RiskCategory.GENERAL,
                    normalized_text=normalized,
                    matched_patterns=("classifier_failure:all",),
                    classifier_sources=("safety_engine",),
                )
            return RiskAssessment(RiskLevel.NORMAL, RiskCategory.GENERAL, normalized)

        highest = max(
            valid_matches,
            key=lambda m: _RISK_LEVEL_ORDER[CATEGORY_RISK_LEVELS[m.category]],
        )

        # Include failure info in sources if any classifier failed
        sources = set(m.source for m in valid_matches)
        if classifier_failed:
            sources.add("classifier_failure")

        return RiskAssessment(
            level=CATEGORY_RISK_LEVELS[highest.category],
            category=highest.category,
            normalized_text=normalized,
            matched_patterns=tuple(m.pattern for m in valid_matches),
            classifier_sources=tuple(sorted(sources)),
        )