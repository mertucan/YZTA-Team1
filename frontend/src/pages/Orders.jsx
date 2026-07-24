import { useEffect, useMemo, useState } from "react";
import {
  getOrders, generateOrder, updateOrder, receiveOrder, deleteOrder,
  getSuppliers, createSupplier, deleteSupplier,
} from "../api/orders";

const fmt = (n) => Number(n || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = (s) => (s ? new Date(s).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

const STATUS = {
  draft:     { label: "Taslak",         color: "var(--amber)",  bg: "rgba(217,161,32,0.12)" },
  sent:      { label: "Gönderildi",     color: "var(--accent)", bg: "rgba(232,128,0,0.12)" },
  received:  { label: "Teslim Alındı",  color: "var(--green,#16a34a)", bg: "rgba(22,163,74,0.12)" },
  cancelled: { label: "İptal",          color: "var(--text3)",  bg: "var(--surface2)" },
};
const REASON = { menu: "Menü ihtiyacı", threshold: "Kritik stok" };

const emptySupplier = { name: "", contact_name: "", email: "", phone: "", categories: "", note: "" };

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [supOpen, setSupOpen] = useState(false);
  const [supForm, setSupForm] = useState(emptySupplier);

  const refresh = () => {
    getOrders().then(setOrders).catch(() => setError("Siparişler yüklenemedi (tablo oluşturuldu mu?)")).finally(() => setLoading(false));
    getSuppliers().then(setSuppliers).catch(() => {});
  };
  useEffect(() => { refresh(); }, []);

  const handleGenerate = async () => {
    setBusy(true); setMsg(""); setError("");
    try {
      const res = await generateOrder();
      if (res?.created === false) {
        setMsg(res.message || "Sipariş gerektiren malzeme yok.");
      } else {
        setMsg(`🤖 Otomatik sipariş oluşturuldu — ${res.items?.length || 0} kalem, ${fmt(res.total_estimated)} TL tahmini.`);
        setExpanded(res.id);
        refresh();
      }
    } catch {
      setError("Sipariş oluşturulamadı.");
    } finally { setBusy(false); }
  };

  const changeStatus = async (id, status) => { await updateOrder(id, { status }); refresh(); };
  const assignSupplier = async (id, supplier_id) => { await updateOrder(id, { supplier_id: supplier_id ? Number(supplier_id) : null }); refresh(); };
  const handleReceive = async (id) => {
    const res = await receiveOrder(id);
    setMsg(`✅ Teslim alındı — ${res.restocked_items || 0} malzeme stoğa eklendi.`);
    refresh();
  };
  const handleDelete = async (id) => { await deleteOrder(id); refresh(); };

  const handleAddSupplier = async () => {
    if (!supForm.name.trim()) return;
    await createSupplier(supForm);
    setSupForm(emptySupplier);
    getSuppliers().then(setSuppliers);
  };
  const handleDeleteSupplier = async (id) => { await deleteSupplier(id); getSuppliers().then(setSuppliers); };

  const stats = useMemo(() => {
    const draft = orders.filter((o) => o.status === "draft").length;
    const sent = orders.filter((o) => o.status === "sent").length;
    const openTotal = orders.filter((o) => o.status === "draft" || o.status === "sent")
      .reduce((s, o) => s + Number(o.total_estimated || 0), 0);
    return { draft, sent, openTotal };
  }, [orders]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>🛒 Otomatik Siparişler</div>
          <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3, maxWidth: 620 }}>
            Malzeme kritik seviyeye düştüğünde sistem, gelecek menü ihtiyacına göre eksik listesinden
            otomatik sipariş taslağı üretir. Tedarikçi seçip gönderin; teslim alınca stok kendiliğinden güncellenir.
          </div>
        </div>
        <button onClick={handleGenerate} disabled={busy} style={{ ...btnPrimary, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Oluşturuluyor..." : "🤖 Otomatik Sipariş Oluştur"}
        </button>
      </div>

      {msg && <div style={banner("ok")}>{msg}</div>}
      {error && <div style={banner("err")}>{error}</div>}

      {/* Özet kartlar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px,1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Bekleyen Taslak", value: stats.draft, color: "var(--amber)" },
          { label: "Gönderilen Sipariş", value: stats.sent, color: "var(--accent)" },
          { label: "Açık Sipariş Tutarı", value: `${fmt(stats.openTotal)} TL`, color: "var(--red)" },
          { label: "Tedarikçi Sayısı", value: suppliers.length, color: "var(--purple)" },
        ].map((c) => (
          <div key={c.label} style={statCard}>
            <div style={statLabel}>{c.label}</div>
            <div style={{ ...statValue, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Tedarikçiler */}
      <div style={card}>
        <button onClick={() => setSupOpen((o) => !o)} style={{ ...cardHd, width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid var(--border)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>🏢 Tedarikçiler ({suppliers.length})</span>
          <span style={{ color: "var(--text3)" }}>{supOpen ? "▾" : "▸"}</span>
        </button>
        {supOpen && (
          <div style={{ padding: 18 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1.4fr 1fr 1.4fr auto", gap: 10, alignItems: "end", marginBottom: 14 }}>
              <div><div style={fieldLabel}>Firma Adı*</div><input value={supForm.name} placeholder="Örn: Anadolu Gıda" onChange={(e) => setSupForm({ ...supForm, name: e.target.value })} style={input} /></div>
              <div><div style={fieldLabel}>E-posta</div><input value={supForm.email} placeholder="siparis@firma.com" onChange={(e) => setSupForm({ ...supForm, email: e.target.value })} style={input} /></div>
              <div><div style={fieldLabel}>Telefon</div><input value={supForm.phone} placeholder="0312..." onChange={(e) => setSupForm({ ...supForm, phone: e.target.value })} style={input} /></div>
              <div><div style={fieldLabel}>Kategoriler</div><input value={supForm.categories} placeholder="sebze, et, bakliyat" onChange={(e) => setSupForm({ ...supForm, categories: e.target.value })} style={input} /></div>
              <button onClick={handleAddSupplier} style={btnPrimary}>Ekle</button>
            </div>
            {suppliers.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--text3)" }}>Henüz tedarikçi yok. Sipariş göndermek için en az bir tedarikçi ekleyin.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {suppliers.map((sp) => (
                  <div key={sp.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--border)" }}>
                    <span style={{ fontWeight: 600, minWidth: 140 }}>{sp.name}</span>
                    <span style={{ color: "var(--text2)" }}>{sp.email || "—"}</span>
                    <span style={{ color: "var(--text3)" }}>{sp.phone || ""}</span>
                    {sp.categories && <span style={catTag}>{sp.categories}</span>}
                    <button onClick={() => handleDeleteSupplier(sp.id)} style={{ ...btnSm, marginLeft: "auto" }}>Sil</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sipariş listesi */}
      {loading ? (
        <div style={{ padding: 24, color: "var(--text3)" }}>Yükleniyor...</div>
      ) : orders.length === 0 ? (
        <div style={{ ...card, padding: 40, textAlign: "center", color: "var(--text3)" }}>
          Henüz sipariş yok. Üstteki <b>🤖 Otomatik Sipariş Oluştur</b> ile eksik malzemelerden ilk siparişinizi üretin.
        </div>
      ) : (
        orders.map((o) => {
          const st = STATUS[o.status] || STATUS.draft;
          const open = expanded === o.id;
          const items = o.items || [];
          const noPrice = items.some((it) => !it.unit_price);
          return (
            <div key={o.id} style={card}>
              <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <span style={{ ...badge, color: st.color, background: st.bg }}>{st.label}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>Sipariş #{o.id}</span>
                {o.auto_generated && <span style={{ ...miniTag }}>🤖 Otomatik</span>}
                <span style={{ fontSize: 12, color: "var(--text3)" }}>{fmtDate(o.created_at)}</span>
                <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text2)" }}>{items.length} kalem</span>
                <span style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 15 }}>{fmt(o.total_estimated)} TL</span>
              </div>

              <div style={{ padding: "0 18px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                {/* Tedarikçi seçimi (taslak/gönderildi) */}
                {(o.status === "draft" || o.status === "sent") ? (
                  <select value={o.supplier_id || ""} onChange={(e) => assignSupplier(o.id, e.target.value)} style={{ ...input, width: "auto", minWidth: 180 }}>
                    <option value="">Tedarikçi seç...</option>
                    {suppliers.map((sp) => <option key={sp.id} value={sp.id}>{sp.name}</option>)}
                  </select>
                ) : (
                  <span style={{ fontSize: 12, color: "var(--text2)" }}>Tedarikçi: <b>{o.supplier_name || "—"}</b></span>
                )}

                <button onClick={() => setExpanded(open ? null : o.id)} style={btnSm}>
                  {open ? "Kalemleri Gizle ▾" : "Kalemleri Göster ▸"}
                </button>

                <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                  {o.status === "draft" && (
                    <button
                      onClick={() => o.supplier_id ? changeStatus(o.id, "sent") : setError("Önce tedarikçi seçin.")}
                      title={o.supplier_id ? "" : "Önce tedarikçi seçin"}
                      style={{ ...btnAction, opacity: o.supplier_id ? 1 : 0.55 }}>📤 Gönder</button>
                  )}
                  {o.status === "sent" && (
                    <button onClick={() => handleReceive(o.id)} style={{ ...btnAction, background: "var(--green,#16a34a)" }}>✅ Teslim Alındı</button>
                  )}
                  {o.status !== "received" && o.status !== "cancelled" && (
                    <button onClick={() => changeStatus(o.id, "cancelled")} style={btnSm}>İptal</button>
                  )}
                  <button onClick={() => handleDelete(o.id)} style={btnSm}>Sil</button>
                </div>
              </div>

              {open && (
                <div style={{ borderTop: "1px solid var(--border)" }}>
                  {noPrice && (
                    <div style={{ padding: "8px 18px", fontSize: 11, color: "var(--amber)" }}>
                      ⚠ Bazı kalemlerde birim fiyat yok — Malzeme Deposu'nda "Migros Fiyat Çek" ile fiyat ekleyince tahmini tutar tamamlanır.
                    </div>
                  )}
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead><tr>{["Malzeme", "İhtiyaç", "Birim Fiyat", "Tutar", "Sebep"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>
                      {items.map((it, i) => (
                        <tr key={i}>
                          <td style={{ ...td, fontWeight: 600, color: "var(--text)" }}>{it.name}</td>
                          <td style={{ ...td, fontFamily: "var(--mono)" }}>{fmt(it.quantity)} {it.unit}</td>
                          <td style={{ ...td, fontFamily: "var(--mono)" }}>{it.unit_price ? `${fmt(it.unit_price)} TL` : "—"}</td>
                          <td style={{ ...td, fontFamily: "var(--mono)", fontWeight: 700 }}>{it.line_total ? `${fmt(it.line_total)} TL` : "—"}</td>
                          <td style={td}><span style={{ ...miniTag, color: it.reason === "menu" ? "var(--accent)" : "var(--amber)" }}>{REASON[it.reason] || it.reason || "—"}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

const card = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", marginBottom: 16 };
const cardHd = { padding: "14px 18px 12px", fontSize: 13, fontWeight: 600, color: "var(--text)" };
const fieldLabel = { fontSize: 11, color: "var(--text2)", marginBottom: 5, fontWeight: 500 };
const input = { width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 7, padding: "7px 12px", fontSize: 13, color: "var(--text)", outline: "none" };
const th = { textAlign: "left", fontSize: 10, fontWeight: 700, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".06em", padding: "10px 18px", borderBottom: "1px solid var(--border)" };
const td = { padding: "10px 18px", fontSize: 12, color: "var(--text2)", borderBottom: "1px solid var(--border)" };
const btnPrimary = { background: "var(--accent)", border: "none", color: "#fff", padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" };
const btnAction = { background: "var(--accent)", border: "none", color: "#fff", padding: "6px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer" };
const btnSm = { background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text2)", padding: "5px 11px", borderRadius: 6, fontSize: 11, cursor: "pointer" };
const statCard = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "14px 16px", boxShadow: "var(--shadow)" };
const statLabel = { fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 };
const statValue = { fontSize: 18, fontWeight: 700, fontFamily: "var(--mono)" };
const catTag = { fontSize: 10, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 5, padding: "2px 8px", fontWeight: 600 };
const badge = { fontSize: 11, fontWeight: 700, borderRadius: 6, padding: "3px 10px" };
const miniTag = { fontSize: 10, fontWeight: 600, background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 5, padding: "2px 7px" };
const banner = (kind) => ({
  padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13,
  background: kind === "ok" ? "rgba(22,163,74,0.10)" : "rgba(220,38,38,0.10)",
  border: `1px solid ${kind === "ok" ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}`,
  color: kind === "ok" ? "var(--green,#16a34a)" : "var(--red)",
});
