from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings
from pydantic_settings import SettingsConfigDict


ROOT_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT_DIR / ".env", extra="ignore")

    supabase_url: str
    supabase_anon_key: str = Field(
        default="",
        validation_alias=AliasChoices("SUPABASE_ANON_KEY", "SUPABASE_PUBLISHABLE_KEY"),
    )
    supabase_service_role_key: str = Field(
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY"),
    )


settings = Settings()
