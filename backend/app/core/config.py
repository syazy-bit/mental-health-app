"""Application settings loaded from environment variables / backend/.env."""

from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


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
    ai_provider: str = "fallback"  # "ollama" | "fallback"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2:3b"

    # M8: Admin Authentication Configuration
    admin_auth_secret: str = "CHANGE_ME_IN_PRODUCTION_USE_STRONG_RANDOM_SECRET"
    admin_auth_algorithm: str = "HS256"
    admin_auth_token_expire_minutes: int = 60 * 24  # 24 hours

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