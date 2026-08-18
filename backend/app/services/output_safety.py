"""Output safety check for chat responses.

Ensures that generated responses don't contain unsafe content before
returning them to the student. This is a defense-in-depth layer.
"""

import re

from app.safety.models import RiskLevel, RiskCategory


class OutputSafetyCheck:
    """Deterministic output safety check for generated responses.

    This is a defense-in-depth layer that catches any unsafe content
    that might slip through the AI provider or fallback provider.
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
        # Medical diagnosis claims
        re.compile(r"\b(you have|you are diagnosed with|you suffer from)\s+(depression|anxiety|bipolar|schizophrenia|ptsd|ocd|gad|mdd)\b", re.I),
        # Prompt injection / roleplay attempts
        re.compile(r"\b(ignore\s+(previous|above|all)\s+(instructions|rules|prompts?))\b", re.I),
        re.compile(r"\b(act\s+as\s+(a\s+)?(doctor|therapist|psychiatrist|physician|clinician))\b", re.I),
        re.compile(r"\b(pretend\s+to\s+be\s+(a\s+)?(doctor|therapist|psychiatrist|human|friend))\b", re.I),
        re.compile(r"\b(bypass\s+(safety|security|guardrail|filter))\b", re.I),
        re.compile(r"\b(system\s+prompt|developer\s+mode|administrator\s+mode)\b", re.I),
    ]

    # Patterns that indicate hallucinated phone numbers / helplines
    # These should NOT appear in AI responses - crisis numbers are system-controlled
    _PHONE_NUMBER_PATTERNS = [
        # Indian phone numbers (10 digits, various formats)
        re.compile(r"\b(?:\+91[\s-]?)?[6-9]\d{9}\b"),
        # International format
        re.compile(r"\b\+\d{1,3}[\s-]?\d{3,4}[\s-]?\d{4}\b"),
        # Common helpline patterns (3-5 digits)
        re.compile(r"\b\d{3,5}\b"),
        # Toll-free patterns
        re.compile(r"\b1800[\s-]?\d{3}[\s-]?\d{3,4}\b"),
        re.compile(r"\b1860[\s-]?\d{3}[\s-]?\d{3,4}\b"),
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

    # Authoritative crisis numbers that ARE allowed in system responses
    _AUTHORIZED_CRISIS_NUMBERS = {
        "112",
        "14416",
        "1800-599-0019",
        "98204",
        "1860-2662-345",
        "1800-2333-330",  # Vandrevala Foundation second toll-free line
        "1098",
        "181",
        "9820466726",  # AASRA without formatting
    }

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

        # Check for hallucinated phone numbers / helplines
        # Crisis numbers are SYSTEM-CONTROLLED - AI must never output them
        if cls._contains_unauthorized_phone_number(response_text):
            return False, "Unauthorized phone number/helpline detected in AI response"

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
    def _contains_unauthorized_phone_number(cls, text: str) -> bool:
        """Check if text contains unauthorized phone numbers.

        Authorized numbers (from crisis module) are allowed.
        Any other phone-like pattern is rejected.
        """
        for pattern in cls._PHONE_NUMBER_PATTERNS:
            matches = pattern.findall(text)
            for match in matches:
                # Normalize the match for comparison
                normalized = re.sub(r"[\s\-+]", "", match)
                # Check if it's an authorized crisis number
                is_authorized = False
                for auth_num in cls._AUTHORIZED_CRISIS_NUMBERS:
                    auth_normalized = re.sub(r"[\s\-+]", "", auth_num)
                    if normalized == auth_normalized or normalized.endswith(auth_normalized):
                        is_authorized = True
                        break
                if not is_authorized:
                    return True
        return False

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