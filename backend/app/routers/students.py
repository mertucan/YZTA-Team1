from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models.student import Student, StudentCreate, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])


@router.get("/", response_model=list[Student])
def list_students():
    res = get_db().table("students").select("*").execute()
    return res.data


@router.get("/{student_id}", response_model=Student)
def get_student(student_id: int):
    res = get_db().table("students").select("*").eq("id", student_id).single().execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Student not found")
    return res.data


@router.post("/", response_model=Student, status_code=201)
def create_student(payload: StudentCreate):
    res = get_db().table("students").insert(payload.model_dump()).execute()
    return res.data[0]


@router.patch("/{student_id}", response_model=Student)
def update_student(student_id: int, payload: StudentUpdate):
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    res = get_db().table("students").update(updates).eq("id", student_id).execute()
    return res.data[0]


@router.delete("/{student_id}", status_code=204)
def delete_student(student_id: int):
    get_db().table("students").delete().eq("id", student_id).execute()
