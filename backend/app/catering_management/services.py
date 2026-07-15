from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.catering_management.models import License, Role, RoleModel, University, UserProfile
from app.catering_management.schemas import UniversityCreate, UserCreate


def ensure_active_license(db: Session, company_id: int) -> License:
    today = date.today()
    license_row = db.scalar(select(License).where(License.company_id == company_id))
    if license_row is None or not license_row.status or license_row.start_date > today or license_row.expire_date < today:
        raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail="Company license is not active")
    return license_row


def create_university_for_company(db: Session, company_id: int, payload: UniversityCreate) -> University:
    license_row = ensure_active_license(db, company_id)
    count = db.scalar(select(func.count(University.id)).where(University.company_id == company_id)) or 0
    if count >= license_row.max_universities:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="University license limit reached")

    university = University(
        company_id=company_id,
        university_name=payload.university_name,
        city=payload.city,
        student_count=payload.student_count
    )
    db.add(university)
    db.commit()
    db.refresh(university)
    return university


def create_user_for_company(db: Session, company_id: int, payload: UserCreate) -> UserProfile:
    license_row = ensure_active_license(db, company_id)
    count = db.scalar(select(func.count(UserProfile.id)).where(UserProfile.company_id == company_id)) or 0
    if count >= license_row.max_users:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User license limit reached")

    role_row = db.scalar(select(RoleModel).where(RoleModel.role_name == payload.role_name))
    if role_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role '{payload.role_name}' does not exist")

    if payload.role_name == Role.super_admin.value:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admins are created out-of-band")

    if payload.university_id is not None:
        university_exists = db.scalar(
            select(University.id).where(University.id == payload.university_id, University.company_id == company_id)
        )
        if university_exists is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found in company scope")

    if payload.role_name == Role.university_admin.value and payload.university_id is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="University admin needs university_id")

    if payload.role_name == Role.partner_company.value and payload.university_id is not None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Partner company users should not be assigned to a university")

    user = UserProfile(
        auth_user_id=payload.auth_user_id,
        company_id=company_id,
        university_id=payload.university_id,
        email=str(payload.email),
        full_name=payload.full_name,
        role_id=role_row.id,
        phone=payload.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    # Trigger lazy load if not already loaded, ensuring it's available after session detach
    _ = user.role_obj
    return user

