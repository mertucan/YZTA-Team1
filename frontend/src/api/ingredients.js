import client from "./client";

export const getIngredients  = ()         => client.get("/ingredients").then((r) => r.data);
export const createIngredient = (data)    => client.post("/ingredients", data).then((r) => r.data);
export const updateIngredient = (id,data) => client.patch(`/ingredients/${id}`, data).then((r) => r.data);
export const deleteIngredient = (id)      => client.delete(`/ingredients/${id}`);
