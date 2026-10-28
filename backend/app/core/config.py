"""Application configuration management using Pydantic Settings."""

from typing import List
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration settings loaded from environment or .env file."""

    DATABASE_URL: str = Field(
        default="mysql+pymysql://stitch_user:stitch_password@localhost:3306/claim_reconciliation",
        description="Database connection URL",
    )
    API_HOST: str = Field(default="0.0.0.0", description="Host to bind the API server")
    API_PORT: int = Field(default=8000, description="Port to bind the API server")
    CORS_ORIGINS: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5173"],
        description="Allowed CORS origins",
    )
    ENVIRONMENT: str = Field(default="development", description="Application environment")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
