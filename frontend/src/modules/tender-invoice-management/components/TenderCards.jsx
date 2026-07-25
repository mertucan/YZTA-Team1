import React from "react";

export default function TenderCards({ tenders = [], invoices = [] }) {
  const activeTendersCount = tenders.filter(t => t.status === "DRAFT" || t.status === "SUBMITTED").length;
  
  const totalProposalValue = tenders.reduce((sum, t) => {
    // Estimating contract value based on person count * 30 days * 120 TL if base not present
    const estValue = t.daily_person_count * 30 * 120 * (1 + (t.profit_margin_percent || 20) / 100);
    return sum + estValue;
  }, 0);

  const avgProfitMargin = tenders.length > 0
    ? (tenders.reduce((sum, t) => sum + (t.profit_margin_percent || 20), 0) / tenders.length).toFixed(1)
    : "20.0";

  const totalInvoiceVolume = invoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);

  const formatTL = (amount) =>
    new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(amount || 0);

  return (
    <div className="tender-metric-grid" style={gridStyle}>
      <div className="tender-card" style={cardStyle}>
        <div style={iconBadgeStyle("#3b82f6")}>📋</div>
        <div>
          <span style={labelStyle}>Aktif İhaleler</span>
          <h3 style={valueStyle}>{activeTendersCount} Teklif</h3>
        </div>
      </div>

      <div className="tender-card" style={cardStyle}>
        <div style={iconBadgeStyle("#10b981")}>💰</div>
        <div>
          <span style={labelStyle}>Toplam İhale Hacmi</span>
          <h3 style={valueStyle}>{formatTL(totalProposalValue)}</h3>
        </div>
      </div>

      <div className="tender-card" style={cardStyle}>
        <div style={iconBadgeStyle("#8b5cf6")}>📈</div>
        <div>
          <span style={labelStyle}>Ortalama Kâr Marjı</span>
          <h3 style={valueStyle}>%{avgProfitMargin}</h3>
        </div>
      </div>

      <div className="tender-card" style={cardStyle}>
        <div style={iconBadgeStyle("#f59e0b")}>🧾</div>
        <div>
          <span style={labelStyle}>Kesilen Fatura Toplamı</span>
          <h3 style={valueStyle}>{formatTL(totalInvoiceVolume)}</h3>
        </div>
      </div>
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
  marginBottom: "24px",
};

const cardStyle = {
  background: "var(--surface, #1e293b)",
  border: "1px solid var(--border, #334155)",
  borderRadius: "12px",
  padding: "20px",
  display: "flex",
  alignItems: "center",
  gap: "16px",
  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
};

const iconBadgeStyle = (bg) => ({
  width: "48px",
  height: "48px",
  borderRadius: "10px",
  background: `${bg}22`,
  border: `1px solid ${bg}44`,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "24px",
});

const labelStyle = {
  fontSize: "13px",
  color: "#94a3b8",
  display: "block",
  marginBottom: "4px",
};

const valueStyle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "#f8fafc",
  margin: 0,
};
