import React, { useState, useEffect } from "react";
import { calculateTenderCost, getCompanies } from "../api/tenderInvoice";

export default function TenderFormModal({ isOpen, onClose, onSubmit }) {
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    institution_name: "",
    company_id: "",
    daily_person_count: 500,
    meal_type: "Öğle Yemeği",
    contract_start_date: "",
    contract_end_date: "",
    profit_margin_percent: 20,
    status: "DRAFT",
  });

  const [simParams, setSimParams] = useState({
    raw_ingredient_cost_per_portion: 45,
    labor_overhead_percent: 25,
    logistics_cost_per_portion: 5,
    days_count: 30,
  });

  const [simResult, setSimResult] = useState(null);
  const [loadingSim, setLoadingSim] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
      runCalculation();
    }
  }, [isOpen, formData.daily_person_count, formData.profit_margin_percent, simParams]);

  const fetchCompanies = async () => {
    try {
      const list = await getCompanies();
      setCompanies(list || []);
      if (list && list.length > 0 && !formData.company_id) {
        setFormData((prev) => ({ ...prev, company_id: list[0].id }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const runCalculation = async () => {
    try {
      setLoadingSim(true);
      const res = await calculateTenderCost({
        daily_person_count: Number(formData.daily_person_count) || 100,
        days_count: Number(simParams.days_count) || 30,
        raw_ingredient_cost_per_portion: Number(simParams.raw_ingredient_cost_per_portion) || 45,
        labor_overhead_percent: Number(simParams.labor_overhead_percent) || 25,
        logistics_cost_per_portion: Number(simParams.logistics_cost_per_portion) || 5,
        target_profit_margin_percent: Number(formData.profit_margin_percent) || 20,
      });
      setSimResult(res);
    } catch (err) {
      console.error("Maliyet hesaplama hatası:", err);
    } finally {
      setLoadingSim(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.institution_name) {
      alert("Lütfen İhale Başlığı ve Kurum Adını doldurunuz.");
      return;
    }
    onSubmit(formData);
  };

  const formatTL = (val) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val || 0);

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3>Yeni İhale Oluştur & Canlı Maliyet Simülasyonu</h3>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={formContentStyle}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
            {/* Sol Taraf: İhale Bilgileri */}
            <div>
              <h4 style={sectionTitleStyle}>İhale Başlık Bilgileri</h4>
              
              <label style={labelStyle}>İhale / Proje Adı *</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Örn: İSTEK Üniversitesi 2026 Yemek İhalesi"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <label style={labelStyle}>Teklif Veren Catering Firması *</label>
              <select
                style={inputStyle}
                value={formData.company_id || ""}
                onChange={(e) => setFormData({ ...formData, company_id: Number(e.target.value) })}
                required
              >
                {companies.length === 0 ? (
                  <option value="">Firma Yükleniyor...</option>
                ) : (
                  companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || `Firma #${c.id}`}
                    </option>
                  ))
                )}
              </select>

              <label style={labelStyle}>Kurum / Müşteri Adı *</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Örn: Boğaziçi Üniversitesi Sağlık Daire Bşk."
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                required
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Günlük Kişi Sayısı</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={formData.daily_person_count}
                    onChange={(e) => setFormData({ ...formData, daily_person_count: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Öğün Tipi</label>
                  <select
                    style={inputStyle}
                    value={formData.meal_type}
                    onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                  >
                    <option value="Öğle Yemeği">Öğle Yemeği</option>
                    <option value="Akşam Yemeği">Akşam Yemeği</option>
                    <option value="Tam Gün (3 Öğün)">Tam Gün (3 Öğün)</option>
                    <option value="Kahvaltı + Öğle">Kahvaltı + Öğle</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                <div>
                  <label style={labelStyle}>Başlangıç Tarihi</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={formData.contract_start_date}
                    onChange={(e) => setFormData({ ...formData, contract_start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Bitiş Tarihi</label>
                  <input
                    type="date"
                    style={inputStyle}
                    value={formData.contract_end_date}
                    onChange={(e) => setFormData({ ...formData, contract_end_date: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Sağ Taraf: Canlı Maliyet & Kâr Marjı Simülatörü */}
            <div style={simBoxStyle}>
              <h4 style={sectionTitleStyle}>Canlı Maliyet & Kâr Marjı Simülatörü</h4>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={labelStyle}>Ham Malzeme (₺/Porsiyon)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={simParams.raw_ingredient_cost_per_portion}
                    onChange={(e) => setSimParams({ ...simParams, raw_ingredient_cost_per_portion: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Hedef Kâr Marjı (%)</label>
                  <input
                    type="number"
                    style={{ ...inputStyle, borderColor: "var(--accent, #3b82f6)", fontWeight: "bold" }}
                    value={formData.profit_margin_percent}
                    onChange={(e) => setFormData({ ...formData, profit_margin_percent: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
                <div>
                  <label style={labelStyle}>İşçilik Gideri (%)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={simParams.labor_overhead_percent}
                    onChange={(e) => setSimParams({ ...simParams, labor_overhead_percent: e.target.value })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Lojistik (₺/Porsiyon)</label>
                  <input
                    type="number"
                    style={inputStyle}
                    value={simParams.logistics_cost_per_portion}
                    onChange={(e) => setSimParams({ ...simParams, logistics_cost_per_portion: e.target.value })}
                  />
                </div>
              </div>

              {/* Simülasyon Sonuç Paneli */}
              {simResult && (
                <div style={simResultCardStyle}>
                  <div style={resultRowStyle}>
                    <span>Taban Porsiyon Maliyeti:</span>
                    <strong>{formatTL(simResult.total_base_cost_per_portion)} / öğün</strong>
                  </div>
                  <div style={{ ...resultRowStyle, color: "#10b981", fontSize: "16px" }}>
                    <span>Önerilen İhale Teklif Fiyatı:</span>
                    <strong>{formatTL(simResult.suggested_bid_price_per_portion)} / öğün</strong>
                  </div>
                  <div style={resultRowStyle}>
                    <span>Tahmini Toplam İhale Değeri:</span>
                    <strong>{formatTL(simResult.total_contract_value)}</strong>
                  </div>
                  <div style={resultRowStyle}>
                    <span>Öngörülen Net Kâr:</span>
                    <strong style={{ color: "#3b82f6" }}>{formatTL(simResult.estimated_total_profit)}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={footerStyle}>
            <button type="button" style={cancelBtnStyle} onClick={onClose}>İptal</button>
            <button type="submit" style={submitBtnStyle}>İhale & Teklifi Kaydet</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.75)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px",
};

const modalStyle = {
  background: "var(--bg, #ffffff)",
  border: "1px solid var(--border, #334155)",
  borderRadius: "16px",
  width: "100%",
  maxWidth: "900px",
  color: "var(--text)",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
  overflow: "hidden",
};

const headerStyle = {
  padding: "20px 24px",
  borderBottom: "1px solid var(--border, #334155)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontSize: "20px",
  cursor: "pointer",
};

const formContentStyle = {
  padding: "24px",
  background: "var(--bg, #ffffff)",
};

const sectionTitleStyle = {
  fontSize: "15px",
  fontWeight: "600",
  marginBottom: "14px",
  color: "#38bdf8",
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#94a3b8",
  marginBottom: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--surface2, #f8fafc)",
  border: "1px solid var(--border2)",
  borderRadius: "8px",
  color: "var(--text)",
  fontSize: "14px",
  marginBottom: "12px",
  boxSizing: "border-box",
};

const simBoxStyle = {
  background: "var(--surface2, #f8fafc)",
  padding: "16px",
  borderRadius: "12px",
  border: "1px solid var(--border)",
};

const simResultCardStyle = {
  marginTop: "16px",
  padding: "14px",
  background: "var(--surface, #ffffff)",
  borderRadius: "8px",
  border: "1px solid #3b82f644",
};

const resultRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "8px",
  fontSize: "13px",
  color: "#cbd5e1",
};

const footerStyle = {
  marginTop: "24px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "12px",
};

const cancelBtnStyle = {
  padding: "10px 20px",
  background: "#334155",
  border: "none",
  borderRadius: "8px",
  color: "#f8fafc",
  cursor: "pointer",
};

const submitBtnStyle = {
  padding: "10px 24px",
  background: "#10b981",
  border: "none",
  borderRadius: "8px",
  color: "#ffffff",
  fontWeight: "600",
  cursor: "pointer",
};
