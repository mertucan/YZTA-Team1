import client from "../../../api/client";

const paramsFromFilters = ({ organizationId, startDate, endDate }) => {
  const params = { organization_id: organizationId || "qs" };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  return params;
};

export const getRankingOrganizations = () =>
  client.get("/university-quality-exports/organizations").then((r) => r.data);

export const getQualityExportPreview = (filters) =>
  client.get("/university-quality-exports/preview", { params: paramsFromFilters(filters) }).then((r) => r.data);

export const getQualityExportHistory = () =>
  client.get("/university-quality-exports/history").then((r) => r.data);

export const getQualityAiInsights = ({ organizationId, startDate, endDate }) =>
  client.post("/university-quality-exports/ai-insights", {
    organization_id: organizationId,
    start_date: startDate || null,
    end_date: endDate || null,
  }).then((r) => r.data);

export const downloadQualityExport = async ({ organizationId, exportFormat, startDate, endDate }) => {
  const response = await client.post(
    "/university-quality-exports/export",
    {
      organization_id: organizationId,
      export_format: exportFormat,
      start_date: startDate || null,
      end_date: endDate || null,
    },
    { responseType: "blob" },
  );

  const disposition = response.headers["content-disposition"] || "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] || `yemekhanai-quality-ranking.${exportFormat}`;
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
