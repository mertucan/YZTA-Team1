import { Fragment, useEffect, useState } from "react";
import {
  getIngredients,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getBatches,
  createBatch,
  deleteBatch,
  getMarketPrices,
  fetchMarketPrice,
  getMarketHealth,
  selfHealMarket,
} from "../api/ingredients";
import { todayLocal } from "../utils/date";
import LoadingSpinner from "../components/LoadingSpinner";

const MONTHS = [
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

const emptyForm = {
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
};

const emptyBatchForm = {
  quantity: "",
  unit_price: "",
  purchase_date: todayLocal(),
  expiry_date: "",
};

function numericValue(value) {
  const normalized = String(value)
    .replace(",", ".")
    .replace(/[^\d.]/g, "")
    .replace(/(\..*)\./g, "$1")
    .replace(/^0+(?=\d)/, "");
  if (!normalized || normalized === ".") return "";
  return normalized;
}

function numericPayloadValue(value) {
  return value === "" ? 0 : Number(value);
}

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date(new Date().toDateString());
  return Math.round(diff / 86400000);
};

const expiryStyle = (days) => {
  if (days === null) return { color: "var(--text3)", label: "—" };
  if (days < 0) return { color: "var(--red)", label: "Süresi geçti" };
  if (days <= 3) return { color: "var(--red)", label: `${days} gün` };
  if (days <= 7) return { color: "var(--amber)", label: `${days} gün` };
  return { color: "var(--green)", label: `${days} gün` };
};

function isInSeason(item) {
  const start = item.season_start_month;
  const end = item.season_end_month;
  if (!start || !end) return false;
  const m = new Date().getMonth() + 1;
  return start <= end ? m >= start && m <= end : m >= start || m <= end;
}

function SeasonalBadge({ item }) {
  const local = item.is_local === true;
  const seasonal = isInSeason(item);
  if (!local && !seasonal) return null;
  return (
    <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>
      {local && <span style={badgeLocal}>Yerel</span>}
      {seasonal && <span style={badgeSeason}>Mevsimde</span>}
    </span>
  );
}

/* Malzeme adı ↔ A101 ürün adı kelime kapsaması. Backend ile aynı mantık: malzeme adının
   anlamlı kelimelerinden biri ürün adında yoksa (ör. "Tavuk Göğsü" ile "Tavuk Baget"
   eşleşmesinde 'göğsü' yok) eşleşme şüphelidir ve doğrulama gerekli sayılır. Sayfa yenilense de çalışır. */
const A101_NOISE = new Set(["g", "gr", "kg", "ml", "l", "lt", "adet", "li", "lu", "x", "ve", "ile", "paket", "kutu"]);
const trFold = (s) =>
  (s || "").toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");
function a101NeedsVerification(ingredientName, productName) {
  if (!productName) return false;
  const tokens = trFold(ingredientName).split(/[^a-z0-9]+/).filter((w) => w.length >= 2);
  if (!tokens.length) return false;
  const words = trFold(productName).split(/[^a-z0-9]+/).filter((w) => w && !A101_NOISE.has(w) && !/^\d+$/.test(w));
  const matched = (t) =>
    words.includes(t) ||
    words.some((w) => w.startsWith(t) && w.length - t.length <= 1) ||
    (t.length >= 4 && words.some((w) => w.startsWith(t.slice(0, 4))));
  return tokens.some((t) => !matched(t));
}

/* ─── A101 Fiyat Hücresi ────────────────────────────────────────────────────── */
function A101Cell({ rec, ingredientName, error, busy, onFetch }) {
  // Taze çekimde backend needs_verification döndürür; kayıtlı kayıtta ada göre hesapla.
  const flagged = rec && (rec.needs_verification ?? a101NeedsVerification(ingredientName, rec.product_name));
  const fmtDate = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  // LLM ajanı Migros'ta uygun ham ürün bulamadıysa → net "manuel giriş" durumu
  if (rec && rec.needs_manual_entry) {
    return (
      <div style={marketCell}>
        <div style={{ fontSize: 10, color: "var(--amber)", fontWeight: 700 }} title={rec.warning || ""}>
          Migros'ta yok — elle girin
        </div>
        <div style={{ fontSize: 9, color: "var(--text3)" }}>
          Fiyatı "Fiyat (TL)" alanından girin
        </div>
        <button onClick={onFetch} disabled={busy} style={{ ...btnIconSm, marginTop: 2 }} title="Tekrar dene">
          {busy ? "..." : "Tekrar dene"}
        </button>
        {error && <div style={{ fontSize: 9, color: "var(--red)" }}>{String(error).slice(0, 40)}</div>}
      </div>
    );
  }
  return (
    <div style={marketCell}>
      {rec ? (
        <>
          <div style={marketCellRow}>
            {rec.unit_price != null ? (
              <span style={marketPriceText}>
                {Number(rec.unit_price).toFixed(2)} TL/{rec.pack_unit}
                <a
                  href={rec.product_url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${rec.product_name || "Ürün"} — Migros sayfasını aç`}
                  style={externalLinkBtn}
                >
                  ↗
                </a>
              </span>
            ) : (
              <span style={marketWarnText} title="Ürünün satış birimi çözülemedi; yalnızca paket fiyatı gösteriliyor (uydurma birim fiyat üretilmedi)">
                {Number(rec.last_price || 0).toFixed(2)} TL / paket · birim yok
                <a
                  href={rec.product_url}
                  target="_blank"
                  rel="noreferrer"
                  title={`${rec.product_name || "Ürün"} — Migros sayfasını aç`}
                  style={externalLinkBtn}
                >
                  ↗
                </a>
              </span>
            )}
            <span style={marketActions}>
              <button onClick={onFetch} disabled={busy} style={btnIconSm} title="Fiyatı yeniden çek">
                {busy ? "..." : "Yenile"}
              </button>
            </span>
          </div>
          <div style={{ fontSize: 9, color: "var(--text3)" }} title={rec.product_name || ""}>
            {(rec.product_name || "").slice(0, 26)}{(rec.product_name || "").length > 26 ? "…" : ""}
          </div>
          {flagged && (
            <div
              style={{ fontSize: 9, color: "var(--amber)", fontWeight: 700, maxWidth: 160 }}
              title={rec.warning || "Malzeme adı ile eşleşen ürün bulunamadı; yanlış ürün olabilir. Fiyat menü planlayıcıda kullanılmaz — linke tıklayıp doğrulayın."}
            >
              Doğrulama gerekli
            </div>
          )}
          <div style={{ fontSize: 9, color: "var(--text3)" }}>Kontrol: {fmtDate(rec.checked_at)}</div>
        </>
      ) : (
        <button onClick={onFetch} disabled={busy} style={btnIconSm}>
          {busy ? "Çekiliyor..." : "Çek"}
        </button>
      )}
      {error && (
        <div style={{ fontSize: 9, color: "var(--red)", maxWidth: 150 }} title={error}>
          {String(error).slice(0, 40)}…
        </div>
      )}
    </div>
  );
}

/* ─── Parti Paneli ──────────────────────────────────────────────────────────── */
function BatchPanel({ ingredient, onStockChanged }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyBatchForm);

  const refresh = () =>
    getBatches(ingredient.id)
      .then(setBatches)
      .finally(() => setLoading(false));

  useEffect(() => {
    refresh();
  }, [ingredient.id]);

  const handleAdd = async () => {
    if (!form.quantity || !form.purchase_date) return;
    await createBatch(ingredient.id, {
      quantity: numericPayloadValue(form.quantity),
      unit_price: form.unit_price !== "" ? Number(form.unit_price) : null,
      purchase_date: form.purchase_date,
      expiry_date: form.expiry_date || null,
    });
    setForm(emptyBatchForm);
    await refresh();
    onStockChanged();
  };

  const handleDelete = async (batchId) => {
    await deleteBatch(ingredient.id, batchId);
    await refresh();
    onStockChanged();
  };

  return (
    <div style={{ padding: "12px 18px 18px", background: "var(--surface2)" }}>
      {/* Mevsim / Yerellik bilgisi */}
      {(ingredient.origin_region || ingredient.season_start_month) && (
        <div
          style={{
            marginBottom: 10,
            fontSize: 11,
            color: "var(--text2)",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          {ingredient.origin_region && (
            <span>
              <strong>Kaynak:</strong> {ingredient.origin_region}
            </span>
          )}
          {ingredient.season_start_month && ingredient.season_end_month && (
            <span>
              <strong>Sezon:</strong>{" "}
              {
                MONTHS.find((m) => m.value === ingredient.season_start_month)
                  ?.label
              }
              {" – "}
              {
                MONTHS.find((m) => m.value === ingredient.season_end_month)
                  ?.label
              }
              {isInSeason(ingredient) ? (
                <span
                  style={{
                    color: "var(--green)",
                    marginLeft: 4,
                    fontWeight: 600,
                  }}
                >
                  Şu an mevsimde
                </span>
              ) : (
                <span style={{ color: "var(--text3)", marginLeft: 4 }}>
                  (sezon dışı)
                </span>
              )}
            </span>
          )}
          {ingredient.market_price > 0 && (
            <span>
              <strong>Piyasa fiyatı:</strong>{" "}
              {Number(ingredient.market_price).toFixed(2)} TL
              {ingredient.price > 0 &&
                ingredient.market_price > ingredient.price && (
                  <span style={{ color: "var(--green)", marginLeft: 4 }}>
                    (
                    {Math.round(
                      (1 - ingredient.price / ingredient.market_price) * 100,
                    )}
                    % avantajlı)
                  </span>
                )}
            </span>
          )}
        </div>
      )}

      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text3)",
          textTransform: "uppercase",
          letterSpacing: ".06em",
          marginBottom: 8,
        }}
      >
        {ingredient.name} — Alınan Partiler
      </div>
      {loading ? (
        <LoadingSpinner label="Parti bilgileri yükleniyor" minHeight={120} size={32} />
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 10,
          }}
        >
          <thead>
            <tr>
              {["Miktar", "Birim Fiyat", "Alınma Tarihi", "SKT", ""].map((h) => (
                <th key={h} style={thSm}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {batches.length === 0 && (
              <tr>
                <td style={tdSm} colSpan={5}>
                  Henüz parti eklenmemiş.
                </td>
              </tr>
            )}
            {batches.map((b) => {
              const days = daysUntil(b.expiry_date);
              const exp = expiryStyle(days);
              return (
                <tr key={b.id}>
                  <td
                    style={{
                      ...tdSm,
                      fontFamily: "var(--mono)",
                      fontWeight: 600,
                    }}
                  >
                    {b.quantity} {ingredient.unit}
                  </td>
                  <td style={{ ...tdSm, fontFamily: "var(--mono)" }}>
                    {b.unit_price != null && Number(b.unit_price) > 0
                      ? `${Number(b.unit_price).toFixed(2)} TL/${ingredient.unit}`
                      : "—"}
                  </td>
                  <td style={tdSm}>{b.purchase_date}</td>
                  <td style={{ ...tdSm, fontWeight: 600, color: exp.color }}>
                    {exp.label}
                  </td>
                  <td style={tdSm}>
                    <button onClick={() => handleDelete(b.id)} style={btnXs}>
                      Sil
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
          gap: 8,
          alignItems: "end",
        }}
      >
        <div>
          <div style={fieldLabelSm}>Miktar ({ingredient.unit})</div>
          <input
            type="text"
            inputMode="decimal"
            value={form.quantity}
            placeholder="0"
            onChange={(e) =>
              setForm({ ...form, quantity: numericValue(e.target.value) })
            }
            style={inputSm}
          />
        </div>
        <div>
          <div style={fieldLabelSm}>Birim Fiyat (TL/{ingredient.unit})</div>
          <input
            type="text"
            inputMode="decimal"
            value={form.unit_price}
            placeholder="0.00"
            onChange={(e) =>
              setForm({ ...form, unit_price: numericValue(e.target.value) })
            }
            style={inputSm}
          />
        </div>
        <div>
          <div style={fieldLabelSm}>Alınma Tarihi</div>
          <input
            type="date"
            value={form.purchase_date}
            onChange={(e) =>
              setForm({ ...form, purchase_date: e.target.value })
            }
            style={inputSm}
          />
        </div>
        <div>
          <div style={fieldLabelSm}>Son Kul. Tarihi</div>
          <input
            type="date"
            value={form.expiry_date}
            onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
            style={inputSm}
          />
        </div>
        <button onClick={handleAdd} style={btnPrimarySm}>
          + Parti Ekle
        </button>
      </div>
    </div>
  );
}

/* ─── Ana Sayfa ─────────────────────────────────────────────────────────────── */
export default function Ingredients() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [formOpen, setFormOpen] = useState(true);
  const [stockListOpen, setStockListOpen] = useState(false);
  const [search, setSearch] = useState("");

  // A101 fiyat eşleştirmeleri: {ingredient_id: kayit}
  const [a101, setA101] = useState({});
  const [a101Busy, setA101Busy] = useState(null); // ingredient_id | "all" | null
  const [a101Progress, setA101Progress] = useState("");
  const [a101Errors, setA101Errors] = useState({});
  const [a101Notice, setA101Notice] = useState(""); // birim değişimi/özet bildirimi
  const [health, setHealth] = useState(null);
  const [healing, setHealing] = useState(false);

  const refresh = () =>
    getIngredients()
      .then(setItems)
      .finally(() => setLoading(false));
  const refreshA101 = () =>
    getMarketPrices()
      .then((list) => setA101(Object.fromEntries(list.map((r) => [r.ingredient_id, r]))))
      .catch(() => {});
  useEffect(() => {
    refresh();
    refreshA101();
  }, []);

  const handleFetchA101 = async (id) => {
    setA101Busy(id);
    setA101Notice("");
    setA101Errors((prev) => ({ ...prev, [id]: null }));
    try {
      const rec = await fetchMarketPrice(id);
      setA101((prev) => ({ ...prev, [id]: rec }));
      if (rec.unit_changed) {
        const ing = items.find((i) => i.id === id);
        setA101Notice(`Bilgi: "${ing?.name ?? "Malzeme"}" birimi Migros ile eşitlendi: ${rec.new_unit}`);
      }
      refresh(); // birim ve/veya ortalama fiyat değişmiş olabilir
    } catch (err) {
      setA101Errors((prev) => ({ ...prev, [id]: err?.response?.data?.detail || "Migros verisi çekilemedi." }));
    } finally {
      setA101Busy(null);
    }
  };

  // Tüm malzemeler için sırayla çek (siteyi yormamak için paralel değil)
  const handleFetchAllA101 = async () => {
    setA101Busy("all");
    setA101Notice("");
    const list = [...items];
    const changed = [];
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      setA101Progress(`${i + 1}/${list.length}`);
      try {
        const rec = await fetchMarketPrice(list[i].id);
        setA101((prev) => ({ ...prev, [list[i].id]: rec }));
        setA101Errors((prev) => ({ ...prev, [list[i].id]: null }));
        ok += 1;
        if (rec.unit_changed) changed.push(`${list[i].name}: ${rec.new_unit}`);
      } catch (err) {
        setA101Errors((prev) => ({ ...prev, [list[i].id]: err?.response?.data?.detail || "çekilemedi" }));
      }
    }
    setA101Progress("");
    setA101Busy(null);
    let msg = `${ok}/${list.length} malzeme için Migros fiyatı çekildi.`;
    if (changed.length) msg += ` Birimi eşitlenenler: ${changed.join(", ")}.`;
    setA101Notice(msg);
    refresh();
  };

  const loadHealth = async () => {
    try { setHealth(await getMarketHealth()); } catch { setHealth(null); }
  };
  useEffect(() => { loadHealth(); }, []);

  const handleSelfHeal = async () => {
    setHealing(true);
    setA101Notice("");
    try {
      const rep = await selfHealMarket();
      setHealth(rep);
      setA101Notice(
        rep.api_ok && rep.price_field
          ? `Migros fiyat servisi sağlıklı (alan: ${rep.price_field}). Örnek: ${rep.sample?.name ?? "-"}: ${rep.sample?.unit_price ?? "-"} TL/${rep.sample?.unit ?? "-"}.`
          : `Migros servisi sorunlu: ${rep.message}`
      );
    } catch {
      setA101Notice("Sağlık kontrolü yapılamadı.");
    } finally {
      setHealing(false);
    }
  };

  /* Temel sayısal alanlar — fiyat artık burada değil: partiler (alımlar) üzerinden
     miktar-ağırlıklı ortalama olarak otomatik hesaplanır */
  const basicFields = [
    { label: "Malzeme Adı", key: "name", type: "text" },
    { label: "Kalori", key: "calories", type: "number" },
    { label: "Protein (g)", key: "protein", type: "number" },
    { label: "Demir (mg)", key: "iron", type: "number" },
  ];

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      unit: form.unit,
      calories: numericPayloadValue(form.calories),
      protein: numericPayloadValue(form.protein),
      iron: numericPayloadValue(form.iron),
      is_local: Boolean(form.is_local),
      origin_region: form.origin_region || null,
      season_start_month:
        form.season_start_month !== "" ? Number(form.season_start_month) : null,
      season_end_month:
        form.season_end_month !== "" ? Number(form.season_end_month) : null,
      market_price: form.market_price !== "" ? Number(form.market_price) : null,
      last_price_checked_at: form.last_price_checked_at || null,
    };
    if (editingId) {
      await updateIngredient(editingId, payload);
    } else {
      await createIngredient(payload);
    }
    setForm(emptyForm);
    setEditingId(null);
    refresh();
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setFormOpen(true);
    setForm({
      name: item.name,
      unit: item.unit,
      price: item.price,
      calories: item.calories,
      protein: item.protein,
      iron: item.iron,
      is_local: Boolean(item.is_local),
      origin_region: item.origin_region ?? "",
      season_start_month: item.season_start_month ?? "",
      season_end_month: item.season_end_month ?? "",
      market_price: item.market_price ?? "",
      last_price_checked_at: item.last_price_checked_at ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );
  const lowStockCount = items.filter((i) => Number(i.stock || 0) < 20).length;
  const localCount = items.filter((i) => i.is_local).length;
  const seasonalCount = items.filter(isInSeason).length;
  const pricedCount = items.filter((i) => a101[i.id]).length;
  const stockSummary = [
    { label: "Toplam malzeme", value: items.length },
    { label: "Kritik stok", value: lowStockCount, tone: lowStockCount ? "var(--red)" : "var(--ingredients-muted-strong)" },
    { label: "Yerel ürün", value: localCount },
    { label: "Migros fiyatlı", value: pricedCount },
    { label: "Mevsimde", value: seasonalCount },
  ];

  return (
    <div className="ingredients-page" style={page}>
      <div style={pageHeader}>
        <div style={pageTitle}>Malzeme Deposu</div>
      </div>

      <div style={summaryGrid}>
        {stockSummary.map((item) => (
          <div key={item.label} style={summaryCard}>
            <div style={summaryLabel}>{item.label}</div>
            <div style={{ ...summaryValue, color: item.tone || "var(--ingredients-text)" }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Form ── */}
      <div style={card}>
        <button
          type="button"
          style={accordionHeader}
          onClick={() => setFormOpen((value) => !value)}
          aria-expanded={formOpen}
        >
          <div>
            <div style={cardTitle}>
              {editingId ? "Malzemeyi Düzenle" : "Yeni Malzeme Ekle"}
            </div>
            <div style={cardHint}>Besin değeri, birim, sezon ve tedarik bilgilerini tek kayıtta tutun.</div>
          </div>
          <span style={accordionToggle}>{formOpen ? "Kapat" : "Aç"}</span>
        </button>

        {formOpen && (
          <>
        {/* Temel bilgiler */}
        <div
          style={{
            padding: "16px 18px 10px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          {basicFields.map(({ label, key, type }) => (
            <div key={key}>
              <div style={fieldLabel}>{label}</div>
              <input
                type={type === "number" ? "text" : type}
                inputMode={type === "number" ? "decimal" : undefined}
                value={form[key]}
                onFocus={(e) => {
                  if (type === "number" && Number(form[key]) === 0)
                    setField(key, "");
                  e.target.select();
                }}
                onBlur={() => {
                  if (type === "number" && form[key] === "") setField(key, 0);
                }}
                onChange={(e) =>
                  setField(
                    key,
                    type === "number"
                      ? numericValue(e.target.value)
                      : e.target.value,
                  )
                }
                style={input}
              />
            </div>
          ))}
          <div>
            <div style={fieldLabel}>Birim</div>
            <select
              value={form.unit}
              onChange={(e) => setField("unit", e.target.value)}
              style={input}
            >
              {["kg", "lt", "adet", "paket", "kutu"].map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Mevsimsel & Yerellik bilgileri */}
        <div
          style={{
            margin: "0 18px 8px",
            borderTop: "1px solid var(--ingredients-row-border)",
            paddingTop: 14,
          }}
        >
          <div style={sectionTitle}>
            Mevsimsel & Yerellik Bilgileri
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              alignItems: "end",
            }}
          >
            <div>
              <div style={fieldLabel}>Sezon Başlangıcı</div>
              <select
                value={form.season_start_month}
                onChange={(e) => setField("season_start_month", e.target.value)}
                style={input}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={fieldLabel}>Sezon Bitişi</div>
              <select
                value={form.season_end_month}
                onChange={(e) => setField("season_end_month", e.target.value)}
                style={input}
              >
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={fieldLabel}>Kaynak Bölge</div>
              <input
                type="text"
                placeholder="Örn: Antalya / İzmir"
                value={form.origin_region}
                onChange={(e) => setField("origin_region", e.target.value)}
                style={input}
              />
            </div>

            <div>
              <div style={fieldLabel}>Piyasa Fiyatı (TL)</div>
              <input
                type="text"
                inputMode="decimal"
                placeholder="Karşılaştırma için"
                value={form.market_price}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  setField("market_price", numericValue(e.target.value))
                }
                style={input}
              />
            </div>

            <div>
              <div style={fieldLabel}>Fiyat Kontrol Tarihi</div>
              <input
                type="date"
                value={form.last_price_checked_at}
                onChange={(e) =>
                  setField("last_price_checked_at", e.target.value)
                }
                style={input}
              />
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingBottom: 2,
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--text)",
                }}
              >
                <input
                  type="checkbox"
                  checked={Boolean(form.is_local)}
                  onChange={(e) => setField("is_local", e.target.checked)}
                  style={{
                    width: 15,
                    height: 15,
                    accentColor: "var(--accent)",
                  }}
                />
                <span>
                  <strong>Yerel Ürün</strong>
                  <div
                    style={{
                      fontSize: 10,
                      color: "var(--text3)",
                      fontWeight: 400,
                    }}
                  >
                    Bölgesel / yerli tedarik
                  </div>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Kaydet butonu */}
        <div style={formActions}>
          <button onClick={handleSubmit} style={btnPrimary}>
            {editingId ? "Güncelle" : "Ekle"}
          </button>
          {editingId && (
            <button onClick={cancelEdit} style={btnSm}>
              İptal
            </button>
          )}
        </div>
          </>
        )}
      </div>

      {/* ── Tablo ── */}
      <div style={card}>
        <button
          type="button"
          style={accordionHeader}
          onClick={() => setStockListOpen((value) => !value)}
          aria-expanded={stockListOpen}
        >
          <div>
            <div style={cardTitle}>Stok Listesi</div>
            <div style={cardHint}>Satıra tıklayarak parti detaylarını ve alım kayıtlarını açabilirsiniz.</div>
          </div>
          <span style={accordionToggle}>{stockListOpen ? "Kapat" : "Aç"}</span>
        </button>
        {stockListOpen && (
          <>
          <div style={stockToolbar}>
            {health && (
              <span
                title={health.message}
                style={{
                  fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 999,
                  border: "1px solid",
                  color: health.api_ok && health.price_field ? "var(--green)" : "var(--red)",
                  borderColor: health.api_ok && health.price_field ? "var(--green)" : "var(--red)",
                  background: "var(--surface2)",
                }}
              >
                {health.api_ok && health.price_field ? "Migros servisi sağlıklı" : "Migros servisi sorunlu"}
                {health.product_count ? ` · ${health.product_count} ürün` : ""}
              </span>
            )}
            <button
              onClick={handleSelfHeal}
              disabled={healing || a101Busy !== null}
              style={{ ...btnSm, opacity: healing ? 0.7 : 1 }}
              title="Scraper'ı sağlık kontrolünden geçirir; fiyat çıkaramıyorsa yeni strateji öğrenerek kendini onarır"
            >
              {healing ? "Onarılıyor..." : "Scraper'ı Onar"}
            </button>
            <button
              onClick={handleFetchAllA101}
              disabled={a101Busy !== null}
              style={{ ...btnPrimary, opacity: a101Busy !== null ? 0.7 : 1 }}
              title="Tüm malzemeler için Migros'tan güncel fiyat çeker (birim otomatik eşitlenir)"
            >
              {a101Busy === "all" ? `Çekiliyor... ${a101Progress}` : "Migros Fiyat Çek"}
            </button>
          </div>
        {a101Notice && (
          <div style={noticeBar}>
            {a101Notice}
          </div>
        )}
        <div style={searchBar}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Malzeme ara..."
            style={input}
          />
        </div>
        {loading ? (
          <LoadingSpinner label="Stok listesi yükleniyor" minHeight={180} size={38} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                minWidth: 820,
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr>
                  {[
                    "",
                    "Malzeme",
                    "Birim",
                    "Stok",
                    "Migros Fiyatı",
                    "Kalori",
                    "Protein",
                    "Demir",
                    "Yerel / Mevsim",
                    "",
                  ].map((h) => (
                    <th key={h} style={th}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <Fragment key={i.id}>
                    <tr
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setExpandedId(expandedId === i.id ? null : i.id)
                      }
                    >
                      <td style={{ ...td, width: 22, color: "var(--text3)" }}>
                        {expandedId === i.id ? "▾" : "▸"}
                      </td>
                      <td style={td}>
                        <span style={{ fontWeight: 500, color: "var(--text)" }}>
                          {i.name}
                        </span>
                      </td>
                      <td style={td}>{i.unit}</td>
                      <td
                        style={{
                          ...td,
                          fontFamily: "var(--mono)",
                          fontWeight: 600,
                          color:
                            i.stock < 20
                              ? "var(--red)"
                              : i.stock < 50
                                ? "var(--amber)"
                                : "var(--green)",
                        }}
                      >
                        {i.stock}
                      </td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        <A101Cell
                          rec={a101[i.id]}
                          ingredientName={i.name}
                          error={a101Errors[i.id]}
                          busy={a101Busy === i.id || a101Busy === "all"}
                          onFetch={() => handleFetchA101(i.id)}
                        />
                      </td>
                      <td style={td}>{i.calories} kcal</td>
                      <td style={td}>{i.protein} g</td>
                      <td style={td}>{i.iron} mg</td>
                      <td style={td}>
                        <SeasonalBadge item={i} />
                      </td>
                      <td style={td} onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => startEdit(i)} style={btnSm}>
                          Düzenle
                        </button>{" "}
                        <button
                          onClick={() => deleteIngredient(i.id).then(refresh)}
                          style={btnSm}
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                    {expandedId === i.id && (
                      <tr>
                        <td
                          colSpan={10}
                          style={{
                            padding: 0,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <BatchPanel ingredient={i} onStockChanged={refresh} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        ...td,
                        textAlign: "center",
                        color: "var(--text3)",
                      }}
                    >
                      Malzeme bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Stiller ───────────────────────────────────────────────────────────────── */
const page = {
  minHeight: "calc(100vh - 48px)",
  margin: -24,
  padding: 24,
  background: "var(--ingredients-bg)",
};
const pageHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "end",
  gap: 16,
  marginBottom: 14,
};
const pageTitle = {
  color: "var(--ingredients-text)",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 34,
  lineHeight: 1.05,
  fontWeight: 700,
};
const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
  gap: 12,
  marginBottom: 16,
};
const summaryCard = {
  background: "var(--ingredients-card)",
  border: "1px solid var(--ingredients-border)",
  borderRadius: 8,
  padding: "13px 15px",
  boxShadow: "0 10px 26px rgba(24, 24, 24, 0.06)",
  backdropFilter: "blur(10px)",
};
const summaryLabel = {
  color: "var(--ingredients-soft)",
  fontSize: 10,
  fontWeight: 800,
  textTransform: "uppercase",
  letterSpacing: ".06em",
  marginBottom: 5,
};
const summaryValue = {
  color: "var(--ingredients-text)",
  fontSize: 24,
  lineHeight: 1,
  fontWeight: 800,
  fontFamily: "var(--mono)",
};
const card = {
  background: "var(--ingredients-card)",
  border: "1px solid var(--ingredients-border)",
  borderRadius: 10,
  boxShadow: "0 14px 36px rgba(24, 24, 24, 0.07)",
  marginBottom: 16,
  backdropFilter: "blur(10px)",
  overflow: "hidden",
};
const cardHd = {
  padding: "15px 18px 13px",
  borderBottom: "1px solid var(--ingredients-border)",
  background: "var(--ingredients-card-head)",
  color: "var(--ingredients-text)",
  fontSize: 13,
  fontWeight: 800,
};
const cardHdSplit = {
  padding: "15px 18px 13px",
  borderBottom: "1px solid var(--ingredients-border)",
  background: "var(--ingredients-card-head)",
  color: "var(--ingredients-text)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};
const accordionHeader = {
  width: "100%",
  padding: "15px 18px 13px",
  border: "none",
  borderBottom: "1px solid var(--ingredients-border)",
  background: "var(--ingredients-card-head)",
  color: "var(--ingredients-text)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  textAlign: "left",
  cursor: "pointer",
};
const accordionToggle = {
  flexShrink: 0,
  minWidth: 64,
  textAlign: "center",
  background: "var(--ingredients-button-soft)",
  border: "1px solid var(--ingredients-border-strong)",
  color: "var(--ingredients-muted-strong)",
  borderRadius: 999,
  padding: "5px 12px",
  fontSize: 11,
  fontWeight: 800,
};
const cardTitle = {
  color: "var(--ingredients-text)",
  fontFamily: "Georgia, 'Times New Roman', serif",
  fontSize: 18,
  lineHeight: 1.15,
  fontWeight: 700,
};
const cardHint = {
  color: "var(--ingredients-soft)",
  fontSize: 12,
  marginTop: 4,
  fontWeight: 600,
};
const sectionTitle = {
  color: "var(--ingredients-soft)",
  fontSize: 10,
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: ".07em",
  marginBottom: 10,
};
const formActions = {
  padding: "10px 18px 18px",
  display: "flex",
  gap: 8,
  borderTop: "1px solid var(--ingredients-row-border)",
};
const searchBar = {
  padding: "12px 18px",
  background: "var(--ingredients-card-head)",
  borderBottom: "1px solid var(--ingredients-border)",
};
const noticeBar = {
  padding: "9px 18px",
  fontSize: 12,
  color: "var(--ingredients-muted)",
  borderBottom: "1px solid var(--ingredients-border)",
  background: "var(--ingredients-badge-accent-bg)",
};
const stockToolbar = {
  padding: "12px 18px",
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "flex-end",
  flexWrap: "wrap",
  background: "var(--ingredients-card-head)",
  borderBottom: "1px solid var(--ingredients-border)",
};
const marketCell = {
  display: "flex",
  flexDirection: "column",
  gap: 3,
  minWidth: 190,
};
const marketCellRow = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
};
const marketPriceText = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontFamily: "var(--mono)",
  fontWeight: 800,
  color: "var(--ingredients-text)",
  whiteSpace: "nowrap",
};
const marketWarnText = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  color: "var(--amber)",
  fontSize: 11,
  minWidth: 0,
};
const marketActions = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  flexShrink: 0,
};
const externalLinkBtn = {
  textDecoration: "none",
  color: "var(--ingredients-accent)",
  fontSize: 12,
  fontWeight: 800,
  lineHeight: 1,
};
const fieldLabel = {
  fontSize: 11,
  color: "var(--ingredients-muted)",
  marginBottom: 5,
  fontWeight: 700,
};
const fieldLabelSm = {
  fontSize: 10,
  color: "var(--ingredients-muted)",
  marginBottom: 4,
  fontWeight: 700,
};
const input = {
  width: "100%",
  background: "var(--ingredients-input)",
  border: "1px solid var(--ingredients-border-strong)",
  borderRadius: 7,
  padding: "7px 12px",
  fontSize: 13,
  color: "var(--ingredients-text)",
  outline: "none",
  boxSizing: "border-box",
};
const inputSm = {
  width: "100%",
  background: "var(--ingredients-input)",
  border: "1px solid var(--ingredients-border-strong)",
  borderRadius: 6,
  padding: "6px 10px",
  fontSize: 12,
  color: "var(--ingredients-text)",
  outline: "none",
};
const th = {
  textAlign: "left",
  fontSize: 10,
  fontWeight: 800,
  color: "var(--ingredients-soft)",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  padding: "11px 16px",
  background: "var(--ingredients-table-head)",
  borderBottom: "1px solid var(--ingredients-border)",
};
const thSm = {
  textAlign: "left",
  fontSize: 9,
  fontWeight: 800,
  color: "var(--ingredients-soft)",
  textTransform: "uppercase",
  letterSpacing: ".06em",
  padding: "6px 8px",
  borderBottom: "1px solid var(--ingredients-border)",
};
const td = {
  padding: "11px 16px",
  fontSize: 12,
  color: "var(--ingredients-muted)",
  borderBottom: "1px solid var(--ingredients-row-border)",
};
const tdSm = {
  padding: "6px 8px",
  fontSize: 12,
  color: "var(--ingredients-muted)",
  borderBottom: "1px solid var(--ingredients-row-border)",
};
const btnPrimary = {
  background: "var(--ingredients-button)",
  border: "none",
  color: "#fff",
  padding: "8px 20px",
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "var(--ingredients-button-shadow)",
};
const btnPrimarySm = {
  background: "var(--ingredients-button)",
  border: "none",
  color: "#fff",
  padding: "6px 14px",
  borderRadius: 7,
  fontSize: 11,
  fontWeight: 800,
  cursor: "pointer",
};
const btnSm = {
  background: "var(--ingredients-button-soft)",
  border: "1px solid var(--ingredients-border-strong)",
  color: "var(--ingredients-muted-strong)",
  padding: "4px 10px",
  borderRadius: 6,
  fontSize: 11,
  cursor: "pointer",
};
const btnXs = {
  background: "var(--ingredients-button-soft)",
  border: "1px solid var(--ingredients-border-strong)",
  color: "var(--ingredients-muted-strong)",
  padding: "2px 8px",
  borderRadius: 5,
  fontSize: 10,
  cursor: "pointer",
};
const btnIconSm = {
  background: "var(--ingredients-button-soft)",
  border: "1px solid var(--ingredients-border-strong)",
  color: "var(--ingredients-muted-strong)",
  minHeight: 24,
  padding: "3px 9px",
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 800,
  cursor: "pointer",
  whiteSpace: "nowrap",
};
const badgeLocal = {
  background: "var(--ingredients-badge-neutral-bg)",
  color: "var(--ingredients-text)",
  border: "1px solid var(--ingredients-border-strong)",
  borderRadius: 999,
  padding: "2px 7px",
  fontSize: 10,
  fontWeight: 600,
};
const badgeSeason = {
  background: "var(--ingredients-badge-accent-bg)",
  color: "var(--ingredients-accent)",
  border: "1px solid var(--ingredients-accent-border)",
  borderRadius: 999,
  padding: "2px 7px",
  fontSize: 10,
  fontWeight: 600,
};
