import { isSupabaseConfigured, supabase } from "./supabase";

export const CATERING_SESSION_KEY = "catering_mock_session";

const configuredApiUrl = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");
const rootApiUrl = configuredApiUrl.endsWith("/api")
  ? configuredApiUrl.slice(0, -4)
  : configuredApiUrl;
const API_BASE_URL = `${rootApiUrl}/api/catering-management`;

async function getAuthHeader() {
  const mockSessionStr = localStorage.getItem(CATERING_SESSION_KEY);
  if (mockSessionStr) {
    try {
      const mockSession = JSON.parse(mockSessionStr);
      if (mockSession?.access_token) {
        return { Authorization: `Bearer ${mockSession.access_token}` };
      }
    } catch {
      // ignore
    }
  }

  if (isSupabaseConfigured) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  }

  throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");
}

function extractErrorMessage(detail, fallback = "İstek başarısız.") {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail.map((item) => {
      if (typeof item === "object" && item !== null && "msg" in item) {
        const loc = item.loc?.join(" -> ") ?? "";
        const msg = item.msg;
        return loc ? `${loc}: ${msg}` : msg;
      }
      return JSON.stringify(item);
    }).join(" | ");
  }
  if (typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return String(detail);
}

async function parseError(response) {
  const error = await response.json().catch(() => ({ detail: "İstek başarısız." }));
  return new Error(extractErrorMessage(error.detail));
}

export async function apiGet(path) {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_BASE_URL}${path}`, { headers });
  if (!response.ok) {
    throw await parseError(response);
  }
  return response.json();
}

export async function apiPost(path, body) {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return response.json();
}

export async function apiPut(path, body) {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw await parseError(response);
  }
  return response.json();
}

export async function apiDelete(path) {
  const headers = await getAuthHeader();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers,
  });
  if (!response.ok) {
    throw await parseError(response);
  }
}

export { API_BASE_URL };
