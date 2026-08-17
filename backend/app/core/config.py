"""Application settings loaded from environment variables / backend/.env."""

from pathlib import Path

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


settings = Settings()