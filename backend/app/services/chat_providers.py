"""Chat response providers.

This module provides an abstraction for generating chat responses.
The DeterministicFallbackProvider is the M4 implementation; future
milestones can swap in LLM-based providers without changing the pipeline.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.safety.models import RiskAssessment, RiskCategory, RiskLevel


@dataclass(frozen=True)
class ChatResponse:
    """Response from a chat provider."""

    text: str
    # Optional metadata for future use (e.g., model name, tokens)
    metadata: dict = None


class ChatResponseProvider(ABC):
    """Abstract interface for chat response generation.

    Future implementations (LLMProvider, etc.) must implement this interface.
    The pipeline depends on this abstraction, not on a concrete provider.
    """

    @abstractmethod
    def generate_response(
        self,
        message: str,
        assessment: "RiskAssessment",
        language: str = "en",
    ) -> ChatResponse:
        """Generate a response for a NORMAL or MODERATE risk assessment.

        Args:
            message: The student's message
            assessment: The safety assessment result
            language: The session language

        Returns:
            A ChatResponse with the generated text

        Raises:
            ProviderError: If generation fails
        """
        ...


class ProviderError(Exception):
    """Raised when a chat provider fails to generate a response."""
    pass


class DeterministicFallbackProvider(ChatResponseProvider):
    """Deterministic fallback response provider for M4.

    Uses the same keyword-based logic as the v0 prototype but with
    improved tone and safety integration. This provider NEVER handles
    HIGH_RISK assessments - those are handled by the crisis pathway.
    """

    # Response templates adapted from v0 with warm, non-clinical tone
    _RESPONSES = {
        "anxiety": (
            "It sounds like you might be feeling anxious. Remember, it's OK to feel this way. "
            "You could try deep breathing or mindfulness exercises. If anxiety persists, consider talking to a counselor."
        ),
        "stress": (
            "Stress can build up when things get overwhelming. Try taking breaks, doing a short walk, "
            "or listening to calming music. Organizing your tasks and keeping a routine can help reduce stress."
        ),
        "burnout": (
            "Burnout happens when you've been overworking for too long. It might help to take some time off, "
            "do something enjoyable (like a hobby or nature walk), and talk with someone supportive."
        ),
        "sleep": (
            "Sleep issues are common under stress. Maintaining a regular sleep schedule and a relaxing bedtime routine (no screens) can help. "
            "If sleeplessness continues, consider talking with a health professional."
        ),
        "depression": (
            "I'm sorry you're feeling down. Talking with someone you trust can help. "
            "Small steps like going for a walk, doing a hobby, or keeping a journal can ease low moods. You are not alone and help is available."
        ),
        "panic": (
            "Panic attacks can be really frightening, but they do pass. Try grounding techniques like the 5-4-3-2-1 method: "
            "name 5 things you see, 4 things you feel, 3 things you hear, 2 things you smell, 1 thing you taste. "
            "If panic attacks are frequent, consider reaching out to a counselor."
        ),
        "hopelessness": (
            "Feeling hopeless is really heavy, and you don't have to carry it alone. "
            "These feelings can change with the right support. Consider reaching out to someone you trust or a counselor. "
            "You matter, and things can get better."
        ),
        "general": (
            "I'm here to listen. It might help to express what you're feeling or try a relaxation technique. "
            "If you're comfortable, consider reaching out to someone you trust or scheduling a session with a counselor. You're not alone."
        ),
    }

    # Mapping from RiskCategory to response key
    _CATEGORY_TO_RESPONSE_KEY = {
        "ANXIETY": "anxiety",
        "STRESS": "stress",
        "BURNOUT": "burnout",
        "SLEEP": "sleep",
        "DEPRESSION": "depression",
        "PANIC": "panic",
        "HOPELESSNESS": "hopelessness",
        "GENERAL": "general",
        "BURNOUT": "burnout",
        "SLEEP": "sleep",
    }

    def generate_response(
        self,
        message: str,
        assessment: "RiskAssessment",
        language: str = "en",
    ) -> "ChatResponse":
        """Generate a deterministic fallback response based on the assessment category.

        This provider MUST NOT be called for HIGH_RISK assessments.
        """
        if assessment.level == "HIGH_RISK":
            raise ProviderError("DeterministicFallbackProvider cannot handle HIGH_RISK assessments")

        # Map category to response key
        response_key = self._CATEGORY_TO_RESPONSE_KEY.get(
            assessment.category, "general"
        )
        response_text = self._RESPONSES.get(response_key, self._RESPONSES["general"])

        # For MODERATE risk, add a gentle nudge toward resources
        if assessment.level == "MODERATE":
            resource_nudge = (
                "\n\nIf you'd like, I can help you find some resources or connect you "
                "with a counselor who can offer more personalized support."
            )
            response_text += resource_nudge

        return ChatResponse(
            text=response_text,
            metadata={
                "provider": "deterministic_fallback",
                "category": assessment.category,
                "risk_level": assessment.level,
            },
        )