import client from "./client";

export const getAbsences   = ()      => client.get("/absences").then((r) => r.data);
export const createAbsence = (data)  => client.post("/absences", data).then((r) => r.data);
export const deleteAbsence = (id)    => client.delete(`/absences/${id}`);

/**
 * Birden çok devamsızlığı sırayla ekler; her satır için başarı/hata sonucunu toplar.
 * @param {Array<{student_id:number, absence_date:string}>} rows
 * @returns {Promise<{ successCount:number, errors:Array<{row:number, message:string}> }>}
 */
export async function bulkCreateAbsences(rows) {
  let successCount = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const { _row, ...payload } = rows[i];
    try {
      await createAbsence(payload);
      successCount += 1;
    } catch (err) {
      const detail = err?.response?.data?.detail;
      let message;
      if (Array.isArray(detail)) {
        message = detail.map((d) => d.msg || JSON.stringify(d)).join(", ");
      } else {
        message = detail || err?.message || "Eklenemedi";
      }
      errors.push({ row: _row ?? i + 2, message });
    }
  }
  return { successCount, errors };
}
