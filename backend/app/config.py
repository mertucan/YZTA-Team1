from pathlib import Path
from typing import Optional

from pydantic import AliasChoices, Field, ValidationInfo, field_validator
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
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"
    research_export_salt: Optional[str] = None
    research_export_min_subjects: int = 5
    research_export_link_ttl_hours: int = 24
    brevo_api_key: Optional[str] = None
    brevo_sender_email: Optional[str] = None
    brevo_sender_name: str = "YemekhanAI"

    @field_validator(
        "gemini_api_key",
        "research_export_salt",
        "brevo_api_key",
        "brevo_sender_email",
        mode="before",
    )
    @classmethod
    def _blank_optional_string_to_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("gemini_model", "brevo_sender_name", mode="before")
    @classmethod
    def _blank_string_to_default(cls, value: object, info: ValidationInfo) -> object:
        defaults = {
            "gemini_model": "gemini-2.5-flash",
            "brevo_sender_name": "YemekhanAI",
        }
        if isinstance(value, str) and not value.strip():
            return defaults[info.field_name]
        return value

    @field_validator(
        "research_export_min_subjects",
        "research_export_link_ttl_hours",
        mode="before",
    )
    @classmethod
    def _blank_int_to_default(cls, value: object, info: ValidationInfo) -> object:
        defaults = {
            "research_export_min_subjects": 5,
            "research_export_link_ttl_hours": 24,
        }
        if isinstance(value, str) and not value.strip():
            return defaults[info.field_name]
        return value


settings = Settings()
