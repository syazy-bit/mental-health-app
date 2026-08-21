# AI Provider Documentation

This document describes the AI provider abstraction, the available providers,
configuration, and how the system handles AI responses safely.

---

## Overview

The chat pipeline depends **only on a provider abstraction** (`ChatResponseProvider`).
The concrete provider is selected at startup via environment variables.

```
ChatService
    │
    ├─► SafetyEngine (authoritative risk decision)
    │
    └─► ChatResponseProvider (abstraction)
            │
            ├─► DeterministicFallbackProvider (default, no LLM)
            │
            └─► OllamaProvider (local LLM via Ollama)
```

**Key principle:** The AI provider is **only invoked for NORMAL and MODERATE risk
messages**. HIGH_RISK messages bypass the provider entirely and go straight to
the deterministic crisis response.

---

## Provider Abstraction

### Interface: `ChatResponseProvider` (Protocol)

```python
async def generate_response(
    message: str,
    assessment: RiskAssessment,
    language: str = "en",
    history: list[dict] | None = None,
    screening_context: dict | None = None,
) -> ChatResponse
```

- **Async** — LLM providers can be awaited directly from the async FastAPI route
- **Backward compatible** — sync providers work via `inspect.isawaitable()` check
- **Forward compatible** — `**kwargs` accepts future parameters (history, screening_context)

### Response Wrapper: `ChatResponse`

```python
@dataclass(frozen=True)
class ChatResponse:
    text: str                          # The response to send to the student
    metadata: dict = {}                # provider, model, category, risk_level, tokens, timing
```

---

## Available Providers

### 1. DeterministicFallbackProvider (Default)

**Class:** `backend/app/services/chat_providers.py::DeterministicFallbackProvider`

- **No LLM required** — runs entirely offline
- **Keyword-based templates** mapped from `RiskCategory`
- **Warm, non-clinical tone** adapted from v0 prototype
- **MODERATE responses** include a gentle resource nudge
- **Never handles HIGH_RISK** — raises `ProviderError` if called with HIGH_RISK

**Response Categories:**
| Category | Template Key |
|---|---|
| ANXIETY | anxiety |
| STRESS | stress |
| BURNOUT | burnout |
| SLEEP | sleep |
| DEPRESSION | depression |
| PANIC | panic |
| HOPELESSNESS | hopelessness |
| GENERAL | general |

**Metadata returned:** `provider: "deterministic_fallback"`, `category`, `risk_level`

---

### 2. OllamaProvider (Local LLM)

**Class:** `backend/app/services/chat_providers.py::OllamaProvider`

Connects to a local Ollama REST API (default: `http://localhost:11434/api/chat`).

**Features:**
- **Genuinely async** — uses `httpx.AsyncClient`, loop-safe across `asyncio.run()` boundaries
- **Qwen3 thinking support** — sends `think: true` so reasoning trace goes to `message.thinking` (discarded), final answer to `message.content` (returned)
- **Qwen2.5 compatibility** — non-reasoning models reject `think:true` with HTTP 400; disable via `OLLAMA_ENABLE_THINKING=false`
- **Token budget** — `num_predict: 512` (Qwen3 shares budget between thinking + answer)
- **Defense in depth** — if `</think>` marker appears in `message.content`, response is rejected (reasoning leak prevention)

**Configuration via Environment:**
| Variable | Default | Description |
|---|---|---|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `qwen3:8b` | Model name (must be pulled: `ollama pull qwen3:8b`) |
| `OLLAMA_TIMEOUT_SECONDS` | `3.5` (dev), `120` (CPU) | Request timeout — **raise for CPU inference** |
| `OLLAMA_ENABLE_THINKING` | `true` | Send `think: true` for reasoning models |

**Metadata returned:** `provider: "ollama"`, `model`, `category`, `risk_level`, `tokens_generated`, `processing_time_ms`

---

## Provider Selection

Controlled by `AI_PROVIDER` environment variable (loaded from `backend/.env`):

```ini
# backend/.env
AI_PROVIDER=fallback        # "fallback" (default) or "ollama"
```

**Factory function:** `create_provider_from_env()` in `chat_providers.py`

```python
def create_provider_from_env() -> ChatResponseProvider:
    provider_type = settings.ai_provider.lower()
    if provider_type == "fallback":
        return DeterministicFallbackProvider()
    if provider_type == "ollama":
        return OllamaProvider(
            base_url=settings.ollama_base_url,
            model=settings.ollama_model,
            timeout=settings.ollama_timeout_seconds,
            enable_thinking=settings.ollama_enable_thinking,
        )
    return DeterministicFallbackProvider()  # safe default
```

---

## How Qwen3 Thinking Is Handled

Qwen3 (and other reasoning models) expose a reasoning trace. The provider:

1. Sends `"think": true` in the Ollama request
2. Ollama splits output:
   - `message.thinking` — reasoning trace (**NEVER read or returned**)
   - `message.content` — final answer (**only this is returned**)
3. **Defense in depth:** If `</think>` appears in `message.content`, the response
   is rejected as invalid (reasoning leak) → safe fallback

```python
_THINK_CLOSE_MARKER = "</think>"

if self._THINK_CLOSE_MARKER in response_text:
    raise ProviderError("Ollama response contains reasoning content")
```

---

## Qwen2.5 Compatibility

Qwen2.5 is **not a reasoning model** and rejects `think:true` with HTTP 400.

**To use Qwen2.5:**
```ini
OLLAMA_MODEL=qwen2.5:7b
OLLAMA_ENABLE_THINKING=false
```

The same `OllamaProvider` works — just disable the thinking flag.

---

## Output Safety Boundary

**ALL provider responses** (fallback + Ollama) pass through `OutputSafetyCheck`
before reaching the student.

### Provider Output Validation (ChatService)

Before output safety check, the service validates:
- Empty/whitespace response → `ProviderError` → safe fallback
- Response > 2000 chars → `ProviderError` → safe fallback (runaway detection)

### OutputSafetyCheck (`backend/app/services/output_safety.py`)

Checks for:
1. **Unsafe patterns** — self-harm encouragement, medical advice, diagnosis claims, prompt injection
2. **Hallucinated phone numbers** — crisis numbers are SYSTEM-CONTROLLED; any unauthorized phone-like pattern → reject
3. **Crisis indicator leakage** — multiple crisis keywords in non-HIGH_RISK response → flag

**On failure:** Entire response REJECTED (not sanitized) → guaranteed-safe fallback.

---

## Safe Fallback Behavior

When ANY provider fails (connection, timeout, validation, output safety):

```python
response_text = OutputSafetyCheck.get_safe_fallback(assessment.level.value, language)
provider_name = "safe_fallback"
model_name = None
```

**Fallback responses by risk level:**

| Risk Level | Fallback Response |
|---|---|
| HIGH_RISK | Crisis message with helplines (112, 14416, 98204-66726) |
| MODERATE | Supportive message + encouragement to reach out to counselor |
| NORMAL | General supportive message + offer to find resources |

---

## Ollama: Optional, Not Required

| Scenario | Behavior |
|---|---|
| `AI_PROVIDER=fallback` (default) | App runs fully without Ollama. Deterministic responses. |
| `AI_PROVIDER=ollama`, Ollama running | Normal conversations use `qwen3:8b` (or configured model). |
| `AI_PROVIDER=ollama`, Ollama **unreachable** | Request fails → safe fallback response. App remains functional. |
| `AI_PROVIDER=ollama`, Ollama **timeout** | Request times out → safe fallback response. App remains functional. |
| `AI_PROVIDER=ollama`, model **not pulled** | HTTP 404 → safe fallback response. |
| `AI_PROVIDER=ollama`, invalid output | Output safety rejects → safe fallback response. |

**No GPU required.** CPU inference works but is slow (40–60s/turn on laptop).
Set `OLLAMA_TIMEOUT_SECONDS=120` or higher for local development.

---

## What the AI Is NOT

- **Not a therapist** — provides supportive responses, not therapy
- **Not a diagnostic system** — never diagnoses conditions
- **Not authoritative for safety** — SafetyEngine decides risk deterministically
- **Not persistent** — provider choice/response metadata not stored in DB (only deterministic classifier sources on `safety_evaluations`)

---

## Configuration Reference

### backend/.env (Complete AI Section)

```ini
# M6/M10: AI chat provider selection: ollama | fallback (default keeps the app
# deterministic without a local LLM; use ollama to enable the local model).
AI_PROVIDER=fallback

# M6/M10: Ollama local configuration (used when AI_PROVIDER=ollama).
# Qwen3 reasoning/thinking output is discarded at the provider level: the
# provider sends think:true so only message.content (the final answer) is used.
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen3:8b

# M10: Ollama request timeout in seconds. Local CPU inference of qwen3:8b is
# slow (typically 40-60s/turn on a laptop). Set this high enough for your
# hardware (e.g. 120) or requests time out and fall back to the deterministic
# safe-fallback response. It stays finite so a dead/unreachable Ollama fails
# fast to the safe fallback instead of hanging.
OLLAMA_TIMEOUT_SECONDS=120

# M10: Send Ollama's "think" flag so reasoning models (e.g. qwen3) keep their
# reasoning trace out of the student-facing answer. Non-reasoning models such
# as qwen2.5 reject think:true (HTTP 400); set this to false when benchmarking
# a non-reasoning model through the same provider.
# OLLAMA_ENABLE_THINKING=true
```

---

## Testing AI Integration

### Run with deterministic fallback (default):
```powershell
cd backend
pytest tests/test_chat.py tests/test_chat_ai.py
```

### Run with Ollama (integration test):
```powershell
ollama serve
ollama pull qwen3:8b
# In backend/.env: AI_PROVIDER=ollama, OLLAMA_TIMEOUT_SECONDS=120
cd backend
pytest tests/test_chat_ai.py -v
```

---

## Adding a New Provider

1. Implement `ChatResponseProvider` protocol in `chat_providers.py`
2. Add to `create_provider_from_env()` factory
3. Add environment variables to `backend/app/core/config.py` if needed
4. Ensure provider:
   - Handles async/sync correctly
   - Returns `ChatResponse` with `text` and `metadata`
   - Raises `ProviderError` on failure
   - Never handles HIGH_RISK (service layer prevents this)