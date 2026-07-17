import axios from "axios";

const CATERING_SESSION_KEY = "catering_mock_session";

const client = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

client.interceptors.request.use((config) => {
  const rawSession = localStorage.getItem(CATERING_SESSION_KEY);
  if (!rawSession) return config;

  try {
    const session = JSON.parse(rawSession);
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // Ignore malformed local session data.
  }

  return config;
});

export default client;
