import client from "../../../api/client";

export const getCompanies = async () => {
  try {
    const response = await client.get("/tenders/companies-list");
    return response.data;
  } catch (err) {
    return [{ id: 1, name: "Ana Catering Firması A.Ş." }];
  }
};

export const getTenders = async (status) => {
  const response = await client.get("/tenders", { params: { status } });
  return response.data;
};

export const createTender = async (payload) => {
  const response = await client.post("/tenders", payload);
  return response.data;
};

export const updateTender = async (id, payload) => {
  const response = await client.patch(`/tenders/${id}`, payload);
  return response.data;
};

export const deleteTender = async (id) => {
  const response = await client.delete(`/tenders/${id}`);
  return response.data;
};

export const calculateTenderCost = async (payload) => {
  const response = await client.post("/tenders/calculate-cost", payload);
  return response.data;
};

export const getInvoices = async (status) => {
  const response = await client.get("/invoices", { params: { status } });
  return response.data;
};

export const createInvoice = async (payload) => {
  const response = await client.post("/invoices", payload);
  return response.data;
};

export const autoGenerateInvoice = async (payload) => {
  const response = await client.post("/invoices/auto-generate", payload);
  return response.data;
};

export const updateInvoiceStatus = async (id, status) => {
  const response = await client.patch(`/invoices/${id}/status`, { status });
  return response.data;
};

export const deleteInvoice = async (id) => {
  const response = await client.delete(`/invoices/${id}`);
  return response.data;
};
