import uuid
from datetime import date, timedelta
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.catering_management.core.database import get_db
from app.catering_management.models import Company, License, Role, RoleModel, UserProfile
from app.catering_management.schemas import AuthResponse, UserLogin, UserRegister, UserRead
from app.catering_management.auth import Principal, get_current_principal

router = APIRouter(prefix="/auth", tags=["auth"])

PUBLIC_REGISTER_ROLES = {
    Role.catering_admin.value,
}


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    existing_user = db.scalar(
        select(UserProfile).where(UserProfile.email == payload.email)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi zaten kullanımda."
        )

    # 2. Check if company name already exists
    existing_company = db.scalar(
        select(Company).where(Company.company_name == payload.company_name)
    )
    if existing_company is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu şirket adı zaten kayıtlı."
        )

    try:
        # 3. Create Company
        company = Company(
            company_name=payload.company_name,
            email=payload.email,
            status=True
        )
        db.add(company)
        db.flush()

        # 4. Create License (Starter plan default)
        lic = License(
            company_id=company.id,
            plan_name="Starter",
            max_universities=2,
            max_users=5,
            start_date=date.today(),
            expire_date=date.today() + timedelta(days=30),
            status=True
        )
        db.add(lic)

        requested_role = Role.catering_admin.value
        if requested_role not in PUBLIC_REGISTER_ROLES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu rol ile herkese açık kayıt oluşturulamaz."
            )

        # 5. Get requested Role Model
        role_row = db.scalar(
            select(RoleModel).where(RoleModel.role_name == requested_role)
        )
        if role_row is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"{requested_role} rolü bulunamadı. Lütfen önce rolleri seed edin."
            )

        # 6. Create UserProfile
        user = UserProfile(
            auth_user_id=payload.auth_user_id,
            company_id=company.id,
            role_id=role_row.id,
            email=payload.email,
            full_name=payload.full_name,
            is_active=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Trigger lazy load
        _ = user.role_obj

        # Return session token & user profile
        token = f"mock-token-{payload.email}"
        return AuthResponse(access_token=token, user=user)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Kayıt işlemi sırasında bir hata oluştu: {str(e)}"
        )


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    # 1. Fetch user by email
    user = db.scalar(
        select(UserProfile)
        .options(joinedload(UserProfile.role_obj))
        .where(UserProfile.email == payload.email, UserProfile.is_active.is_(True))
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatalı e-posta veya şifre."
        )

    token = f"mock-token-{payload.email}"
    return AuthResponse(access_token=token, user=user)


@router.get("/me", response_model=UserRead)
def me(principal: Principal = Depends(get_current_principal)):
    return principal.profile

