import client from "./client";

// Tedarikçiler
export const getSuppliers   = ()          => client.get("/orders/suppliers").then((r) => r.data);
export const createSupplier = (data)      => client.post("/orders/suppliers", data).then((r) => r.data);
export const updateSupplier = (id, data)  => client.patch(`/orders/suppliers/${id}`, data).then((r) => r.data);
export const deleteSupplier = (id)        => client.delete(`/orders/suppliers/${id}`);

// Siparişler
export const getOrders      = ()          => client.get("/orders/").then((r) => r.data);
export const generateOrder  = (data = {}) => client.post("/orders/generate", data).then((r) => r.data);
export const updateOrder    = (id, data)  => client.patch(`/orders/${id}`, data).then((r) => r.data);
export const receiveOrder   = (id)        => client.post(`/orders/${id}/receive`).then((r) => r.data);
export const deleteOrder    = (id)        => client.delete(`/orders/${id}`);
