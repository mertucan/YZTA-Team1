import client from "./client";

export const getMeals  = ()         => client.get("/meals").then((r) => r.data);
export const createMeal = (data)    => client.post("/meals", data).then((r) => r.data);
export const updateMeal = (id,data) => client.patch(`/meals/${id}`, data).then((r) => r.data);
export const deleteMeal = (id)      => client.delete(`/meals/${id}`);
