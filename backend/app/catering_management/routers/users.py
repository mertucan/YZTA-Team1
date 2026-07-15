
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.catering_management.auth import Principal, require_company_scope, require_roles
from app.catering_management.core.database import get_db
from app.catering_management.models import Role, RoleModel, University, UserProfile
from app.catering_management.schemas import UserCreate, UserRead, UserUpdate
from app.catering_management.services import create_user_for_company

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserRead])
def list_users(
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> list[UserProfile]:
    query = select(UserProfile).options(joinedload(UserProfile.role_obj))
    if principal.role == Role.super_admin:
        return list(db.scalars(query.order_by(UserProfile.full_name)).all())
    
    query = query.where(UserProfile.company_id == principal.company_id)
    if principal.role == Role.university_admin:
        query = query.where(UserProfile.university_id == principal.university_id)
    
    return list(db.scalars(query.order_by(UserProfile.full_name)).all())


@router.post(
    "",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.catering_admin, Role.university_admin, Role.super_admin))],
)
def create_user(
    payload: UserCreate,
    company_id: int | None = None,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> UserProfile:
    target_company_id = principal.company_id
    if principal.role == Role.super_admin:
        if company_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="company_id query parameter is required for super admin")
        target_company_id = company_id

    if principal.role == Role.university_admin:
        if payload.university_id != principal.university_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create users outside university scope")
        if payload.role_name in {Role.super_admin.value, Role.catering_admin.value, Role.partner_company.value}:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot create company-level users")

    return create_user_for_company(db, target_company_id, payload)


@router.get("/{user_id}", response_model=UserRead)
def get_user(
    user_id: int,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> UserProfile:
    query = select(UserProfile).options(joinedload(UserProfile.role_obj)).where(UserProfile.id == user_id)
    if principal.role != Role.super_admin:
        query = query.where(UserProfile.company_id == principal.company_id)
    if principal.role == Role.university_admin:
        query = query.where(UserProfile.university_id == principal.university_id)

    user = db.scalar(query)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")
    return user


@router.put("/{user_id}", response_model=UserRead)
def update_user(
    user_id: int,
    payload: UserUpdate,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> UserProfile:
    query = select(UserProfile).options(joinedload(UserProfile.role_obj)).where(UserProfile.id == user_id)
    if principal.role != Role.super_admin:
        query = query.where(UserProfile.company_id == principal.company_id)
    if principal.role == Role.university_admin:
        query = query.where(UserProfile.university_id == principal.university_id)

    user = db.scalar(query)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    if principal.role not in {Role.super_admin, Role.catering_admin, Role.university_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")

    if payload.full_name is not None:
        user.full_name = payload.full_name
    if payload.phone is not None:
        user.phone = payload.phone
    if payload.is_active is not None:
        if user.auth_user_id == principal.auth_user_id and not payload.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot deactivate your own profile")
        user.is_active = payload.is_active

    if payload.university_id is not None or "university_id" in payload.model_fields_set:
        if principal.role == Role.university_admin and payload.university_id != principal.university_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot assign user outside your university scope")
        
        if payload.university_id is not None:
            univ = db.scalar(select(University).where(University.id == payload.university_id, University.company_id == user.company_id))
            if not univ:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found in company scope")
        user.university_id = payload.university_id

    if payload.role_name is not None:
        if principal.role == Role.university_admin:
            if payload.role_name in {Role.super_admin.value, Role.catering_admin.value, Role.partner_company.value}:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot assign company-level roles")
        
        role_row = db.scalar(select(RoleModel).where(RoleModel.role_name == payload.role_name))
        if role_row is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Role '{payload.role_name}' not found")
        user.role_id = role_row.id

    db.commit()
    db.refresh(user)
    _ = user.role_obj
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
):
    query = select(UserProfile).where(UserProfile.id == user_id)
    if principal.role != Role.super_admin:
        query = query.where(UserProfile.company_id == principal.company_id)
    if principal.role == Role.university_admin:
        query = query.where(UserProfile.university_id == principal.university_id)

    user = db.scalar(query)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    if user.auth_user_id == principal.auth_user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete your own profile")

    if principal.role not in {Role.super_admin, Role.catering_admin, Role.university_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(user)
    db.commit()
    return None

