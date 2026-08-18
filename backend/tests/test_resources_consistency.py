"""M6 consistency guard: every resource number shown to students (frontend
catalog, backend crisis flow) must be explicitly authorized by the
output-safety whitelist.

This prevents drift between the static resource directories and the
AI-output safety gate: if a number is added to the UI without being
whitelisted, these tests fail loudly.
"""

import re
from pathlib import Path

from app.safety.crisis import _ABUSE_HELPLINES, _GENERAL_HELPLINES
from app.screening.instruments import (
    FollowUpAction,
    PHQ9Instrument,
    ScreeningSafetyState,
)
from app.services.output_safety import OutputSafetyCheck

BACKEND_DIR = Path(__file__).resolve().parents[1]
FRONTEND_DIR = BACKEND_DIR.parent / "frontend"
SUPPORT_NOW_PAGE = FRONTEND_DIR / "src" / "app" / "support-now" / "page.tsx"
RESOURCES_PAGE = FRONTEND_DIR / "src" / "app" / "resources" / "page.tsx"


def _authorized(digits: str) -> bool:
    """True if digits matches an authorized whitelist number.

    Uses the same rule as OutputSafetyCheck._contains_unauthorized_phone_number:
    exact match or suffix match (e.g. '+91-98204-66726' ends with '9820466726').
    """
    for auth in OutputSafetyCheck._AUTHORIZED_CRISIS_NUMBERS:
        auth_norm = re.sub(r"[\s\-+]", "", auth)
        if digits == auth_norm or digits.endswith(auth_norm):
            return True
    return False


def _digits(raw: str) -> str:
    return re.sub(r"[\s\-+]", "", raw)


def _extract_number_fields(source: str) -> list[str]:
    """Pull raw `number: '...'` values from the CrisisResource array."""
    return re.findall(r"number:\s*'([^']+)'", source)


def _extract_tel_links(source: str) -> list[str]:
    """Pull the digits from `href=\"tel:...\"` links."""
    return re.findall(r"tel:([\d+]+)", source)


def _extract_helpline_numbers(lines) -> list[str]:
    """Extract phone-like numbers from backend crisis helpline strings.

    Matches a digit followed by 3+ digits/separators, keeping only
    candidates with at least 3 digits (filters out '24', '7', '18', etc.).
    """
    numbers = []
    for line in lines:
        for match in re.findall(r"\+?\d[\d\s\-]{2,}", line):
            digits = _digits(match)
            if len(digits) >= 3:
                numbers.append(digits)
    return numbers


def test_frontend_support_now_numbers_are_authorized():
    source = SUPPORT_NOW_PAGE.read_text(encoding="utf-8")
    numbers = _extract_number_fields(source)
    assert numbers, "No number fields found in support-now page"
    for raw in numbers:
        assert _authorized(_digits(raw)), (
            f"Frontend /support-now number not in whitelist: {raw!r}"
        )


def test_frontend_resources_tel_links_are_authorized():
    source = RESOURCES_PAGE.read_text(encoding="utf-8")
    links = _extract_tel_links(source)
    assert links, "No tel: links found in resources page"
    for raw in links:
        assert _authorized(_digits(raw)), (
            f"Frontend /resources tel link not in whitelist: {raw!r}"
        )


def test_backend_crisis_helplines_are_authorized():
    lines = _GENERAL_HELPLINES + _ABUSE_HELPLINES
    numbers = _extract_helpline_numbers(lines)
    assert numbers, "No phone numbers extracted from backend crisis helplines"
    for digits in numbers:
        assert _authorized(digits), (
            f"Backend crisis helpline number not in whitelist: {digits}"
        )


def test_screening_safety_resources_are_authorized():
    """Every phone number shown in PHQ-9 screening safety_resources must be
    explicitly authorized by the output-safety whitelist.

    Covers all three paths that produce safety_resources:
    - assess_safety with Item 9 > 0 (POSITIVE_SAFETY_SCREEN)
    - assess_followup ESCALATE_CRISIS
    - assess_followup SUPPORTIVE_CARE
    """
    phq9 = PHQ9Instrument()
    resource_lists = [
        phq9.assess_safety(1).safety_resources,
        phq9.assess_followup(
            ScreeningSafetyState.POSITIVE_SAFETY_SCREEN,
            FollowUpAction.ESCALATE_CRISIS,
        ).safety_resources,
        phq9.assess_followup(
            ScreeningSafetyState.POSITIVE_SAFETY_SCREEN,
            FollowUpAction.SUPPORTIVE_CARE,
        ).safety_resources,
    ]
    numbers = set()
    for resources in resource_lists:
        numbers.update(_extract_helpline_numbers(resources))
    assert numbers, "No phone numbers extracted from screening safety_resources"
    for digits in numbers:
        assert _authorized(digits), (
            f"Screening safety_resources number not in whitelist: {digits}"
        )