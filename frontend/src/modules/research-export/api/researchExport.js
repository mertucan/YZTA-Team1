import client from "../../../api/client";

const paramsFromFilters = (filters) => {
  const params = {};
  if (filters.startDate) params.start_date = filters.startDate;
  if (filters.endDate) params.end_date = filters.endDate;
  return params;
};

export const getResearchExportPreview = (filters) =>
  client.get("/research-exports/preview", { params: paramsFromFilters(filters) }).then((r) => r.data);

export const sendResearchExportEmail = ({ recipientEmail, recipientName, startDate, endDate }) =>
  client.post("/research-exports/email", {
    recipient_email: recipientEmail,
    recipient_name: recipientName || null,
    start_date: startDate || null,
    end_date: endDate || null,
  }).then((r) => r.data);

export const getResearchExportHistory = () =>
  client.get("/research-exports/history").then((r) => r.data);
