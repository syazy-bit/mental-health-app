"""Application settings loaded from environment variables / backend/.env."""

from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]

# M8: Admin JWT signing/verification algorithm.
#
# Deliberately hard-pinned to HS256 as a module constant. It is NOT read from
# environment/configuration so deployment configuration can never weaken token
# verification (e.g. by selecting "none" or a non-HMAC algorithm).
ADMIN_AUTH_ALGORITHM = "HS256"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "mental-health-backend"
    app_version: str = "0.1.0"
    environment: str = "development"

    database_url: str = ""

    cors_origins: list[str] = ["http://localhost:3000"]

    # M6: AI Provider Configuration
    # M10: Local provider/model is Ollama + qwen3:8b. AI_PROVIDER stays
    # "fallback" by default so the application runs deterministically without a
    # local LLM; set AI_PROVIDER=ollama to enable the LLM provider.
    ai_provider: str = "fallback"  # "ollama" | "fallback"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen3:8b"
    # M10: Ollama request timeout in seconds. Local CPU inference of qwen3:8b
    # can take 40-60s/turn; raise via OLLAMA_TIMEOUT_SECONDS for local
    # development. Kept finite so a dead Ollama fails fast to the safe
    # fallback (ProviderError) instead of hanging.
    ollama_timeout_seconds: float = 3.5
    # M10: Send Ollama's "think" flag so reasoning models (e.g. qwen3) keep
    # their reasoning trace in message.thinking (discarded) and the final
    # answer in message.content. Non-reasoning models such as qwen2.5 reject
    # think:true with HTTP 400, so this can be disabled via
    # OLLAMA_ENABLE_THINKING=false to benchmark a non-reasoning model through
    # the same provider without changing the pipeline.
    ollama_enable_thinking: bool = True

    # M8: Admin Authentication Configuration
    admin_auth_secret: str = "CHANGE_ME_IN_PRODUCTION_USE_STRONG_RANDOM_SECRET"
    admin_auth_token_expire_minutes: int = 60 * 24  # 24 hours

    # M8: Admin login throttling (application-level, in-memory).
    # Prevents rapid brute-force attempts on /api/admin/auth/login. Applied per
    # (username, client IP) and per client IP. In-memory and single-process: for
    # multi-worker deployments a shared store (Redis) or reverse-proxy limiting
    # is required (documented limitation).
    admin_login_max_failures: int = 5
    admin_login_ip_max_failures: int = 20
    admin_login_window_seconds: int = 15 * 60
    admin_login_lockout_seconds: int = 15 * 60

    @model_validator(mode="after")
    def validate_admin_auth_secret(self) -> "Settings":
        """Refuse to run in production with the placeholder admin secret."""
        placeholder = "CHANGE_ME_IN_PRODUCTION_USE_STRONG_RANDOM_SECRET"
        if self.environment == "production" and self.admin_auth_secret == placeholder:
            raise ValueError(
                "ADMIN_AUTH_SECRET must be set to a strong random secret in "
                "production (generate with: openssl rand -hex 32)."
            )
        return self


settings = Settings()