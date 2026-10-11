"""
Production configuration. All secrets come from environment variables
(injected via docker-compose env_file) — never hardcoded, never defaulted
to insecure values in a way that could silently ship to prod.
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Voice AI POS System"
    ENV: str = "production"
    DEBUG: bool = False

    API_V1_PREFIX: str = "/api/v1"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # Auth — no default; must be supplied, so a missing .env fails fast at boot
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # CORS — comma-separated string in .env, parsed into a list
    ALLOWED_ORIGINS: str = ""

    @property
    def cors_origins(self) -> List[str]:
        configured = [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]
        defaults = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        return configured or defaults

    # AI (Gemini)
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-3.1-flash-lite"
    DEFAULT_LANGUAGE: str = "en"
    VOSK_EN_MODEL_PATH: str | None = None

    # Payments
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STORE_UPI_ID: str = ""  

    # Storage
    INVOICE_DIR: str = "/app/storage/invoices"
    RECEIPT_DIR: str = "/app/storage/receipts"
    AUDIO_DIR: str = "/app/storage/audio"
    BACKUP_DIR: str = "/app/storage/backups"

    # Monitoring
    SENTRY_DSN: str = ""

    # Email (SMTP) — for sending one-time staff setup PINs
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_FROM_NAME: str = "Voice AI POS"
    SMTP_USE_TLS: bool = True

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters. Generate with: openssl rand -hex 32")
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
