import { todayLocal } from "./date";

export const MONTHS = [
  { value: "", label: "—" },
  { value: 1, label: "Ocak" },
  { value: 2, label: "Şubat" },
  { value: 3, label: "Mart" },
  { value: 4, label: "Nisan" },
  { value: 5, label: "Mayıs" },
  { value: 6, label: "Haziran" },
  { value: 7, label: "Temmuz" },
  { value: 8, label: "Ağustos" },
  { value: 9, label: "Eylül" },
  { value: 10, label: "Ekim" },
  { value: 11, label: "Kasım" },
  { value: 12, label: "Aralık" },
];

export const emptyForm = {
  name: "",
  unit: "kg",
  calories: 0,
  protein: 0,
  iron: 0,
  price: 0,
  is_local: false,
  origin_region: "",
  season_start_month: "",
  season_end_month: "",
  market_price: "",
  last_price_checked_at: "",
  min_stock: "",
};

export const emptyBatchForm = {
  quantity: "",
  unit_price: "",
  purchase_date: todayLocal(),
  expiry_date: "",
};

export function numericValue(value) {
  const normalized = String(value)
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .replace(/^0+(?=\d)/, "");
  if (!normalized || normalized === ".") return "";
  return normalized;
}

export function numericPayloadValue(value) {
  return value === "" ? 0 : Number(value);
}

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(new Date().toDateString());
  return Math.round(diff / 86400000);
}

export function expiryStyle(days) {
  if (days === null) return { color: "var(--text3)", label: "—" };
  if (days < 0) return { color: "var(--red)", label: "Süresi geçti" };
  if (days <= 3) return { color: "var(--red)", label: `${days} gün` };
  if (days <= 7) return { color: "var(--amber)", label: `${days} gün` };
  return { color: "var(--green)", label: `${days} gün` };
}

export function isInSeason(item) {
  const start = item.season_start_month;
  const end = item.season_end_month;
  if (!start || !end) return false;
  const month = new Date().getMonth() + 1;
  return start <= end ? month >= start && month <= end : month >= start || month <= end;
}

const A101_NOISE = new Set(["g", "gr", "kg", "ml", "l", "lt", "adet", "li", "lu", "x", "ve", "ile", "paket", "kutu"]);

const trFold = (value) =>
  (value || "").toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");

export function a101NeedsVerification(ingredientName, productName) {
  if (!productName) return false;
  const tokens = trFold(ingredientName).split(/[^a-z0-9]+/).filter((word) => word.length >= 2);
  if (!tokens.length) return false;
  const words = trFold(productName)
    .split(/[^a-z0-9]+/)
    .filter((word) => word && !A101_NOISE.has(word) && !/^\d+$/.test(word));
  const matched = (token) =>
    words.includes(token) ||
    words.some((word) => word.startsWith(token) && word.length - token.length <= 1) ||
    (token.length >= 4 && words.some((word) => word.startsWith(token.slice(0, 4))));
  return tokens.some((token) => !matched(token));
}
