"""Safety engine domain types: risk levels, categories, and evaluation results."""

from dataclasses import dataclass, field
from enum import Enum


class RiskLevel(str, Enum):
    NORMAL = "NORMAL"
    MODERATE = "MODERATE"
    HIGH_RISK = "HIGH_RISK"


class RiskCategory(str, Enum):
    GENERAL = "GENERAL"
    STRESS = "STRESS"
    BURNOUT = "BURNOUT"
    SLEEP = "SLEEP"
    ANXIETY = "ANXIETY"
    PANIC = "PANIC"
    DEPRESSION = "DEPRESSION"
    HOPELESSNESS = "HOPELESSNESS"
    SELF_HARM = "SELF_HARM"
    SUICIDE = "SUICIDE"
    PASSIVE_SI = "PASSIVE_SI"
    ABUSE = "ABUSE"


@dataclass(frozen=True)
class ClassificationMatch:
    """A single deterministic match produced by a classifier."""

    category: RiskCategory
    pattern: str
    source: str


@dataclass(frozen=True)
class RiskAssessment:
    """Outcome of evaluating one message against the safety engine."""

    level: RiskLevel
    category: RiskCategory
    normalized_text: str
    matched_patterns: tuple[str, ...] = ()
    classifier_sources: tuple[str, ...] = ()

    @property
    def is_high_risk(self) -> bool:
        return self.level is RiskLevel.HIGH_RISK