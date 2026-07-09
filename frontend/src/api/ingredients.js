import client from "./client";

export const getIngredients  = ()         => client.get("/ingredients").then((r) => r.data);
export const createIngredient = (data)    => client.post("/ingredients", data).then((r) => r.data);
export const updateIngredient = (id,data) => client.patch(`/ingredients/${id}`, data).then((r) => r.data);
export const deleteIngredient = (id)      => client.delete(`/ingredients/${id}`);

export const getBatches   = (ingredientId)          => client.get(`/ingredients/${ingredientId}/batches`).then((r) => r.data);
export const createBatch  = (ingredientId, data)    => client.post(`/ingredients/${ingredientId}/batches`, data).then((r) => r.data);
export const updateBatch  = (ingredientId, batchId, data) => client.patch(`/ingredients/${ingredientId}/batches/${batchId}`, data).then((r) => r.data);
export const deleteBatch  = (ingredientId, batchId) => client.delete(`/ingredients/${ingredientId}/batches/${batchId}`);
