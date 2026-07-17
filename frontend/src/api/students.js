import client from "./client";

export const getStudents   = ()         => client.get("/students").then((r) => r.data);
export const createStudent = (data)     => client.post("/students", data).then((r) => r.data);
export const updateStudent = (id, data) => client.patch(`/students/${id}`, data).then((r) => r.data);
export const deleteStudent = (id)       => client.delete(`/students/${id}`);

/**
 * Birden çok öğrenciyi sırayla ekler; her satır için başarı/hata sonucunu toplar.
 * @param {Array<{first_name,last_name,national_id,age}>} rows
 * @returns {Promise<{ successCount:number, errors:Array<{row:number, message:string}> }>}
 */
export async function bulkCreateStudents(rows) {
  let successCount = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    try {
      await createStudent(rows[i]);
      successCount += 1;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      let message;
      if (Array.isArray(detail)) {
        message = detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      } else {
        message = detail || err?.message || "Eklenemedi";
      }
      errors.push({ row: i + 2, message }); // +2: başlık satırı + 1 tabanlı
    }
  }
  return { successCount, errors };
}
