"""Deterministic keyword/pattern classifier.

Runs offline, needs no model, and is independent of any AI provider. Handles
common false positives: negation immediately before a match (e.g. "don't want
to kill myself") and accidental-injury context after a match (e.g. "hurt myself
playing football").

P0-2: Negation logic refined to only suppress genuinely negated intent.
Excludes common false-positive patterns like "can't stop", "no one", "without help".
"""

import re

from app.safety.classifiers.base import RiskClassifier
from app.safety.models import ClassificationMatch, RiskCategory

# Genuine negation words that can grammatically negate a following verb
_NEGATION_WORDS = frozenset(
    {
        "not",
        "never",
        "don't",
        "dont",
        "won't",
        "wont",
        "can't",
        "cant",
        "isn't",
        "isnt",
        "wasn't",
        "wasnt",
        "aren't",
        "arent",
    }
)

# Patterns where negation words appear but do NOT negate harmful intent.
# These are fixed expressions or constructions where the "negation" word
# serves a different grammatical function.
_NEGATION_EXCLUSION_PATTERNS = [
    # Inability to stop = ongoing intent (high risk)
    re.compile(r"\b(?:can'?t|cannot|unable\s+to|won't|wont|will\s+not)\s+stop\b"),
    re.compile(r"\b(?:can'?t|cannot|unable\s+to)\s+(?:help|prevent|avoid)\b"),
    # "no one", "no-one", "nobody", "no way", "nowhere", "nothing" as fixed expressions
    re.compile(r"\bno\s+(?:one|body|way|where|thing)\b"),
    re.compile(r"\bno\s+one\s+(?:to|who)\b"),
    re.compile(r"\bthere\s+is\s+no\b"),
    re.compile(r"\bthere'?s\s+no\b"),
    # Conditional lack of help/support
    re.compile(r"\bwithout\s+(?:help|support|anyone|any\s+help)\b"),
    re.compile(r"\bno\s+(?:help|support|one\s+to\s+help)\b"),
    # Uncertainty expressions (not negating intent)
    re.compile(r"\bnot\s+(?:sure|certain|know)\b"),
    # "don't want to" followed by harm is genuine negation (keep)
    # But "won't" alone before harm verb is genuine negation
]

# Compile exclusion patterns once
_EXCLUSION_COMPILED = [(p.pattern, p) for p in _NEGATION_EXCLUSION_PATTERNS]


_ACCIDENT_CONTEXT_AFTER = frozenset(
    {
        "accidentally",
        "accident",
        "playing",
        "play",
        "sports",
        "game",
        "games",
        "fell",
        "fall",
        "cooking",
        "cook",
        "kitchen",
        "exercise",
        "workout",
    }
)


def _tokens_before(text: str, match: re.Match, n: int = 6) -> list[str]:
    before = text[: match.start()].rstrip()
    return re.findall(r"[a-z0-9'\-]+", before)[-n:]


def _tokens_after(text: str, match: re.Match, n: int = 3) -> list[str]:
    after = text[match.end() :].lstrip()
    return re.findall(r"[a-z0-9'\-]+", after)[:n]


class KeywordClassifier(RiskClassifier):
    source = "keyword"

    _PATTERNS: dict[RiskCategory, list[re.Pattern]] = {
        RiskCategory.SUICIDE: [
            re.compile(r"\bkill myself\b"),
            re.compile(r"\bsuicide\b"),
            re.compile(r"\bend my life\b"),
            re.compile(r"\bend it all\b"),
            re.compile(r"\bwant to die\b"),
            re.compile(r"\bwish i (?:was|were) dead\b"),
            re.compile(r"\btake my life\b"),
        ],
        RiskCategory.SELF_HARM: [
            re.compile(r"\bcut(?:ting|s)? myself\b"),
            re.compile(r"\bself[- ]harm\b"),
            re.compile(r"\bharm(?:ing|s)? myself\b"),
            re.compile(r"\bhurt(?:ing|s)? myself\b"),
            re.compile(r"\bburn(?:ing|s)? myself\b"),
        ],
        RiskCategory.PASSIVE_SI: [
            re.compile(r"\bnothing to live for\b"),
            re.compile(r"\bno reason to live\b"),
            re.compile(r"\b(?:no|any) point in living\b"),
            re.compile(r"\bcan'?t go on\b"),
            re.compile(r"\bdon'?t want to live\b"),
            re.compile(r"\bbetter off dead\b"),
            re.compile(r"\bbetter off without me\b"),
        ],
        RiskCategory.ABUSE: [
            re.compile(r"\b(?:being|got|was) abused?\b"),
            re.compile(r"\bmolest"),
            re.compile(r"\bsexual abuse\b"),
            re.compile(r"\bphysical abuse\b"),
            re.compile(r"\bemotional abuse\b"),
            re.compile(r"\bbeat(?:en|s|ing)? me\b"),
            re.compile(r"\bhit(?:s|ting)? me\b"),
            re.compile(r"\btouched me inappropriately\b"),
        ],
        RiskCategory.HOPELESSNESS: [
            re.compile(r"\bhopeless\b"),
            re.compile(r"\bno hope\b"),
            re.compile(r"\bwhat'?s the point\b"),
            re.compile(r"\bpointless\b"),
            re.compile(r"\bmeaningless\b"),
        ],
        RiskCategory.DEPRESSION: [
            re.compile(r"\bdepress"),
            re.compile(r"\blow mood\b"),
            re.compile(r"\bsad all the time\b"),
        ],
        RiskCategory.PANIC: [
            re.compile(r"\bpanic attack\b"),
            re.compile(r"\bpanicking\b"),
        ],
        RiskCategory.ANXIETY: [
            re.compile(r"\banxious\b"),
            re.compile(r"\bworried\b"),
            re.compile(r"\boverwhelmed\b"),
        ],
        RiskCategory.STRESS: [
            re.compile(r"\bstress"),
            re.compile(r"\bpressure\b"),
            re.compile(r"\bexhausted\b"),
        ],
        RiskCategory.BURNOUT: [
            re.compile(r"\bburn(?:t|ed)? ?out\b"),
        ],
        RiskCategory.SLEEP: [
            re.compile(r"\bsleep"),
            re.compile(r"\binsomnia\b"),
        ],
    }

    def classify(self, normalized_text: str) -> list[ClassificationMatch]:
        matches: list[ClassificationMatch] = []
        for category, patterns in self._PATTERNS.items():
            for pattern in patterns:
                for match in pattern.finditer(normalized_text):
                    if self._is_negated(normalized_text, match):
                        continue
                    if self._is_accidental_injury(normalized_text, match):
                        continue
                    matches.append(
                        ClassificationMatch(
                            category=category,
                            pattern=pattern.pattern,
                            source=self.source,
                        )
                    )
        return matches

    def _is_negated(self, text: str, match: re.Match) -> bool:
        """
        Determine if a match is genuinely negated.

        Returns True only if:
        1. A genuine negation word appears in the window before the match, AND
        2. No exclusion pattern (false-positive negation context) matches the surrounding text.
        """
        # First, check if any exclusion pattern matches the text around this match
        # We check a window of ~50 chars before and after the match
        start = max(0, match.start() - 50)
        end = min(len(text), match.end() + 50)
        context = text[start:end]

        for pattern_str, compiled in _EXCLUSION_COMPILED:
            if compiled.search(context):
                return False  # Exclusion pattern matches -> NOT a genuine negation

        # Check for genuine negation words in the token window before the match
        before_tokens = _tokens_before(text, match, n=6)
        return any(token in _NEGATION_WORDS for token in before_tokens)

    @staticmethod
    def _is_accidental_injury(text: str, match: re.Match) -> bool:
        return any(token in _ACCIDENT_CONTEXT_AFTER for token in _tokens_after(text, match))