from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.models.student_health_flag import (
    StudentHealthFlag,
    StudentHealthFlagCreate,
    StudentHealthFlagUpdate,
)

router = APIRouter(prefix="/student-health-flags", tags=["student-health-flags"])


@router.get("/")
def list_student_health_flags(active_only: bool = False):
    query = (
        get_db()
        .table("student_health_flags")
        .select("*, students(id, first_name, last_name, national_id)")
        .order("created_at", desc=True)
    )
    if active_only:
        query = query.eq("is_active", True)
    res = query.execute()
    return res.data


@router.get("/student/{student_id}")
def list_flags_for_student(student_id: int, active_only: bool = False):
    query = (
        get_db()
        .table("student_health_flags")
        .select("*")
        .eq("student_id", student_id)
        .order("created_at", desc=True)
    )
    if active_only:
        query = query.eq("is_active", True)
    res = query.execute()
    return res.data


@router.post("/", response_model=StudentHealthFlag, status_code=201)
def create_student_health_flag(payload: StudentHealthFlagCreate):
    student = get_db().table("students").select("id").eq("id", payload.student_id).single().execute()
    if not student.data:
        raise HTTPException(status_code=404, detail="Student not found")

    res = get_db().table("student_health_flags").insert(payload.model_dump()).execute()
    return res.data[0]


@router.patch("/{flag_id}", response_model=StudentHealthFlag)
def update_student_health_flag(flag_id: int, payload: StudentHealthFlagUpdate):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    res = get_db().table("student_health_flags").update(updates).eq("id", flag_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Health flag not found")
    return res.data[0]


@router.delete("/{flag_id}", status_code=204)
def delete_student_health_flag(flag_id: int):
    get_db().table("student_health_flags").delete().eq("id", flag_id).execute()
