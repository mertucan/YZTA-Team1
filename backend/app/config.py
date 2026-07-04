from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
