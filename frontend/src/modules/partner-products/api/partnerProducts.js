import client from "../../../api/client";

export const getPartnerMenuOpportunities = () =>
  client.get("/partner-products/menu-opportunities").then((r) => r.data);

export const getPartnerProductRequests = () =>
  client.get("/partner-products/requests").then((r) => r.data);

export const getPartnerProductUsage = () =>
  client.get("/partner-products/usage").then((r) => r.data);

export const createPartnerProductRequest = (payload) =>
  client.post("/partner-products/requests", payload).then((r) => r.data);

export const revisePartnerProductRequest = (id, payload) =>
  client.put(`/partner-products/requests/${id}`, payload).then((r) => r.data);

export const updatePartnerProductStatus = (id, payload) =>
  client.patch(`/partner-products/requests/${id}/status`, payload).then((r) => r.data);
