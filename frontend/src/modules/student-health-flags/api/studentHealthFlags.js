import client from "../../../api/client";

export const getStudentHealthFlags = () =>
  client.get("/student-health-flags").then((r) => r.data);

export const createStudentHealthFlag = (payload) =>
  client.post("/student-health-flags", payload).then((r) => r.data);

export const updateStudentHealthFlag = (id, payload) =>
  client.patch(`/student-health-flags/${id}`, payload).then((r) => r.data);
