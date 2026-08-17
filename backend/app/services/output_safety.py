"""Output safety check for chat responses.

Ensures that generated responses don't contain unsafe content before
returning them to the student.
"""

import re

from app.safety.models import RiskLevel, RiskCategory


class OutputSafetyCheck:
    """Deterministic output safety check for generated responses.

    This is a defense-in-depth layer that catches any unsafe content
    that might slip through the fallback provider (defense in depth).
    """

    # Patterns that should NEVER appear in a response to a student
    _UNSAFE_PATTERNS = [
        # Self-harm encouragement
        re.compile(r"\b(you should|you must|go ahead and)\s+(kill|hurt|harm)\s+yourself\b", re.I),
        re.compile(r"\b(go\s+)?kill\s+yourself\b", re.I),
        # Dismissive of crisis
        re.compile(r"\b(it'?s\s+not\s+a\s+big\s+deal|just\s+get\s+over\s+it|stop\s+being\s+dramatic)\b", re.I),
        # Medical advice (prescribing)
        re.compile(r"\b(take|prescribe|dosage|mg|medication)\b.*\b(antidepressant|anxiolytic|benzodiazepine|ssri|snri)\b", re.I),
        # Dismissing professional help
        re.compile(r"\b(don'?t\s+(need|bother)\s+(seeing|going\s+to)\s+(a\s+)?(therapist|counselor|doctor|professional))\b", re.I),
    ]

    # Patterns that indicate the response is a crisis response (should be allowed)
    _CRISIS_INDICATORS = [
        "112",
        "14416",
        "1800-599-0019",
        "98204",
        "1860-2662-345",
        "1098",
        "181",
        "emergency",
        "hospital",
        "helpline",
        "crisis",
    ]

    @classmethod
    def check(cls, response_text: str, risk_level: str) -> tuple[bool, str]:
        """Check if a response is safe to return.

        Args:
            response_text: The generated response text
            risk_level: The risk level of the original assessment (NORMAL, MODERATE, HIGH_RISK)

        Returns:
            Tuple of (is_safe, reason_if_unsafe)
        """
        # For HIGH_RISK, the response is a predetermined crisis response
        # which we trust (it comes from the crisis module)
        if risk_level == "HIGH_RISK":
            return True, "HIGH_RISK crisis response trusted"

        text_lower = response_text.lower()

        # Check for crisis indicators - if present, might be a crisis response that leaked through
        crisis_indicator_count = sum(1 for indicator in cls._CRISIS_INDICATORS if indicator in response_text.lower())
        if crisis_indicator_count >= 2:
            # This looks like a crisis response but risk level is not HIGH
            # Allow it but flag for review
            pass

        # Check for unsafe patterns
        for pattern in cls._UNSAFE_PATTERNS:
            if pattern.search(response_text):
                return False, f"Unsafe pattern detected: {pattern.pattern}"

        return True, "Safe"

    @classmethod
    def get_safe_fallback(cls, risk_level: str, language: str = "en") -> str:
        """Get a guaranteed-safe fallback response for the given risk level."""
        if risk_level == "HIGH_RISK":
            return (
                "I'm really glad you reached out. What you're feeling is serious, and you don't have to face this alone. "
                "Please call 112 or go to the nearest hospital right now. You can also call Tele-MANAS at 14416 "
                "(free 24/7) or AASRA at 91-98204-66726. You matter, and help is available right now."
            )
        elif risk_level == "MODERATE":
            return (
                "Thank you for sharing that with me. What you're going through sounds really difficult. "
                "I want you to know that support is available. Consider reaching out to someone you trust "
                "or talking with a counselor who can offer more personalized support. You're not alone."
            )
        else:  # NORMAL
            return (
                "Thank you for sharing. I'm here to listen. If you'd like, I can help you find some "
                "resources or connect you with a counselor. You're not alone."
            )