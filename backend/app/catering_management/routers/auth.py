import logging
import random
from datetime import date, datetime, timedelta, timezone

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.catering_management.auth import Principal, get_current_principal
from app.catering_management.core.database import get_db
from app.catering_management.models import (
    Company,
    License,
    PartnerCompanyProfile,
    ResearcherProfile,
    Role,
    RoleModel,
    Student,
    University,
    UserProfile,
)
from app.catering_management.schemas import (
    AuthResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RegisterOptionRole,
    RegisterOptions,
    UserLogin,
    UserRead,
    UserRegister,
)
from app.services.brevo_email import (
    BrevoConfigurationError,
    BrevoDeliveryError,
    send_password_reset_code_email,
    send_welcome_email,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

PASSWORD_RESET_CODES: dict[str, dict[str, object]] = {}
PASSWORD_RESET_TTL_MINUTES = 10

PUBLIC_REGISTER_ROLES = {
    Role.catering_admin.value,
    Role.university_admin.value,
    Role.student.value,
    Role.researcher.value,
    Role.partner_company.value,
}

PUBLIC_REGISTER_ROLE_LABELS = {
    Role.catering_admin.value: "Catering Yoneticisi",
    Role.university_admin.value: "Universite Yoneticisi",
    Role.student.value: "Ogrenci",
    Role.researcher.value: "Arastirmaci",
    Role.partner_company.value: "Partner Firma",
}


def normalize_email(email: str) -> str:
    return email.strip().lower()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def has_missing_password_hash(password_hash: str | None) -> bool:
    return not password_hash or not password_hash.strip()


def generate_reset_code() -> str:
    return f"{random.SystemRandom().randint(0, 999999):06d}"


def require_text(value: str | None, field_label: str) -> str:
    if not value or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_label} zorunludur.",
        )
    return value.strip()


def get_role_row(db: Session, role_name: str) -> RoleModel:
    role_row = db.scalar(select(RoleModel).where(RoleModel.role_name == role_name))
    if role_row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"{role_name} rolu bulunamadi. Lutfen once rolleri seed edin.",
        )
    return role_row


def get_public_university(db: Session, university_id: int | None) -> University:
    if university_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Universite secimi zorunludur.",
        )
    university = db.scalar(
        select(University).where(
            University.id == university_id,
            University.status.is_(True),
        )
    )
    if university is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secilen universite bulunamadi veya aktif degil.",
        )
    return university


@router.get("/register-options", response_model=RegisterOptions)
def register_options(db: Session = Depends(get_db)):
    universities = list(
        db.scalars(
            select(University)
            .where(University.status.is_(True))
            .order_by(University.university_name)
        ).all()
    )
    roles = [
        RegisterOptionRole(value=value, label=PUBLIC_REGISTER_ROLE_LABELS[value])
        for value in PUBLIC_REGISTER_ROLE_LABELS
    ]
    return RegisterOptions(roles=roles, universities=universities)


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    normalized_email = normalize_email(str(payload.email))
    existing_user = db.scalar(
        select(UserProfile).where(func.lower(UserProfile.email) == normalized_email)
    )
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu e-posta adresi zaten kullanimda.",
        )

    requested_role = payload.role_name.strip().upper()
    if requested_role not in PUBLIC_REGISTER_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bu rol ile herkese acik kayit olusturulamaz.",
        )

    if payload.national_id:
        existing_student = db.scalar(
            select(Student).where(Student.national_id == payload.national_id)
        )
        if existing_student is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Bu T.C. kimlik numarasi ile ogrenci kaydi zaten var.",
            )

    try:
        role_row = get_role_row(db, requested_role)
        company_id = None
        university_id = None
        full_name = payload.full_name.strip() if payload.full_name else ""

        if requested_role == Role.catering_admin.value:
            company_name = require_text(payload.company_name, "Firma adi")
            existing_company = db.scalar(
                select(Company).where(Company.company_name == company_name)
            )
            if existing_company is not None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bu sirket adi zaten kayitli.",
                )
            full_name = require_text(payload.full_name, "Ad soyad")
            company = Company(
                company_name=company_name,
                email=normalized_email,
                phone=payload.phone,
                status=True,
            )
            db.add(company)
            db.flush()
            db.add(
                License(
                    company_id=company.id,
                    plan_name="Starter",
                    max_universities=2,
                    max_users=5,
                    start_date=date.today(),
                    expire_date=date.today() + timedelta(days=30),
                    status=True,
                )
            )
            company_id = company.id

        elif requested_role == Role.university_admin.value:
            university = get_public_university(db, payload.university_id)
            full_name = require_text(payload.full_name, "Ad soyad")
            company_id = university.company_id
            university_id = university.id

        elif requested_role == Role.student.value:
            first_name = require_text(payload.first_name, "Ad")
            last_name = require_text(payload.last_name, "Soyad")
            if payload.age is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Yas zorunludur.",
                )
            require_text(payload.national_id, "T.C. kimlik no")
            university = get_public_university(db, payload.university_id)
            full_name = f"{first_name} {last_name}"
            university_id = university.id

        elif requested_role == Role.researcher.value:
            full_name = require_text(payload.full_name, "Ad soyad")
            require_text(payload.organization_name, "Kurum / universite")
            if payload.university_id is not None:
                university = get_public_university(db, payload.university_id)
                university_id = university.id

        elif requested_role == Role.partner_company.value:
            full_name = require_text(payload.full_name, "Yetkili ad soyad")
            require_text(payload.partner_company_name, "Partner firma adi")
            require_text(payload.brand_name, "Marka adi")

        user = UserProfile(
            auth_user_id=payload.auth_user_id,
            company_id=company_id,
            university_id=university_id,
            role_id=role_row.id,
            email=normalized_email,
            full_name=full_name,
            phone=payload.phone,
            password_hash=hash_password(payload.password),
            is_active=True,
        )
        db.add(user)
        db.flush()

        if requested_role == Role.student.value:
            db.add(
                Student(
                    first_name=require_text(payload.first_name, "Ad"),
                    last_name=require_text(payload.last_name, "Soyad"),
                    national_id=require_text(payload.national_id, "T.C. kimlik no"),
                    age=payload.age,
                    user_profile_id=user.id,
                )
            )
        elif requested_role == Role.researcher.value:
            db.add(
                ResearcherProfile(
                    user_profile_id=user.id,
                    organization_name=require_text(payload.organization_name, "Kurum / universite"),
                )
            )
        elif requested_role == Role.partner_company.value:
            db.add(
                PartnerCompanyProfile(
                    user_profile_id=user.id,
                    partner_company_name=require_text(payload.partner_company_name, "Partner firma adi"),
                    brand_name=require_text(payload.brand_name, "Marka adi"),
                    product_category=payload.product_category,
                )
            )

        db.commit()
        db.refresh(user)
        _ = user.role_obj

        try:
            send_welcome_email(normalized_email, full_name)
        except (BrevoConfigurationError, BrevoDeliveryError):
            pass

        token = f"mock-token-{normalized_email}"
        return AuthResponse(access_token=token, user=user)

    except HTTPException:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        logger.exception("Kayit islemi sirasinda beklenmeyen hata")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Kayit islemi sirasinda bir hata olustu. Lutfen tekrar deneyin.",
        )


@router.post("/login", response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    normalized_email = normalize_email(str(payload.email))
    user = db.scalar(
        select(UserProfile)
        .options(joinedload(UserProfile.role_obj))
        .where(
            func.lower(UserProfile.email) == normalized_email,
            UserProfile.is_active.is_(True),
        )
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatali e-posta veya sifre.",
        )
    if has_missing_password_hash(user.password_hash) and payload.password == "123456":
        user.password_hash = hash_password(payload.password)
        db.commit()
        db.refresh(user)

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Hatali e-posta veya sifre.",
        )

    token = f"mock-token-{normalized_email}"
    return AuthResponse(access_token=token, user=user)


@router.post("/password-reset/request")
def request_password_reset(payload: PasswordResetRequest, db: Session = Depends(get_db)):
    normalized_email = normalize_email(str(payload.email))
    user = db.scalar(
        select(UserProfile)
        .options(joinedload(UserProfile.role_obj))
        .where(
            func.lower(UserProfile.email) == normalized_email,
            UserProfile.is_active.is_(True),
        )
    )
    if user is not None:
        code = generate_reset_code()
        PASSWORD_RESET_CODES[normalized_email] = {
            "code": code,
            "expires_at": datetime.now(timezone.utc) + timedelta(minutes=PASSWORD_RESET_TTL_MINUTES),
        }
        try:
            send_password_reset_code_email(normalized_email, user.full_name, code)
        except BrevoConfigurationError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Mail servisi yapilandirilmadigi icin sifre sifirlama kodu gonderilemedi.",
            )
        except BrevoDeliveryError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Sifre sifirlama kodu e-posta ile gonderilemedi. Lutfen tekrar deneyin.",
            )

    return {"detail": "E-posta adresi kayitliysa 6 haneli sifirlama kodu gonderildi."}


@router.post("/password-reset/confirm")
def confirm_password_reset(payload: PasswordResetConfirm, db: Session = Depends(get_db)):
    normalized_email = normalize_email(str(payload.email))
    reset = PASSWORD_RESET_CODES.get(normalized_email)
    if not reset:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sifre sifirlama kodu gecersiz veya suresi dolmus.",
        )

    expires_at = reset.get("expires_at")
    if not isinstance(expires_at, datetime) or expires_at < datetime.now(timezone.utc):
        PASSWORD_RESET_CODES.pop(normalized_email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sifre sifirlama kodu gecersiz veya suresi dolmus.",
        )
    if reset.get("code") != payload.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sifre sifirlama kodu hatali.",
        )

    user = db.scalar(
        select(UserProfile).where(
            func.lower(UserProfile.email) == normalized_email,
            UserProfile.is_active.is_(True),
        )
    )
    if user is None:
        PASSWORD_RESET_CODES.pop(normalized_email, None)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sifre sifirlama kodu gecersiz veya suresi dolmus.",
        )

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    PASSWORD_RESET_CODES.pop(normalized_email, None)
    return {"detail": "Sifreniz basariyla guncellendi. Yeni sifrenizle giris yapabilirsiniz."}


@router.get("/me", response_model=UserRead)
def me(principal: Principal = Depends(get_current_principal)):
    return principal.profile
