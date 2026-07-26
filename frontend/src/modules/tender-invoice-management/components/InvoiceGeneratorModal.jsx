import React, { useState, useEffect } from "react";
import { autoGenerateInvoice, getCompanies } from "../api/tenderInvoice";

export default function InvoiceGeneratorModal({ isOpen, onClose, onGenerated }) {
  const [companies, setCompanies] = useState([]);
  const [formData, setFormData] = useState({
    client_name: "",
    company_id: "",
    period_month: new Date().getMonth() + 1,
    period_year: new Date().getFullYear(),
    unit_price: 110,
    vat_percent: 10,
    custom_meal_count: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchCompanies();
    }
  }, [isOpen]);

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

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client_name) {
      alert("Lütfen Müşteri / Kurum adını giriniz.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        client_name: formData.client_name,
        company_id: formData.company_id ? Number(formData.company_id) : null,
        period_month: Number(formData.period_month),
        period_year: Number(formData.period_year),
        unit_price: Number(formData.unit_price),
        vat_percent: Number(formData.vat_percent),
        custom_meal_count: formData.custom_meal_count ? Number(formData.custom_meal_count) : null,
      };

      const result = await autoGenerateInvoice(payload);
      onGenerated(result);
      onClose();
    } catch (err) {
      alert(`Fatura oluşturma hatası: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
  ];

  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <h3>Otomatik Hakediş & Fatura Oluşturucu</h3>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <label style={labelStyle}>Düzenleyen Catering Firması *</label>
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

          <label style={labelStyle}>Müşteri / Kurum Adı *</label>
          <input
            type="text"
            style={inputStyle}
            placeholder="Örn: İstanbul Teknik Üniversitesi Sağlık Kültür Daire Bşk."
            value={formData.client_name}
            onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
            required
          />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Hakediş Dönem Ayı</label>
              <select
                style={inputStyle}
                value={formData.period_month}
                onChange={(e) => setFormData({ ...formData, period_month: e.target.value })}
              >
                {monthNames.map((name, idx) => (
                  <option key={idx + 1} value={idx + 1}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Hakediş Dönem Yılı</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.period_year}
                onChange={(e) => setFormData({ ...formData, period_year: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={labelStyle}>Sözleşme Birim Fiyatı (₺ / Öğün)</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
              />
            </div>
            <div>
              <label style={labelStyle}>KDV Oranı (%)</label>
              <input
                type="number"
                style={inputStyle}
                value={formData.vat_percent}
                onChange={(e) => setFormData({ ...formData, vat_percent: e.target.value })}
              />
            </div>
          </div>

          <div style={{ marginTop: "8px" }}>
            <label style={labelStyle}>Teslim Edilen Fiili Öğün Sayısı (İsteğe Bağlı)</label>
            <input
              type="number"
              style={inputStyle}
              placeholder="Boş bırakılırsa veritabanındaki kayıtlı öğünler otomatik sayılır"
              value={formData.custom_meal_count}
              onChange={(e) => setFormData({ ...formData, custom_meal_count: e.target.value })}
            />
            <span style={{ fontSize: "11px", color: "#94a3b8" }}>
              Boş bırakırsanız sistem o aya ait veritabanı verilerini otomatik sayıp matrah ve KDV hesabını yapar.
            </span>
          </div>

          <div style={footerStyle}>
            <button type="button" style={cancelBtnStyle} onClick={onClose}>İptal</button>
            <button type="submit" style={submitBtnStyle} disabled={loading}>
              {loading ? "Hesaplanıyor..." : "Faturayı Oluştur & Kaydet"}
            </button>
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
  maxWidth: "540px",
  color: "var(--text)",
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4)",
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

const formStyle = {
  padding: "24px",
  background: "var(--bg, #ffffff)",
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

const footerStyle = {
  marginTop: "20px",
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
  background: "#3b82f6",
  border: "none",
  borderRadius: "8px",
  color: "#ffffff",
  fontWeight: "600",
  cursor: "pointer",
};
