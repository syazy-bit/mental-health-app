"""Screening instrument abstractions and implementations.

Provides deterministic, validated scoring for PHQ-9 and GAD-7 instruments.
Raw responses are validated, scored, and discarded - only summary metrics persist.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import List


class InstrumentID(str, Enum):
    PHQ9 = "PHQ9"
    GAD7 = "GAD7"


class ScreeningSafetyState(str, Enum):
    """Safety state derived from PHQ-9 Item 9 and follow-up."""
    NO_SAFETY_SIGNAL = "NO_SAFETY_SIGNAL"
    POSITIVE_SAFETY_SCREEN = "POSITIVE_SAFETY_SCREEN"
    HIGH_RISK_AFTER_SAFETY_FOLLOWUP = "HIGH_RISK_AFTER_SAFETY_FOLLOWUP"


class FollowUpAction(str, Enum):
    ESCALATE_CRISIS = "ESCALATE_CRISIS"
    SUPPORTIVE_CARE = "SUPPORTIVE_CARE"


@dataclass(frozen=True)
class ScreeningScoreResult:
    """Result of scoring a screening instrument."""
    total_score: int
    severity: str
    safety_flag: bool
    item9_score: int | None = None


@dataclass(frozen=True)
class ScreeningSafetyAssessment:
    """Safety assessment derived from screening (PHQ-9 Item 9 workflow)."""
    safety_state: ScreeningSafetyState
    risk_level: str  # NORMAL, MODERATE, HIGH_RISK
    item9_score: int
    requires_followup: bool
    supportive_guidance: str
    safety_resources: list[str]


class BaseScreeningInstrument(ABC):
    """Abstract base for screening instruments."""

    @property
    @abstractmethod
    def instrument_id(self) -> InstrumentID:
        """Unique instrument identifier."""
        pass

    @property
    @abstractmethod
    def expected_item_count(self) -> int:
        """Number of items in this instrument."""
        pass

    @property
    @abstractmethod
    def min_response_value(self) -> int:
        """Minimum valid response value."""
        pass

    @property
    @abstractmethod
    def max_response_value(self) -> int:
        """Maximum valid response value."""
        pass

    def validate_responses(self, responses: List[int]) -> None:
        """Validate response array.
        
        Args:
            responses: List of integer responses
            
        Raises:
            ValueError: If validation fails
        """
        if len(responses) != self.expected_item_count:
            raise ValueError(
                f"{self.instrument_id.value} requires exactly "
                f"{self.expected_item_count} responses, got {len(responses)}"
            )
        
        for i, val in enumerate(responses):
            if not isinstance(val, int):
                raise ValueError(
                    f"{self.instrument_id.value} response {i+1} must be integer, "
                    f"got {type(val).__name__}"
                )
            if val < self.min_response_value or val > self.max_response_value:
                raise ValueError(
                    f"{self.instrument_id.value} response {i+1} must be between "
                    f"{self.min_response_value} and {self.max_response_value}, got {val}"
                )

    @abstractmethod
    def calculate_score(self, responses: List[int]) -> int:
        """Calculate total score from validated responses.
        
        Args:
            responses: Validated list of integer responses
            
        Returns:
            Total score
        """
        pass

    @abstractmethod
    def interpret_severity(self, total_score: int) -> str:
        """Interpret severity from total score.
        
        Args:
            total_score: Total score from calculate_score
            
        Returns:
            Severity label
        """
        pass

    def score(self, responses: List[int]) -> ScreeningScoreResult:
        """Validate, score, and interpret in one call.
        
        Args:
            responses: Raw response list
            
        Returns:
            ScreeningScoreResult with all computed fields
        """
        self.validate_responses(responses)
        total = self.calculate_score(responses)
        severity = self.interpret_severity(total)
        return ScreeningScoreResult(
            total_score=total,
            severity=severity,
            safety_flag=False,
            item9_score=None
        )


class PHQ9Instrument(BaseScreeningInstrument):
    """PHQ-9 (Patient Health Questionnaire-9) instrument.
    
    9 items, responses 0-3, timeframe: previous 14 days.
    Total score: 0-27.
    
    Severity:
    0-4: Minimal
    5-9: Mild
    10-14: Moderate
    15-19: Moderately severe
    20-27: Severe
    
    Item 9 (suicidal ideation) triggers safety workflow when > 0.
    """
    
    instrument_id = InstrumentID.PHQ9
    expected_item_count = 9
    min_response_value = 0
    max_response_value = 3
    
    # Item 9 is index 8 (0-based)
    ITEM_9_INDEX = 8

    def calculate_score(self, responses: List[int]) -> int:
        return sum(responses)

    def interpret_severity(self, total_score: int) -> str:
        if total_score <= 4:
            return "Minimal"
        elif total_score <= 9:
            return "Mild"
        elif total_score <= 14:
            return "Moderate"
        elif total_score <= 19:
            return "Moderately severe"
        else:
            return "Severe"

    def score(self, responses: List[int]) -> ScreeningScoreResult:
        self.validate_responses(responses)
        total = self.calculate_score(responses)
        severity = self.interpret_severity(total)
        item9 = responses[self.ITEM_9_INDEX]
        safety_flag = item9 > 0
        return ScreeningScoreResult(
            total_score=total,
            severity=severity,
            safety_flag=safety_flag,
            item9_score=item9
        )

    def assess_safety(self, item9_score: int) -> ScreeningSafetyAssessment:
        """Assess safety state from PHQ-9 Item 9 score.
        
        Per M5 spec:
        - Item 9 = 0 -> NO_SAFETY_SIGNAL
        - Item 9 > 0 -> POSITIVE_SAFETY_SCREEN (MODERATE risk)
        - Follow-up ESCALATE_CRISIS -> HIGH_RISK_AFTER_SAFETY_FOLLOWUP (HIGH_RISK)
        - Follow-up SUPPORTIVE_CARE -> remains POSITIVE_SAFETY_SCREEN
        """
        if item9_score == 0:
            return ScreeningSafetyAssessment(
                safety_state=ScreeningSafetyState.NO_SAFETY_SIGNAL,
                risk_level="NORMAL",
                item9_score=0,
                requires_followup=False,
                supportive_guidance="",
                safety_resources=[]
            )
        
        # Item 9 > 0: POSITIVE_SAFETY_SCREEN
        return ScreeningSafetyAssessment(
            safety_state=ScreeningSafetyState.POSITIVE_SAFETY_SCREEN,
            risk_level="MODERATE",
            item9_score=item9_score,
            requires_followup=True,
            supportive_guidance=(
                "Your responses indicate you may be having thoughts of self-harm or suicide. "
                "You are not alone, and help is available right now. "
                "Please consider reaching out to a crisis helpline or a trusted person."
            ),
            safety_resources=[
                "India: Call 14416 (Tele-MANAS) or 112 (Emergency)",
                "India: Vandrevala Foundation 1860-2662-345 / 1800-2333-330",
                "International: https://findahelpline.com/",
                "If you are in immediate danger, call emergency services (112 in India)"
            ]
        )

    def assess_followup(
        self,
        current_state: ScreeningSafetyState,
        action: FollowUpAction
    ) -> ScreeningSafetyAssessment:
        """Assess safety state after follow-up action."""
        if current_state != ScreeningSafetyState.POSITIVE_SAFETY_SCREEN:
            raise ValueError("Follow-up only valid from POSITIVE_SAFETY_SCREEN state")
        
        if action == FollowUpAction.ESCALATE_CRISIS:
            return ScreeningSafetyAssessment(
                safety_state=ScreeningSafetyState.HIGH_RISK_AFTER_SAFETY_FOLLOWUP,
                risk_level="HIGH_RISK",
                item9_score=0,  # Original item9 preserved in screening record
                requires_followup=False,
                supportive_guidance=(
                    "You indicated current or imminent danger. "
                    "Please connect with crisis support immediately."
                ),
                safety_resources=[
                    "India: Call 14416 (Tele-MANAS) or 112 (Emergency) NOW",
                    "India: Vandrevala Foundation 1860-2662-345 / 1800-2333-330",
                    "International: https://findahelpline.com/",
                    "Go to nearest emergency department"
                ]
            )
        else:  # SUPPORTIVE_CARE
            return ScreeningSafetyAssessment(
                safety_state=ScreeningSafetyState.POSITIVE_SAFETY_SCREEN,
                risk_level="MODERATE",
                item9_score=0,
                requires_followup=True,
                supportive_guidance=(
                    "Thank you for sharing. You don't have to face this alone. "
                    "Consider reaching out to a counselor or trusted person. "
                    "Professional support is available."
                ),
                safety_resources=[
                    "India: Call 14416 (Tele-MANAS) for support",
                    "India: Vandrevala Foundation 1860-2662-345 / 1800-2333-330",
                    "International: https://findahelpline.com/",
                    "Consider scheduling a session with a counselor"
                ]
            )


class GAD7Instrument(BaseScreeningInstrument):
    """GAD-7 (Generalized Anxiety Disorder-7) instrument.
    
    7 items, responses 0-3, timeframe: previous 14 days.
    Total score: 0-21.
    
    Severity:
    0-4: Minimal
    5-9: Mild
    10-14: Moderate
    15-21: Severe
    """
    
    instrument_id = InstrumentID.GAD7
    expected_item_count = 7
    min_response_value = 0
    max_response_value = 3

    def calculate_score(self, responses: List[int]) -> int:
        return sum(responses)

    def interpret_severity(self, total_score: int) -> str:
        if total_score <= 4:
            return "Minimal"
        elif total_score <= 9:
            return "Mild"
        elif total_score <= 14:
            return "Moderate"
        else:
            return "Severe"


# Registry of available instruments
INSTRUMENTS: dict[InstrumentID, BaseScreeningInstrument] = {
    InstrumentID.PHQ9: PHQ9Instrument(),
    InstrumentID.GAD7: GAD7Instrument(),
}


def get_instrument(instrument_id: InstrumentID) -> BaseScreeningInstrument:
    """Get instrument by ID."""
    if instrument_id not in INSTRUMENTS:
        raise ValueError(f"Unsupported instrument: {instrument_id}")
    return INSTRUMENTS[instrument_id]