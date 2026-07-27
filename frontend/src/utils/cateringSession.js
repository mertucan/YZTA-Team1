export const CATERING_SESSION_KEY = "catering_mock_session";

export function readCateringSession() {
  try {
    const rawSession = localStorage.getItem(CATERING_SESSION_KEY);
    return rawSession ? JSON.parse(rawSession) : null;
  } catch {
    return null;
  }
}

export function hasCateringSession() {
  return Boolean(readCateringSession()?.user);
}
