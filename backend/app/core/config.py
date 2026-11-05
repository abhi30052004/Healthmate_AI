from functools import lru_cache

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "HealthMate AI"
    app_env: str = "development"
    api_prefix: str = "/api"
    database_url: str = ""
    frontend_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    jwt_secret_key: str = Field(
        default="healthmate-dev-secret-key-replace-in-production-min-32-chars",
        validation_alias=AliasChoices("jwt_secret_key", "secret_key"),
    )
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15

    document_storage_dir: str = "./private_uploads"
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB

    # AI Configuration (Quick Reference & Medical Chat)
    ai_enabled: bool = True
    llm_provider: str = "openai"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"
    ai_daily_chat_limit: int = 20
    ai_daily_quick_reference_limit: int = 20
    ai_monthly_budget_usd: float = 5.0
    ai_request_timeout_seconds: int = 20
    ai_max_output_tokens: int = 500

    # Optional Email Notification Settings
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = "notifications@healthmate.ai"
    smtp_use_tls: bool = True

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.frontend_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.app_env.lower() in ("production", "staging"):
            if (
                not self.jwt_secret_key
                or "replace" in self.jwt_secret_key.lower()
                or len(self.jwt_secret_key) < 32
            ):
                raise ValueError("Insecure JWT_SECRET_KEY configured for production/staging environment.")
            if not self.database_url or not self.database_url.strip():
                raise ValueError("DATABASE_URL must be explicitly configured in production/staging environment.")
            if "*" in self.cors_origins:
                raise ValueError("Wildcard CORS origin is not permitted in production environment with credentials.")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
