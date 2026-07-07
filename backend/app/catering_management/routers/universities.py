import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.catering_management.auth import Principal, require_company_scope, require_roles
from app.catering_management.core.database import get_db
from app.catering_management.models import Role, University
from app.catering_management.schemas import UniversityCreate, UniversityRead, UniversityUpdate
from app.catering_management.services import create_university_for_company

router = APIRouter(prefix="/universities", tags=["universities"])


@router.get("", response_model=list[UniversityRead])
def list_universities(
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> list[University]:
    query = select(University)
    if principal.role == Role.super_admin:
        return list(db.scalars(query.order_by(University.university_name)).all())
    
    if principal.role == Role.university_admin:
        query = query.where(University.id == principal.university_id, University.company_id == principal.company_id)
    else:
        query = query.where(University.company_id == principal.company_id)
    
    return list(db.scalars(query.order_by(University.university_name)).all())


@router.post(
    "",
    response_model=UniversityRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.catering_admin, Role.super_admin))],
)
def create_university(
    payload: UniversityCreate,
    company_id: int | None = None,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> University:
    target_company_id = principal.company_id
    if principal.role == Role.super_admin:
        if company_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="company_id query parameter is required for super admin")
        target_company_id = company_id

    return create_university_for_company(db, target_company_id, payload)


@router.get("/{university_id}", response_model=UniversityRead)
def get_university(
    university_id: int,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> University:
    query = select(University).where(University.id == university_id)
    if principal.role != Role.super_admin:
        query = query.where(University.company_id == principal.company_id)
    if principal.role == Role.university_admin:
        query = query.where(University.id == principal.university_id)
    
    university = db.scalar(query)
    if university is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")
    return university


@router.put("/{university_id}", response_model=UniversityRead)
def update_university(
    university_id: int,
    payload: UniversityUpdate,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> University:
    query = select(University).where(University.id == university_id)
    if principal.role != Role.super_admin:
        query = query.where(University.company_id == principal.company_id)
    if principal.role == Role.university_admin:
        query = query.where(University.id == principal.university_id)

    university = db.scalar(query)
    if university is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")

    if principal.role not in {Role.super_admin, Role.catering_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only catering admins or super admins can edit universities")

    if payload.university_name is not None:
        university.university_name = payload.university_name
    if payload.city is not None:
        university.city = payload.city
    if payload.student_count is not None:
        university.student_count = payload.student_count
    if payload.status is not None:
        university.status = payload.status

    db.commit()
    db.refresh(university)
    return university


@router.delete("/{university_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_university(
    university_id: int,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
):
    query = select(University).where(University.id == university_id)
    if principal.role != Role.super_admin:
        query = query.where(University.company_id == principal.company_id)

    university = db.scalar(query)
    if university is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="University not found")

    if principal.role not in {Role.super_admin, Role.catering_admin}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only catering admins or super admins can delete universities")

    db.delete(university)
    db.commit()
    return None

