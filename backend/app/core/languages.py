"""Supported languages and normalization helpers (domain-level configuration)."""

SUPPORTED_LANGUAGES = frozenset({"en", "hi", "as"})


def normalize_language(value: str) -> str:
    """Normalize and validate a language code. Raises ValueError if unsupported."""
    normalized = value.strip().lower()
    if normalized not in SUPPORTED_LANGUAGES:
        raise ValueError(
            f"Unsupported language '{value}'. Supported: {sorted(SUPPORTED_LANGUAGES)}"
        )
    return normalized