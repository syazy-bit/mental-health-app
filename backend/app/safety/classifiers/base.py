"""Classifier interface for the safety engine.

The engine depends on this abstraction, not on any one classifier, so
additional (e.g. ML or provider-backed) classifiers can be added later without
changing the rest of the pipeline.
"""

from typing import Protocol

from app.safety.models import ClassificationMatch


class RiskClassifier(Protocol):
    source: str

    def classify(self, normalized_text: str) -> list[ClassificationMatch]:
        """Return every deterministic match found in normalized text."""
        ...