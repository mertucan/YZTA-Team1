import React from "react";

function CardIcon({ name }) {
  const common = {
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const icons = {
    clipboard: (
      <svg {...common}>
        <path d="M9 4h6" />
        <path d="M9 2h6v4H9z" />
        <path d="M6 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1" />
        <path d="M8 13h8" />
        <path d="M8 17h5" />
      </svg>
    ),
    money: (
      <svg {...common}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 9h.01" />
        <path d="M18 15h.01" />
      </svg>
    ),
    trend: (
      <svg {...common}>
        <path d="m3 17 6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </svg>
    ),
    receipt: (
      <svg {...common}>
        <path d="M6 3h12v18l-2-1-2 1-2-1-2 1-2-1-2 1V3Z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
        <path d="M9 16h4" />
      </svg>
    ),
  };
  return icons[name] || icons.clipboard;
}

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
        <div style={iconBadgeStyle("#3b82f6")}><CardIcon name="clipboard" /></div>
        <div>
          <span style={labelStyle}>Aktif İhaleler</span>
          <h3 style={valueStyle}>{activeTendersCount} Teklif</h3>
        </div>
      </div>

      <div className="tender-card" style={cardStyle}>
        <div style={iconBadgeStyle("#10b981")}><CardIcon name="money" /></div>
        <div>
          <span style={labelStyle}>Toplam İhale Hacmi</span>
          <h3 style={valueStyle}>{formatTL(totalProposalValue)}</h3>
        </div>
      </div>

      <div className="tender-card" style={cardStyle}>
        <div style={iconBadgeStyle("#8b5cf6")}><CardIcon name="trend" /></div>
        <div>
          <span style={labelStyle}>Ortalama Kâr Marjı</span>
          <h3 style={valueStyle}>%{avgProfitMargin}</h3>
        </div>
      </div>

      <div className="tender-card" style={cardStyle}>
        <div style={iconBadgeStyle("#f59e0b")}><CardIcon name="receipt" /></div>
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
  borderRadius: "8px",
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
  color: bg,
});

const labelStyle = {
  fontSize: "13px",
  color: "var(--text2)",
  display: "block",
  marginBottom: "4px",
};

const valueStyle = {
  fontSize: "20px",
  fontWeight: "700",
  color: "var(--text)",
  margin: 0,
};
