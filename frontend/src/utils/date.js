// Yerel tarihi YYYY-MM-DD olarak formatlar. toISOString() KULLANMA — UTC'ye çevirir,
// UTC'nin doğusundaki saat dilimlerinde (örn. Türkiye, UTC+3) gece yarısı sonrası
// saatlerde "bugün"ü bir gün geriden gösterir.
export function formatLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocal() {
  return formatLocalDate(new Date());
}
