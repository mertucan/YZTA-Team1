from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[4]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Catering Management API"
    database_url: str
    supabase_url: AnyHttpUrl
    supabase_jwt_secret: str
    supabase_audience: str = "authenticated"
    allowed_origins: str = Field(default="http://localhost:5173")

    @property
    def cors_origins(self) -> list[str]:
        configured_origins = [
            origin.strip()
            for origin in self.allowed_origins.split(",")
            if origin.strip()
        ]
        local_origins = [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
        ]
        return list(dict.fromkeys([*configured_origins, *local_origins]))


@lru_cache
def get_settings() -> Settings:
    return Settings()
