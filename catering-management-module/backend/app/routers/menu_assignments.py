import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import Principal, require_company_scope, require_roles
from app.core.database import get_db
from app.models import Role, University, UniversityMenuAssignment
from app.schemas import MenuAssignmentCreate, MenuAssignmentRead, MenuAssignmentUpdate
from app.services import ensure_active_license

router = APIRouter(prefix="/menu-assignments", tags=["menu-assignments"])


@router.get("", response_model=list[MenuAssignmentRead])
def list_menu_assignments(
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> list[UniversityMenuAssignment]:
    query = select(UniversityMenuAssignment)
    if principal.role == Role.super_admin:
        return list(db.scalars(query.order_by(UniversityMenuAssignment.created_at.desc())).all())
    
    query = query.where(UniversityMenuAssignment.company_id == principal.company_id)
    if principal.role == Role.university_admin:
        query = query.where(UniversityMenuAssignment.university_id == principal.university_id)
        
    return list(db.scalars(query.order_by(UniversityMenuAssignment.created_at.desc())).all())


@router.post(
    "",
    response_model=MenuAssignmentRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(Role.super_admin, Role.catering_admin, Role.dietitian))],
)
def create_menu_assignment(
    payload: MenuAssignmentCreate,
    company_id: int | None = None,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> UniversityMenuAssignment:
    target_company_id = principal.company_id
    if principal.role == Role.super_admin:
        if company_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="company_id query parameter is required for super admin")
        target_company_id = company_id

    # Verify active license
    ensure_active_license(db, target_company_id)

    # Verify university belongs to company
    univ = db.scalar(
        select(University).where(University.id == payload.university_id, University.company_id == target_company_id)
    )
    if univ is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="University not found in company scope",
        )

    if payload.end_date < payload.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End date cannot be before start date",
        )

    assignment = UniversityMenuAssignment(
        menu_id=payload.menu_id,
        university_id=payload.university_id,
        company_id=target_company_id,
        assigned_by=principal.profile.id,
        start_date=payload.start_date,
        end_date=payload.end_date,
        status=payload.status,
        is_published=payload.is_published,
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)
    return assignment


@router.get("/{assignment_id}", response_model=MenuAssignmentRead)
def get_menu_assignment(
    assignment_id: int,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> UniversityMenuAssignment:
    query = select(UniversityMenuAssignment).where(UniversityMenuAssignment.id == assignment_id)
    if principal.role != Role.super_admin:
        query = query.where(UniversityMenuAssignment.company_id == principal.company_id)
    if principal.role == Role.university_admin:
        query = query.where(UniversityMenuAssignment.university_id == principal.university_id)

    assignment = db.scalar(query)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu assignment not found")
    return assignment


@router.put(
    "/{assignment_id}",
    response_model=MenuAssignmentRead,
    dependencies=[Depends(require_roles(Role.super_admin, Role.catering_admin, Role.dietitian))],
)
def update_menu_assignment(
    assignment_id: int,
    payload: MenuAssignmentUpdate,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
) -> UniversityMenuAssignment:
    query = select(UniversityMenuAssignment).where(UniversityMenuAssignment.id == assignment_id)
    if principal.role != Role.super_admin:
        query = query.where(UniversityMenuAssignment.company_id == principal.company_id)

    assignment = db.scalar(query)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu assignment not found")

    if payload.start_date is not None:
        assignment.start_date = payload.start_date
    if payload.end_date is not None:
        assignment.end_date = payload.end_date
    if payload.status is not None:
        assignment.status = payload.status
    if payload.is_published is not None:
        assignment.is_published = payload.is_published

    if assignment.end_date < assignment.start_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="End date cannot be before start date",
        )

    db.commit()
    db.refresh(assignment)
    return assignment


@router.delete(
    "/{assignment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles(Role.super_admin, Role.catering_admin))],
)
def delete_menu_assignment(
    assignment_id: int,
    principal: Principal = Depends(require_company_scope),
    db: Session = Depends(get_db),
):
    query = select(UniversityMenuAssignment).where(UniversityMenuAssignment.id == assignment_id)
    if principal.role != Role.super_admin:
        query = query.where(UniversityMenuAssignment.company_id == principal.company_id)

    assignment = db.scalar(query)
    if assignment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu assignment not found")

    db.delete(assignment)
    db.commit()
    return None
