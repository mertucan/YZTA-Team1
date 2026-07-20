import client from "../../../api/client";

const paramsFromFilters = (filters, tableIds = []) => {
  const params = {};
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  if (tableIds.length) params.table_ids = tableIds;
  return params;
};

export const getResearchExportTables = () =>
  client.get("/research-exports/tables").then((r) => r.data);

export const getResearchExportPreview = (filters, tableIds = []) =>
  client.get("/research-exports/preview", { params: paramsFromFilters(filters, tableIds) }).then((r) => r.data);

export const sendResearchExportEmail = ({ recipientEmail, recipientName, startDate, endDate, tableIds }) =>
  client.post("/research-exports/email", {
    recipient_email: recipientEmail,
    recipient_name: recipientName || null,
    start_date: startDate || null,
    end_date: endDate || null,
    table_ids: tableIds || [],
  }).then((r) => r.data);

export const getResearchExportHistory = () =>
  client.get("/research-exports/history").then((r) => r.data);
