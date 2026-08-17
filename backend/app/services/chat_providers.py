"""Chat response providers.

This module provides an abstraction for generating chat responses.
The DeterministicFallbackProvider is the M4 implementation; M6 adds
LLM-based providers (Ollama) without changing the pipeline.
"""

import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional

import httpx

from app.core.config import settings
from app.safety.models import RiskAssessment, RiskCategory, RiskLevel


@dataclass(frozen=True)
class ChatResponse:
    """Response from a chat provider."""

    text: str
    # Optional metadata for future use (e.g., model name, tokens)
    metadata: dict = field(default_factory=dict)


class ChatResponseProvider(ABC):
    """Abstract interface for chat response generation.

    M6: The provider contract is async so LLM providers (Ollama, hosted APIs)
    can be awaited safely from the async FastAPI route without event-loop
    conflicts. Deterministic/sync providers implement the same method and may
    simply return a ChatResponse (the pipeline awaits only if awaitable).
    """

    @abstractmethod
    async def generate_response(
        self,
        message: str,
        assessment: "RiskAssessment",
        language: str = "en",
        **kwargs,
    ) -> ChatResponse:
        """Generate a response for a NORMAL or MODERATE risk assessment.

        Args:
            message: The student's message
            assessment: The safety assessment result
            language: The session language
            **kwargs: Additional arguments (history, screening_context, etc.)
                     Accepted for forward compatibility with M6+ providers.

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
    """Deterministic fallback response provider for M4/M6.

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

    async def generate_response(
        self,
        message: str,
        assessment: "RiskAssessment",
        language: str = "en",
        **kwargs,
    ) -> "ChatResponse":
        """Generate a deterministic fallback response based on the assessment category.

        This provider MUST NOT be called for HIGH_RISK assessments.
        Async for interface consistency; it never blocks on I/O.
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


class OllamaProvider(ChatResponseProvider):
    """Ollama local LLM provider.

    Connects to local Ollama REST API (default: http://localhost:11434/api/chat).
    Uses llama3.2:3b by default for balanced quality/speed on consumer hardware.

    M6: generate_response is genuinely async so it can be awaited directly from
    the async FastAPI route. The httpx client is loop-safe: it is recreated if
    the running event loop changes (e.g. across asyncio.run() boundaries).
    """

    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        model: str = "llama3.2:3b",
        timeout: float = 3.5,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
        self._client_loop_id: Optional[int] = None

    async def _get_client(self) -> httpx.AsyncClient:
        import asyncio

        try:
            current_loop_id = id(asyncio.get_running_loop())
        except RuntimeError:
            current_loop_id = None

        needs_recreate = (
            self._client is None
            or self._client.is_closed
            or self._client_loop_id != current_loop_id
        )
        if needs_recreate:
            if self._client is not None and not self._client.is_closed:
                await self._client.aclose()
            self._client = httpx.AsyncClient(timeout=self.timeout)
            self._client_loop_id = current_loop_id
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None
            self._client_loop_id = None

    async def generate_response(
        self,
        message: str,
        assessment: "RiskAssessment",
        language: str = "en",
        **kwargs,
    ) -> ChatResponse:
        """Generate response using the Ollama local LLM (async)."""
        from app.services.prompts import build_system_prompt

        history = kwargs.get("history")
        screening_context = kwargs.get("screening_context")

        system_prompt = build_system_prompt(assessment, language, screening_context)

        # Build messages array: system + history (max 8 messages) + current user message
        messages = [{"role": "system", "content": system_prompt}]

        if history:
            # Limit history to last 8 messages (4 turns)
            recent_history = history[-8:]
            for msg in recent_history:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                if role in ("user", "assistant") and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": message})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "num_predict": 256,
            },
        }

        client = await self._get_client()
        url = f"{self.base_url}/api/chat"

        start_time = time.perf_counter()
        try:
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
        except httpx.ConnectError as e:
            raise ProviderError(f"Ollama connection failed: {e}") from e
        except httpx.TimeoutException as e:
            raise ProviderError(f"Ollama timeout: {e}") from e
        except httpx.HTTPStatusError as e:
            raise ProviderError(f"Ollama HTTP error {e.response.status_code}: {e.response.text}") from e
        except Exception as e:
            raise ProviderError(f"Ollama unexpected error: {e}") from e

        processing_time_ms = int((time.perf_counter() - start_time) * 1000)

        # Extract response text
        if "message" not in data or "content" not in data["message"]:
            raise ProviderError("Invalid Ollama response format")

        response_text = data["message"]["content"].strip()

        if not response_text:
            raise ProviderError("Empty response from Ollama")

        # Get token count if available
        tokens = data.get("eval_count", 0)

        return ChatResponse(
            text=response_text,
            metadata={
                "provider": "ollama",
                "model": self.model,
                "category": assessment.category,
                "risk_level": assessment.level,
                "tokens_generated": tokens,
                "processing_time_ms": processing_time_ms,
            },
        )


def create_provider_from_env() -> ChatResponseProvider:
    """Create a chat provider based on environment configuration.

    Uses settings from app.core.config (loaded from .env):
        ai_provider: "ollama" (default), "fallback"
        ollama_base_url: Default "http://localhost:11434"
        ollama_model: Default "llama3.2:3b"

    Returns:
        Configured ChatResponseProvider instance
    """
    provider_type = settings.ai_provider.lower()

    if provider_type == "fallback":
        return DeterministicFallbackProvider()

    if provider_type == "ollama":
        return OllamaProvider(base_url=settings.ollama_base_url, model=settings.ollama_model)

    # Default to fallback for unknown providers
    return DeterministicFallbackProvider()