import client from "./client";

export const getAbsences   = ()      => client.get("/absences").then((r) => r.data);
export const createAbsence = (data)  => client.post("/absences", data).then((r) => r.data);
export const deleteAbsence = (id)    => client.delete(`/absences/${id}`);
