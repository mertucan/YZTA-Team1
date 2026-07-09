from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.models.absence import Absence, AbsenceCreate

router = APIRouter(prefix="/absences", tags=["absences"])

_JOINED_SELECT = "id, absence_date, students(id, first_name, last_name, national_id)"


@router.get("/")
def list_absences():
    res = get_db().table("student_absences").select(_JOINED_SELECT).execute()
    return res.data


@router.get("/student/{student_id}")
def get_student_absences(student_id: int):
    res = (
        get_db()
        .table("student_absences")
        .select(_JOINED_SELECT)
        .eq("student_id", student_id)
        .execute()
    )
    return res.data


@router.post("/", response_model=Absence, status_code=201)
def create_absence(payload: AbsenceCreate):
    res = (
        get_db()
        .table("student_absences")
        .insert(payload.model_dump(mode="json"))
        .execute()
    )
    return res.data[0]


@router.delete("/{absence_id}", status_code=204)
def delete_absence(absence_id: int):
    get_db().table("student_absences").delete().eq("id", absence_id).execute()
