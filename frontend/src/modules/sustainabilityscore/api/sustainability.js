import client from "../../../api/client";

export async function fetchCarbonFactors() {
  const response = await client.get("/sustainability/carbon-factors");
  return response.data;
}

export async function fetchSustainabilitySummary() {
  const response = await client.get("/sustainability/summary");
  return response.data;
}

export async function fetchSustainabilityAnalysis() {
  const response = await client.get("/sustainability/analysis");
  return response.data;
}

export async function upsertCarbonFactor(payload) {
  const response = await client.post("/sustainability/carbon-factors", payload);
  return response.data;
}

export async function updateCarbonFactor(id, payload) {
  const response = await client.patch(`/sustainability/carbon-factors/${id}`, payload);
  return response.data;
}

export async function deleteCarbonFactor(id) {
  const response = await client.delete(`/sustainability/carbon-factors/${id}`);
  return response.data;
}
