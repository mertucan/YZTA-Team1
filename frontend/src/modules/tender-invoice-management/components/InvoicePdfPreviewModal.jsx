import React from "react";

export default function InvoicePdfPreviewModal({ isOpen, onClose, data, type = "invoice" }) {
  if (!isOpen || !data) return null;

  const formatTL = (val) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val || 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={overlayStyle} className="no-print-overlay">
      <div style={modalStyle}>
        <div style={headerStyle} className="no-print">
          <h3>{type === "invoice" ? "Fatura & Hakediş Belgesi Önizleme" : "İhale Teklif Dosyası Önizleme"}</h3>
          <div style={{ display: "flex", gap: "10px" }}>
            <button style={printBtnStyle} onClick={handlePrint}>Yazdır / PDF İndir</button>
            <button style={closeBtnStyle} onClick={onClose}>✕</button>
          </div>
        </div>

        <div style={paperStyle} id="printable-document">
          {/* Kurumsal Başlık */}
          <div style={companyHeaderStyle}>
            <div>
              <h2 style={{ margin: 0, color: "#1e293b", fontSize: "24px" }}>TABLODOT CATERING HİZMETLERİ A.Ş.</h2>
              <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "12px" }}>
                Merkez Mah. Sanayi Cad. No:42 Maslak / İstanbul | Tel: 0212 555 00 00
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "18px", fontWeight: "700", color: "#3b82f6" }}>
                {type === "invoice" ? "HAKEDİŞ FATURASI" : "İHALE TEKLİF CETVELİ"}
              </span>
              <p style={{ margin: "4px 0 0 0", color: "#475569", fontSize: "13px", fontWeight: "600" }}>
                No: {data.invoice_number || `TEKLİF-#${data.id}`}
              </p>
            </div>
          </div>

          <hr style={{ border: "none", borderTop: "2px solid #e2e8f0", margin: "20px 0" }} />

          {/* Müşteri & Tarih Bilgisi */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "24px" }}>
            <div>
              <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "bold" }}>Müşteri / Kurum</span>
              <h4 style={{ margin: "4px 0 0 0", color: "#0f172a", fontSize: "16px" }}>{data.client_name || data.institution_name}</h4>
              <p style={{ margin: "2px 0 0 0", color: "#64748b", fontSize: "13px" }}>
                {data.title || `Hakediş Dönemi: ${data.period_month}/${data.period_year}`}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", fontWeight: "bold" }}>Düzenleme Tarihi</span>
              <p style={{ margin: "4px 0 0 0", color: "#0f172a", fontSize: "14px", fontWeight: "600" }}>
                {new Date().toLocaleDateString("tr-TR")}
              </p>
            </div>
          </div>

          {/* Kalem Tablosu */}
          <table style={tableStyle}>
            <thead>
              <tr style={{ background: "#f1f5f9", color: "#334155" }}>
                <th style={thStyle}>Hizmet / Kalem Açıklaması</th>
                <th style={thCenterStyle}>Miktar / Öğün</th>
                <th style={thRightStyle}>Birim Fiyat</th>
                <th style={thRightStyle}>Toplam Tutar</th>
              </tr>
            </thead>
            <tbody>
              {type === "invoice" ? (
                <tr>
                  <td style={tdStyle}>
                    Toplu Yemek Teslimat Hizmeti ({data.period_month}/{data.period_year} Dönemi Fiili Öğün)
                  </td>
                  <td style={tdCenterStyle}>{data.total_meals_delivered?.toLocaleString("tr-TR")} Adet</td>
                  <td style={tdRightStyle}>{formatTL(data.unit_price)}</td>
                  <td style={tdRightStyle}>{formatTL(data.subtotal)}</td>
                </tr>
              ) : (
                <tr>
                  <td style={tdStyle}>
                    {data.title} - Daily Catering Service ({data.meal_type})
                  </td>
                  <td style={tdCenterStyle}>{(data.daily_person_count * 30).toLocaleString("tr-TR")} Öğün / Ay</td>
                  <td style={tdRightStyle}>{formatTL(120)}</td>
                  <td style={tdRightStyle}>{formatTL(data.daily_person_count * 30 * 120)}</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Alt Hesap Paneli */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
            <div style={{ width: "280px" }}>
              <div style={summaryRowStyle}>
                <span>Ara Toplam (Matrah):</span>
                <strong>{formatTL(data.subtotal || data.daily_person_count * 30 * 120)}</strong>
              </div>
              <div style={summaryRowStyle}>
                <span>KDV (%{data.vat_percent || 10}):</span>
                <strong>{formatTL(data.vat_amount || (data.subtotal || 0) * 0.1)}</strong>
              </div>
              <hr style={{ border: "none", borderTop: "1px solid #cbd5e1", margin: "8px 0" }} />
              <div style={{ ...summaryRowStyle, fontSize: "16px", color: "#0f172a" }}>
                <span>GENEL TOPLAM:</span>
                <strong style={{ color: "#2563eb" }}>
                  {formatTL(data.grand_total || (data.subtotal || 0) * 1.1)}
                </strong>
              </div>
            </div>
          </div>

          {/* İmza & Onay */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "60px", paddingTop: "20px", borderTop: "1px dashed #cbd5e1" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "40px" }}>Teslim Eden (TabloDot A.Ş.)</p>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>İmza / Kaşe</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "40px" }}>Teslim Alan Kurum Yetkilisi</p>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#334155" }}>İmza / Kaşe</p>
            </div>
          </div>
        </div>
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
  backgroundColor: "rgba(0, 0, 0, 0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1100,
  padding: "20px",
  overflowY: "auto",
};

const modalStyle = {
  background: "#1e293b",
  borderRadius: "16px",
  width: "100%",
  maxWidth: "840px",
  color: "#f8fafc",
  boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
};

const headerStyle = {
  padding: "16px 24px",
  borderBottom: "1px solid #334155",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const printBtnStyle = {
  padding: "8px 16px",
  background: "#10b981",
  border: "none",
  borderRadius: "8px",
  color: "#ffffff",
  fontWeight: "600",
  cursor: "pointer",
};

const closeBtnStyle = {
  background: "none",
  border: "none",
  color: "#94a3b8",
  fontSize: "20px",
  cursor: "pointer",
};

const paperStyle = {
  background: "#ffffff",
  color: "#0f172a",
  padding: "40px",
  margin: "20px",
  borderRadius: "8px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
  overflowY: "auto",
};

const companyHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "16px",
  fontSize: "13px",
};

const thStyle = { padding: "10px 12px", textAlign: "left" };
const thCenterStyle = { padding: "10px 12px", textAlign: "center" };
const thRightStyle = { padding: "10px 12px", textAlign: "right" };

const tdStyle = { padding: "12px", borderBottom: "1px solid #e2e8f0" };
const tdCenterStyle = { padding: "12px", textAlign: "center", borderBottom: "1px solid #e2e8f0" };
const tdRightStyle = { padding: "12px", textAlign: "right", borderBottom: "1px solid #e2e8f0" };

const summaryRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  marginBottom: "6px",
  fontSize: "13px",
  color: "#475569",
};
