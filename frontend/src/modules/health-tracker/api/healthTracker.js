import client from "../../../api/client";

export const getMealLogs = () =>
  client.get("/student-meals").then((r) => r.data);

export const getCaloriesByStudent = () =>
  client.get("/student-meals/by-student").then((r) => r.data);
