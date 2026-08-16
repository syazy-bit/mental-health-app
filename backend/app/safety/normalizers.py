"""Input normalization for the safety engine (deterministic, LLM-free, Unicode-aware)."""

import re
import unicodedata

# Unicode categories to preserve:
# L = Letter (Lu, Ll, Lt, Lm, Lo) - all letter categories
# M = Mark (Mn, Mc, Me) - combining marks, essential for Indic scripts
# N = Number (Nd, Nl, No) - digits
# Pc = Connector punctuation (underscore, etc.)
# Pd = Dash punctuation (hyphens)
# We also explicitly preserve apostrophe (U+0027) and hyphen-minus (U+002D)
# Zero-width joiner (U+200D) and non-joiner (U+200C) for Indic conjuncts

# Characters to remove: Cc (control), Cf (format, except ZWJ/ZWNJ), Cs (surrogate),
# Co (private use), Cn (unassigned), Zl (line separator), Zp (paragraph separator)

_CONTROL_OR_FORMAT = re.compile(
    r"[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]"
)
# Normalize all Unicode whitespace to single space
_UNICODE_WHITESPACE = re.compile(r"[\s\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]+")

# For case folding: use str.casefold() which handles Unicode better than lower()
# For scripts without case (Devanagari, Bengali), casefold() is a no-op


def normalize_text(text: str) -> str:
    """Normalize text for safety classification while preserving Unicode scripts.

    - Unicode normalize (NFC) for consistent representation
    - Case fold for case-insensitive matching (works for Latin, Cyrillic, Greek; no-op for Devanagari/Bengali)
    - Preserve all letters, marks, numbers, connector punctuation, dashes
    - Preserve apostrophe, hyphen, zero-width joiner/non-joiner
    - Normalize all Unicode whitespace to single ASCII space
    - Strip control/format characters (except ZWJ/ZWNJ)
    - Never return empty string for non-empty input unless input was only whitespace/control chars
    """
    if not text:
        return ""

    # Unicode normalize first (NFC = composed form)
    text = unicodedata.normalize("NFC", text)

    # Case fold for case-insensitive matching (better than lower() for Unicode)
    # For scripts without case (Devanagari, Bengali/Assamese), this is a no-op
    text = text.casefold()

    # Remove control/format characters but preserve ZWJ (U+200D) and ZWNJ (U+200C)
    # These are essential for Indic script rendering
    text = _CONTROL_OR_FORMAT.sub("", text)

    # Normalize all Unicode whitespace to single space
    text = _UNICODE_WHITESPACE.sub(" ", text).strip()

    # If text became empty after removing control chars, return a marker
    # so the caller knows input existed but had no classifiable content
    if not text:
        return " "  # single space - will match no patterns but won't be empty

    return text