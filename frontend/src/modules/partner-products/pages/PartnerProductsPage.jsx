import { useEffect, useMemo, useState } from "react";
import {
  createPartnerProductRequest,
  getPartnerMenuOpportunities,
  getPartnerProductRequests,
  getPartnerProductUsage,
  revisePartnerProductRequest,
  updatePartnerProductStatus,
} from "../api/partnerProducts";

const CATERING_SESSION_KEY = "catering_mock_session";
const menuCategories = ["Çorba", "Ana Yemek", "Ara Sıcak", "Tahıl (Pilav/Makarna)", "Yoğurt/Salata", "Tatlı/Meyve"];
const reviewRoles = new Set(["DIETITIAN", "CHEF", "CATERING_ADMIN", "SUPER_ADMIN"]);

const statusLabels = {
  PENDING_REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
  NEEDS_REVISION: "Revizyon",
  REJECTED: "Reddedildi",
  INTEGRATED: "Menüye alındı",
};

const initialForm = {
  brand_name: "",
  product_name: "",
  product_category: "",
  suggested_menu_category: "Ana Yemek",
  serving_size: "",
  calories: "",
  protein: "",
  sugar: "",
  sodium: "",
  target_segments: "",
  allergens: "",
  integration_note: "",
};

function readRole() {
  try {
    const session = JSON.parse(localStorage.getItem(CATERING_SESSION_KEY) || "{}");
    return session?.user?.role_name || null;
  } catch {
    return null;
  }
}

export default function PartnerProductsPage() {
  const [role, setRole] = useState(() => readRole());
  const [requests, setRequests] = useState([]);
  const [usage, setUsage] = useState([]);
  const [opportunities, setOpportunities] = useState({ categories: [], recent_menus: [] });
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewNotes, setReviewNotes] = useState({});
  const [confirmAction, setConfirmAction] = useState(null);

  const canReview = reviewRoles.has(role);
  const canSubmit = role === "PARTNER_COMPANY";
  const isChefReviewOnly = role === "CHEF";
  const [opportunitiesOpen, setOpportunitiesOpen] = useState(canSubmit);

  useEffect(() => {
    setOpportunitiesOpen(canSubmit);
  }, [canSubmit]);

  useEffect(() => {
    const refreshRole = () => setRole(readRole());
    window.addEventListener("storage", refreshRole);
    window.addEventListener("catering-session-changed", refreshRole);
    return () => {
      window.removeEventListener("storage", refreshRole);
      window.removeEventListener("catering-session-changed", refreshRole);
    };
  }, []);

  useEffect(() => {
    refreshAll();
  }, []);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((item) => item.status === "PENDING_REVIEW").length;
    const approved = requests.filter((item) => ["APPROVED", "INTEGRATED"].includes(item.status)).length;
    return { total, pending, approved };
  }, [requests]);

  const opportunitySummary = useMemo(() => {
    const categories = [...(opportunities.categories || [])].sort(
      (a, b) => Number(b.menu_item_count || 0) - Number(a.menu_item_count || 0),
    );
    const totalItems = categories.reduce((sum, item) => sum + Number(item.menu_item_count || 0), 0);
    const topCategory = categories[0] || null;
    return { categories, totalItems, topCategory };
  }, [opportunities.categories]);

  function refreshAll() {
    setLoading(true);
    Promise.all([getPartnerProductRequests(), getPartnerMenuOpportunities(), getPartnerProductUsage()])
      .then(([requestList, opportunityData, usageData]) => {
        setRequests(requestList);
        setOpportunities(opportunityData);
        setUsage(usageData);
      })
      .catch((error) => {
        setMessage({ type: "error", text: error.response?.data?.detail || "Partner paneli verileri alınamadı." });
      })
      .finally(() => setLoading(false));
  }

  function handleChange(key, value) {
    setMessage(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        ...form,
        calories: Number(form.calories || 0),
        protein: Number(form.protein || 0),
        sugar: Number(form.sugar || 0),
        sodium: Number(form.sodium || 0),
      };
      if (editingId) {
        await revisePartnerProductRequest(editingId, payload);
      } else {
        await createPartnerProductRequest(payload);
      }
      setForm(initialForm);
      setEditingId(null);
      setMessage({ type: "success", text: editingId ? "Revizyon tekrar incelemeye gönderildi." : "Ürün entegrasyon talebi incelemeye alındı." });
      refreshAll();
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.detail || "Talep kaydedilemedi." });
    } finally {
      setSaving(false);
    }
  }

  function startRevision(item) {
    setEditingId(item.id);
    setMessage(null);
    setForm({
      brand_name: item.brand_name || "",
      product_name: item.product_name || "",
      product_category: item.product_category || "",
      suggested_menu_category: item.suggested_menu_category || "Ana Yemek",
      serving_size: item.serving_size || "",
      calories: item.calories ?? "",
      protein: item.protein ?? "",
      sugar: item.sugar ?? "",
      sodium: item.sodium ?? "",
      target_segments: item.target_segments || "",
      allergens: item.allergens || "",
      integration_note: item.integration_note || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelRevision() {
    setEditingId(null);
    setForm(initialForm);
  }

  async function handleStatus(id, status) {
    setMessage(null);
    try {
      const updated = await updatePartnerProductStatus(id, {
        status,
        review_note: reviewNotes[id] || null,
      });
      setRequests((current) => current.map((item) => (item.id === id ? updated : item)));
      setMessage({ type: "success", text: "İnceleme durumu güncellendi." });
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.detail || "Durum güncellenemedi." });
    }
  }

  function getReviewActions(item) {
    if (item.status === "PENDING_REVIEW") {
      return [
        { status: "APPROVED", label: "Onayla", style: s.reviewButtonOk },
        { status: "NEEDS_REVISION", label: "Revizyon", style: s.reviewButtonWarn },
        { status: "REJECTED", label: "Reddet", style: { color: "var(--red)" } },
      ];
    }
    if (item.status === "APPROVED") {
      return [
        { status: "INTEGRATED", label: "Menüye al", style: s.reviewButtonPrimary },
        { status: "NEEDS_REVISION", label: "Revizyon", style: s.reviewButtonWarn },
        { status: "REJECTED", label: "Reddet", style: { color: "var(--red)" } },
      ];
    }
    return [];
  }

  function openStatusConfirm(item, action) {
    setConfirmAction({
      id: item.id,
      product: `${item.brand_name} / ${item.product_name}`,
      status: action.status,
      label: action.label,
    });
  }

  async function confirmStatusChange() {
    if (!confirmAction) return;
    await handleStatus(confirmAction.id, confirmAction.status);
    setConfirmAction(null);
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div>
          <div style={s.title}>Partner Firma Paneli</div>
          <div style={s.subtitle}>Ürün önerileri, menü entegrasyonu için incelenir.</div>
        </div>
        <div style={s.stats}>
          <Metric label="Toplam" value={loading ? "..." : stats.total} />
          <Metric label="İncelemede" value={loading ? "..." : stats.pending} />
          <Metric label="Uygun" value={loading ? "..." : stats.approved} />
        </div>
      </div>

      {message && <div style={{ ...s.message, ...s[message.type] }}>{message.text}</div>}

      <div style={canSubmit ? s.grid : s.singleGrid}>
        {canSubmit && (
          <form style={s.panel} onSubmit={handleSubmit}>
            <div style={s.formHeader}>
              <div style={s.panelTitleTight}>{editingId ? "Revizyonu Güncelle" : "Ürün Entegrasyon Talebi"}</div>
              {editingId && (
                <button type="button" style={s.lightButton} onClick={cancelRevision}>Vazgeç</button>
              )}
            </div>
            <div style={s.formGrid}>
              <label style={s.label}>
                Marka
                <input required style={s.input} value={form.brand_name} onChange={(e) => handleChange("brand_name", e.target.value)} placeholder="Ülker, Pınar..." />
              </label>
              <label style={s.label}>
                Ürün adı
                <input required style={s.input} value={form.product_name} onChange={(e) => handleChange("product_name", e.target.value)} placeholder="Yüksek proteinli yoğurt" />
              </label>
              <label style={s.label}>
                Ürün tipi
                <input required style={s.input} value={form.product_category} onChange={(e) => handleChange("product_category", e.target.value)} placeholder="Süt ürünü, atıştırmalık..." />
              </label>
              <label style={s.label}>
                Menü kategorisi
                <select style={s.input} value={form.suggested_menu_category} onChange={(e) => handleChange("suggested_menu_category", e.target.value)}>
                  {menuCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label style={s.label}>
                Porsiyon
                <input style={s.input} value={form.serving_size} onChange={(e) => handleChange("serving_size", e.target.value)} placeholder="200 g" />
              </label>
              <label style={s.label}>
                Hedef kitle
                <input style={s.input} value={form.target_segments} onChange={(e) => handleChange("target_segments", e.target.value)} placeholder="Spor yapan öğrenciler, vejetaryen..." />
              </label>
            </div>

            <div style={s.nutritionGrid}>
              <NumberField label="Kalori" value={form.calories} onChange={(value) => handleChange("calories", value)} />
              <NumberField label="Protein g" value={form.protein} onChange={(value) => handleChange("protein", value)} />
              <NumberField label="Şeker g" value={form.sugar} onChange={(value) => handleChange("sugar", value)} />
              <NumberField label="Sodyum mg" value={form.sodium} onChange={(value) => handleChange("sodium", value)} />
            </div>

            <label style={s.label}>
              Alerjenler
              <input style={s.input} value={form.allergens} onChange={(e) => handleChange("allergens", e.target.value)} placeholder="Süt, gluten, fındık..." />
            </label>
            <label style={s.label}>
              Menüye entegrasyon notu
              <textarea style={{ ...s.input, minHeight: 82, resize: "vertical" }} value={form.integration_note} onChange={(e) => handleChange("integration_note", e.target.value)} placeholder="Hangi öğünlerde, hangi beslenme hedefiyle önerilmeli?" />
            </label>
            <button style={{ ...s.primaryButton, opacity: saving ? 0.72 : 1 }} disabled={saving}>
              {saving ? "Kaydediliyor..." : editingId ? "Tekrar İncelemeye Gönder" : "İncelemeye Gönder"}
            </button>
          </form>
        )}

        {!isChefReviewOnly && (
        <section style={{ ...s.panel, ...(canSubmit && opportunitiesOpen ? s.opportunityPanelTall : null) }}>
          <button type="button" style={s.opportunityToggle} onClick={() => setOpportunitiesOpen((open) => !open)}>
            <div>
              <div style={s.panelTitleTight}>Menü Fırsatları</div>
            </div>
            <div style={s.opportunityToggleRight}>
              <span style={s.opportunityBadge}>{opportunitySummary.totalItems} kalem</span>
              <span style={s.chevron}>{opportunitiesOpen ? "▲" : "▼"}</span>
            </div>
          </button>

          {opportunitiesOpen && (
            <div style={canSubmit ? s.opportunityScroll : null}>
              {opportunitySummary.topCategory ? (
                <>
                  <div style={s.opportunityHero}>
                    <div>
                      <span style={s.heroLabel}>En aktif kategori</span>
                      <strong style={s.heroTitle}>{opportunitySummary.topCategory.category}</strong>
                    </div>
                    <div style={s.heroCount}>{Math.round((Number(opportunitySummary.topCategory.menu_item_count || 0) / Math.max(opportunitySummary.totalItems, 1)) * 100)}%</div>
                  </div>

                  <div style={s.smallTitle}>Kategori dagilimi</div>
                  <div style={s.categoryList}>
                    {opportunitySummary.categories.map((item) => {
                      const percent = Math.round((Number(item.menu_item_count || 0) / Math.max(opportunitySummary.totalItems, 1)) * 100);
                      return (
                        <div key={item.category} style={s.categoryItem}>
                          <div style={s.categoryLine}>
                            <span>{item.category}</span>
                            <strong>{item.menu_item_count} kalem</strong>
                          </div>
                          <div style={s.progressTrack}>
                            <span style={{ ...s.progressFill, width: `${Math.max(percent, 4)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div style={s.emptyBox}>Menü verisi yok.</div>
              )}

              <div style={s.menuSectionHead}>
                <div style={s.smallTitle}>Son menüler</div>
                <span>{(opportunities.recent_menus || []).length} hafta</span>
              </div>
              <div style={s.menuList}>
                {(opportunities.recent_menus || []).slice(0, 5).length === 0 ? (
                  <div style={s.empty}>Henüz menü kaydı yok.</div>
                ) : (opportunities.recent_menus || []).slice(0, 5).map((menu) => (
                  <div key={menu.id} style={s.menuItem}>
                    <div style={s.menuTop}>
                      <div>
                        <strong>{formatDateOnly(menu.week_start_date)}</strong>
                        <span>{menu.item_count} kalem</span>
                      </div>
                      <span style={{ ...s.menuStatus, ...(menu.status === "approved" ? s.menuStatusOk : null) }}>
                        {menu.status === "approved" ? "Onaylı" : "Taslak"}
                      </span>
                    </div>
                    <div style={s.samples}>
                      {(menu.sample_items || []).length === 0 ? (
                        <span style={s.muted}>Ornek yemek yok</span>
                      ) : (menu.sample_items || []).map((sample) => (
                        <span key={`${menu.id}-${sample.meal_name}`} style={s.pill}>{sample.meal_name}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
        )}
      </div>

      {canSubmit && (
        <section style={s.panel}>
          <div style={s.panelTitle}>Kullanim Raporu</div>
          {usage.length === 0 ? (
            <div style={s.empty}>Henüz ürün raporu yok.</div>
          ) : (
            <div style={s.usageGrid}>
              {usage.map((item) => (
                <article key={item.product_id} style={s.usageCard}>
                  <div style={s.usageTop}>
                    <div>
                      <div style={s.requestTitle}>{item.brand_name} / {item.product_name}</div>
                      <div style={s.requestMeta}>{statusLabels[item.status] || item.status}</div>
                    </div>
                    <strong style={s.usageCount}>{item.usage_count}</strong>
                  </div>
                  <div style={s.usageStats}>
                    <span>{item.menu_count} menü</span>
                    <span>{item.latest_week_start_date ? formatDateOnly(item.latest_week_start_date) : "Kullanim yok"}</span>
                  </div>
                  <div style={s.samples}>
                    {(item.categories || []).length === 0 ? (
                      <span style={s.muted}>Kategori yok</span>
                    ) : item.categories.map((category) => (
                      <span key={`${item.product_id}-${category}`} style={s.pill}>{category}</span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      <section style={s.panel}>
        <div style={s.panelTitle}>{canReview ? "İnceleme Kuyruğu" : "Taleplerim"}</div>
        {requests.length === 0 ? (
          <div style={s.empty}>Kayıt bulunamadı.</div>
        ) : (
          <div style={s.requestList}>
            {requests.map((item) => {
              const reviewActions = getReviewActions(item);
              return (
              <article key={item.id} style={s.requestCard}>
                <div style={s.requestTop}>
                  <div>
                    <div style={s.requestTitle}>{item.brand_name} / {item.product_name}</div>
                    <div style={s.requestMeta}>{item.partner_company_name} - {item.suggested_menu_category} - {formatDate(item.created_at)}</div>
                  </div>
                  <span style={{ ...s.status, ...statusStyle(item.status) }}>{statusLabels[item.status] || item.status}</span>
                </div>
                <div style={s.requestBody}>
                  <span>{item.product_category}</span>
                  <span>{Number(item.calories).toFixed(0)} kcal</span>
                  <span>{Number(item.protein).toFixed(1)} g protein</span>
                  <span>{Number(item.sugar).toFixed(1)} g seker</span>
                  <span>{Number(item.sodium).toFixed(0)} mg sodyum</span>
                </div>
                {item.integration_note && <p style={s.note}>{item.integration_note}</p>}
                {item.review_note && <div style={s.reviewNote}>İnceleme notu: {item.review_note}</div>}
                {canSubmit && item.status === "NEEDS_REVISION" && (
                  <div style={s.partnerActions}>
                    <button type="button" style={{ ...s.reviewButton, ...s.reviewButtonPrimary }} onClick={() => startRevision(item)}>
                      Revize et
                    </button>
                  </div>
                )}
                {canReview && reviewActions.length > 0 && (
                  <div style={s.reviewBar}>
                    <input
                      style={s.input}
                      value={reviewNotes[item.id] || ""}
                      onChange={(e) => setReviewNotes((current) => ({ ...current, [item.id]: e.target.value }))}
                      placeholder="İnceleme notu"
                    />
                    {reviewActions.map((action) => (
                      <button
                        key={action.status}
                        type="button"
                        style={{ ...s.reviewButton, ...action.style }}
                        onClick={() => openStatusConfirm(item, action)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                {canReview && reviewActions.length === 0 && (
                  <div style={s.lockedReview}>Bu talep için uygulanabilir ek işlem yok.</div>
                )}
              </article>
            );
            })}
          </div>
        )}
      </section>
      {confirmAction && (
        <div style={s.modalOverlay}>
          <div style={s.confirmModal}>
            <div style={s.confirmTitle}>İşlemi onaylıyor musunuz?</div>
            <div style={s.confirmText}>
              {confirmAction.product} talebi için "{confirmAction.label}" işlemi uygulanacak.
            </div>
            <div style={s.confirmActions}>
              <button type="button" style={s.lightButton} onClick={() => setConfirmAction(null)}>Vazgeç</button>
              <button type="button" style={s.primaryButton} onClick={confirmStatusChange}>Onayla</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div style={s.metric}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function NumberField({ label, value, onChange }) {
  return (
    <label style={s.label}>
      {label}
      <input style={s.input} type="number" min="0" step="0.1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function statusStyle(status) {
  if (status === "APPROVED" || status === "INTEGRATED") return s.statusOk;
  if (status === "REJECTED") return s.statusError;
  if (status === "NEEDS_REVISION") return s.statusWarn;
  return s.statusPending;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(value) {
  return new Date(value).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const s = {
  page: { display: "grid", gap: 16 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "start", gap: 16 },
  title: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 30, lineHeight: 1.05, fontWeight: 700 },
  subtitle: { fontSize: 13, color: "var(--text2)", marginTop: 4 },
  stats: { display: "grid", gridTemplateColumns: "repeat(3, minmax(86px, 1fr))", gap: 8 },
  metric: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", padding: "10px 12px", display: "grid", gap: 4, boxShadow: "var(--shadow)" },
  grid: { display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(320px, .75fr)", gap: 16 },
  singleGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 16 },
  panel: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 18, boxShadow: "var(--shadow)" },
  panelTitle: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700, marginBottom: 14 },
  panelTitleTight: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 17, lineHeight: 1.15, fontWeight: 700 },
  formHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 },
  formGrid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 },
  nutritionGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10, margin: "12px 0" },
  label: { display: "grid", gap: 6, color: "var(--text2)", fontSize: 12, fontWeight: 800, marginBottom: 10 },
  input: { minHeight: 38, width: "100%", background: "var(--surface2)", border: "1px solid var(--border2)", borderRadius: 8, padding: "8px 10px", color: "var(--text)", outline: "none" },
  primaryButton: { minHeight: 42, border: "none", borderRadius: 8, background: "var(--accent)", color: "#fff", fontWeight: 900, padding: "0 16px", cursor: "pointer" },
  lightButton: { minHeight: 32, border: "1px solid var(--border2)", borderRadius: 8, background: "var(--surface2)", color: "var(--text2)", fontWeight: 800, padding: "0 10px", cursor: "pointer" },
  opportunityToggle: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, margin: 0, padding: 0, background: "transparent", border: "none", cursor: "pointer", textAlign: "left" },
  opportunityToggleRight: { display: "flex", alignItems: "center", gap: 8 },
  opportunityBadge: { border: "1px solid var(--border2)", borderRadius: 18, background: "var(--surface2)", color: "var(--text2)", padding: "5px 10px", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" },
  chevron: { color: "var(--text3)", fontSize: 11, width: 16, textAlign: "center" },
  opportunityPanelTall: { height: 654, display: "flex", flexDirection: "column", overflow: "hidden" },
  opportunityScroll: { marginTop: 14, paddingRight: 4, overflowY: "auto", flex: 1, minHeight: 0 },
  opportunityHero: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, border: "1px solid var(--green-border)", borderRadius: 8, background: "var(--green-bg)", padding: 14, margin: "14px 0" },
  heroLabel: { display: "block", color: "var(--green)", fontSize: 10, fontWeight: 900, textTransform: "uppercase", marginBottom: 4 },
  heroTitle: { display: "block", color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 20, lineHeight: 1.12, fontWeight: 700 },
  heroCount: { width: 58, height: 58, borderRadius: "50%", display: "grid", placeItems: "center", flexShrink: 0, background: "var(--surface)", border: "1px solid var(--green-border)", color: "var(--green)", fontSize: 18, fontWeight: 900, fontFamily: "var(--mono)" },
  categoryList: { display: "grid", gap: 8, marginBottom: 16 },
  categoryItem: { display: "grid", gap: 7, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", padding: "9px 10px", color: "var(--text2)", fontSize: 12 },
  categoryLine: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" },
  progressTrack: { height: 7, borderRadius: 999, background: "var(--surface)", border: "1px solid var(--border)", overflow: "hidden" },
  progressFill: { display: "block", height: "100%", borderRadius: 999, background: "var(--accent)" },
  smallTitle: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 15, lineHeight: 1.12, fontWeight: 700, marginBottom: 8 },
  menuSectionHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, color: "var(--text3)", fontSize: 11, marginTop: 2 },
  menuList: { display: "grid", gap: 8 },
  menuItem: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", padding: 10, display: "grid", gap: 8, fontSize: 12, color: "var(--text2)" },
  menuTop: { display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10 },
  menuStatus: { border: "1px solid var(--amber-border)", borderRadius: 18, background: "var(--amber-bg)", color: "var(--amber)", padding: "4px 8px", fontSize: 10, fontWeight: 900, whiteSpace: "nowrap" },
  menuStatusOk: { borderColor: "var(--green-border)", background: "var(--green-bg)", color: "var(--green)" },
  samples: { display: "flex", flexWrap: "wrap", gap: 5 },
  pill: { border: "1px solid var(--border)", borderRadius: 18, background: "var(--surface2)", color: "var(--text3)", padding: "4px 8px", fontSize: 11 },
  muted: { color: "var(--text3)", fontSize: 11 },
  emptyBox: { border: "1px dashed var(--border2)", borderRadius: 8, background: "var(--surface2)", color: "var(--text3)", padding: 14, fontSize: 12, lineHeight: 1.55, marginBottom: 14 },
  usageGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 },
  usageCard: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", padding: 14, display: "grid", gap: 10 },
  usageTop: { display: "flex", alignItems: "start", justifyContent: "space-between", gap: 12 },
  usageCount: { width: 42, height: 42, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--accent-bg)", color: "var(--accent)", fontFamily: "var(--mono)", fontSize: 18 },
  usageStats: { display: "flex", justifyContent: "space-between", gap: 10, color: "var(--text2)", fontSize: 12 },
  requestList: { display: "grid", gap: 10 },
  requestCard: { border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface2)", padding: 14 },
  requestTop: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" },
  requestTitle: { color: "var(--text)", fontSize: 14, fontWeight: 900 },
  requestMeta: { color: "var(--text3)", fontSize: 12, marginTop: 3 },
  requestBody: { display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10, color: "var(--text2)", fontSize: 12 },
  note: { margin: "10px 0 0", color: "var(--text2)", fontSize: 12, lineHeight: 1.55 },
  reviewNote: { marginTop: 10, border: "1px solid var(--amber-border)", borderRadius: 8, background: "var(--amber-bg)", color: "var(--amber)", padding: 10, fontSize: 12 },
  partnerActions: { display: "flex", justifyContent: "flex-end", marginTop: 12 },
  reviewBar: { display: "grid", gridTemplateColumns: "minmax(220px, 1fr) repeat(4, auto)", gap: 8, alignItems: "center", marginTop: 12 },
  reviewButton: { minHeight: 34, border: "1px solid var(--border2)", borderRadius: 8, background: "var(--surface)", color: "var(--text2)", fontWeight: 800, padding: "0 10px", cursor: "pointer", whiteSpace: "nowrap" },
  reviewButtonOk: { borderColor: "var(--green-border)", color: "var(--green)", background: "var(--green-bg)" },
  reviewButtonWarn: { borderColor: "var(--amber-border)", color: "var(--amber)", background: "var(--amber-bg)" },
  reviewButtonPrimary: { borderColor: "var(--border2)", color: "#fff", background: "var(--accent)" },
  status: { borderRadius: 18, padding: "5px 10px", border: "1px solid", fontSize: 11, fontWeight: 900, whiteSpace: "nowrap" },
  statusOk: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  statusWarn: { color: "var(--amber)", background: "var(--amber-bg)", borderColor: "var(--amber-border)" },
  statusError: { color: "var(--red)", background: "var(--red-bg)", borderColor: "var(--red-border)" },
  statusPending: { color: "var(--accent)", background: "var(--accent-bg)", borderColor: "var(--border2)" },
  message: { borderRadius: 8, padding: 12, fontSize: 12, border: "1px solid" },
  success: { color: "var(--green)", background: "var(--green-bg)", borderColor: "var(--green-border)" },
  error: { color: "var(--red)", background: "var(--red-bg)", borderColor: "var(--red-border)" },
  empty: { color: "var(--text3)", fontSize: 13 },
  lockedReview: { marginTop: 12, border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface)", color: "var(--text3)", padding: 10, fontSize: 12, textAlign: "right" },
  modalOverlay: { position: "fixed", inset: 0, zIndex: 80, background: "rgba(15, 23, 42, 0.38)", display: "grid", placeItems: "center", padding: 20 },
  confirmModal: { width: "min(420px, 92vw)", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 24px 80px rgba(15, 23, 42, 0.26)", padding: 18 },
  confirmTitle: { color: "var(--text)", fontFamily: "Georgia, 'Times New Roman', serif", fontSize: 20, lineHeight: 1.15, fontWeight: 700, marginBottom: 8 },
  confirmText: { color: "var(--text2)", fontSize: 13, lineHeight: 1.55, marginBottom: 16 },
  confirmActions: { display: "flex", justifyContent: "flex-end", gap: 8 },
};
