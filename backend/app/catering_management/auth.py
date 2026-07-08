import uuid
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.catering_management.core.config import get_settings
from app.catering_management.core.database import get_db
from app.catering_management.models import Role, UserProfile

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class Principal:
    auth_user_id: uuid.UUID
    email: str | None
    profile: UserProfile

    @property
    def company_id(self) -> int | None:
        return self.profile.company_id

    @property
    def university_id(self) -> int | None:
        return self.profile.university_id

    @property
    def role(self) -> Role:
        return self.profile.role


def get_current_principal(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Principal:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    # Developer Mock Login Bypass
    if credentials.credentials.startswith("mock-token-"):
        email = credentials.credentials.replace("mock-token-", "").strip().lower()
        profile = db.scalar(
            select(UserProfile)
            .options(joinedload(UserProfile.role_obj))
            .where(
                func.lower(UserProfile.email) == email,
                UserProfile.is_active.is_(True),
            )
        )
        if profile is None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Mock user profile not found or inactive")
        return Principal(auth_user_id=profile.auth_user_id, email=profile.email, profile=profile)

    settings = get_settings()
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=settings.supabase_audience,
        )
        auth_user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc

    profile = db.scalar(
        select(UserProfile)
        .options(joinedload(UserProfile.role_obj))
        .where(UserProfile.auth_user_id == auth_user_id, UserProfile.is_active.is_(True))
    )
    if profile is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User profile is not active")

    return Principal(auth_user_id=auth_user_id, email=payload.get("email"), profile=profile)


def require_roles(*roles: Role):
    def dependency(principal: Principal = Depends(get_current_principal)) -> Principal:
        if principal.role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return principal

    return dependency


def require_company_scope(principal: Principal = Depends(get_current_principal)) -> Principal:
    if principal.role == Role.super_admin:
        return principal
    if principal.company_id is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Company scope is required")
    return principal

