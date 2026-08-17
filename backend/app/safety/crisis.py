"""Predetermined, safe crisis-response flow for HIGH_RISK assessments.

HIGH_RISK conversations never reach a generative model. This module supplies
the fixed crisis pathway (message + helpline numbers). Content is written to
be warm, non-clinical, and action-oriented. Helpline numbers must be
re-verified against official sources before production deployment.
"""

from dataclasses import dataclass

from app.safety.models import RiskAssessment, RiskCategory, RiskLevel

# India-focused national / trusted helplines.
_GENERAL_HELPLINES = (
    "Tele-MANAS: 14416 (free 24x7 national helpline)",
    "KIRAN: 1800-599-0019 (24x7)",
    "AASRA: +91-98204-66726",
    "Vandrevala Foundation: 1860-2662-345",
    "Emergency: 112",
)

_ABUSE_HELPLINES = (
    "Childline: 1098 (if you are under 18)",
    "Women's Helpline: 181",
    "Tele-MANAS: 14416",
    "Emergency: 112",
)

_CRISIS_CONTENT: dict[RiskCategory, dict[str, str | tuple[str, ...]]] = {
    RiskCategory.SUICIDE: {
        "message": (
            "You matter, and what you are feeling right now is serious. Please do not face "
            "this alone. If you are in immediate danger of harming yourself, call 112 or go "
            "to the nearest hospital right now. Trained, confidential support is available "
            "any time, day or night. Please also reach out to someone you trust. You are not "
            "alone, and people can help you get through this."
        ),
        "helplines": _GENERAL_HELPLINES,
    },
    RiskCategory.SELF_HARM: {
        "message": (
            "I'm really glad you told someone. What you are going through is serious, and you "
            "deserve support, not silence. If you are at risk of hurting yourself right now, "
            "call 112 or go to the nearest hospital. Confidential help is available around the "
            "clock, and talking to someone you trust can make a real difference. You are not "
            "alone."
        ),
        "helplines": _GENERAL_HELPLINES,
    },
    RiskCategory.PASSIVE_SI: {
        "message": (
            "Thank you for being honest about how dark things feel. Feeling like there is no "
            "point is overwhelming, but this feeling can pass with the right support. If you "
            "are in immediate danger, call 112 or go to the nearest hospital now. Trained, "
            "confidential support is available 24x7. Please reach out to someone you trust "
            "today."
        ),
        "helplines": _GENERAL_HELPLINES,
    },
    RiskCategory.ABUSE: {
        "message": (
            "What you shared is serious, and it is not your fault. You deserve to be safe and "
            "supported. If you are in immediate danger, call 112 or move to a safe place. "
            "Confidential help is available: you can speak with a trusted adult, a counselor, "
            "or call these helplines: Childline 1098 (if under 18), Women's Helpline 181, "
            "Tele-MANAS 14416, Emergency 112. You are not alone, and help exists."
        ),
        "helplines": _ABUSE_HELPLINES,
    },
}

_GENERIC_CRISIS = {
    "message": (
        "What you are going through is serious, and you deserve immediate, human support. If "
        "you are in danger, call 112 or go to the nearest hospital. Confidential help is "
        "available 24x7 — please talk to someone you trust or use the helplines below."
    ),
    "helplines": _GENERAL_HELPLINES,
}


@dataclass(frozen=True)
class CrisisResponse:
    category: RiskCategory
    message: str
    helplines: tuple[str, ...]


def select_crisis_response(
    assessment: RiskAssessment, language: str = "en"
) -> CrisisResponse:
    """Return the predetermined crisis flow for a HIGH_RISK assessment."""
    if assessment.level is not RiskLevel.HIGH_RISK:
        raise ValueError("Crisis response is only available for HIGH_RISK assessments")

    content = _CRISIS_CONTENT.get(assessment.category, _GENERIC_CRISIS)
    # Multilingual content arrives in a later milestone; English is the current default.
    return CrisisResponse(
        category=assessment.category,
        message=str(content["message"]),
        helplines=tuple(content["helplines"]),
    )