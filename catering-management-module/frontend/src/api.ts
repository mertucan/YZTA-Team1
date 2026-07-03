import { supabase } from "./supabase";

const apiUrl = import.meta.env.VITE_API_URL;

async function getAuthHeader(): Promise<Record<string, string>> {
  const mockSessionStr = localStorage.getItem("mock_session");
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

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("Oturum bulunamadı. Lütfen giriş yapın.");
  }
  return { Authorization: `Bearer ${token}` };
}

/**
 * FastAPI'nin döndürdüğü `detail` alanı string, obje veya dizi olabilir.
 * Bu yardımcı fonksiyon her durumu okunabilir bir stringe dönüştürür.
 */
function extractErrorMessage(detail: unknown, fallback = "İstek başarısız."): string {
  if (!detail) return fallback;
  if (typeof detail === "string") return detail;
  // Validation hatası: [{loc, msg, type}, ...]
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          const loc = (item as { loc?: string[] }).loc?.join(" → ") ?? "";
          const msg = (item as { msg: string }).msg;
          return loc ? `${loc}: ${msg}` : msg;
        }
        return JSON.stringify(item);
      })
      .join(" | ");
  }
  if (typeof detail === "object") {
    return JSON.stringify(detail);
  }
  return String(detail);
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const response = await fetch(`${apiUrl}${path}`, { headers });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "İstek başarısız." }));
    throw new Error(extractErrorMessage(error.detail));
  }

  return response.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "İstek başarısız." }));
    throw new Error(extractErrorMessage(error.detail));
  }

  return response.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const authHeader = await getAuthHeader();
  const response = await fetch(`${apiUrl}${path}`, {
    method: "PUT",
    headers: {
      ...authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "İstek başarısız." }));
    throw new Error(extractErrorMessage(error.detail));
  }

  return response.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await getAuthHeader();
  const response = await fetch(`${apiUrl}${path}`, {
    method: "DELETE",
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "İstek başarısız." }));
    throw new Error(extractErrorMessage(error.detail));
  }
}
