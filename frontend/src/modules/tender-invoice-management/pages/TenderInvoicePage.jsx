import React, { useState, useEffect } from "react";
import TenderCards from "../components/TenderCards";
import TenderFormModal from "../components/TenderFormModal";
import InvoiceGeneratorModal from "../components/InvoiceGeneratorModal";
import InvoicePdfPreviewModal from "../components/InvoicePdfPreviewModal";
import LoadingSpinner from "../../../components/LoadingSpinner";
import {
  getTenders,
  createTender,
  updateTender,
  deleteTender,
  getInvoices,
  updateInvoiceStatus,
  deleteInvoice,
} from "../api/tenderInvoice";
import "./TenderInvoicePage.css";

function ModuleIcon({ name, size = 18 }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  const icons = {
    building: (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M8 7h2" />
        <path d="M14 7h2" />
        <path d="M8 11h2" />
        <path d="M14 11h2" />
        <path d="M9 21v-4h6v4" />
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
    plus: (
      <svg {...common}>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
    list: (
      <svg {...common}>
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </svg>
    ),
    file: (
      <svg {...common}>
        <path d="M14 3H6v18h12V7l-4-4Z" />
        <path d="M14 3v4h4" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </svg>
    ),
    printer: (
      <svg {...common}>
        <path d="M6 9V3h12v6" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </svg>
    ),
  };
  return icons[name] || icons.file;
}

export default function TenderInvoicePage() {
  const [activeTab, setActiveTab] = useState("tenders"); // "tenders" | "invoices"
  const [tenders, setTenders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isTenderModalOpen, setIsTenderModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewType, setPreviewType] = useState("invoice");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tendersData, invoicesData] = await Promise.all([
        getTenders(),
        getInvoices(),
      ]);
      setTenders(tendersData || []);
      setInvoices(invoicesData || []);
    } catch (err) {
      console.error("Veri yükleme hatası:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTender = async (data) => {
    try {
      const created = await createTender(data);
      setTenders([created, ...tenders]);
      setIsTenderModalOpen(false);
    } catch (err) {
      alert("İhale oluşturulamadı: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdateTenderStatus = async (id, status) => {
    try {
      const updated = await updateTender(id, { status });
      setTenders(tenders.map((t) => (t.id === id ? updated : t)));
    } catch (err) {
      alert("Güncelleme hatası");
    }
  };

  const handleDeleteTender = async (id) => {
    if (!window.confirm("Bu ihale kaydını silmek istediğinize emin misiniz?")) return;
    try {
      await deleteTender(id);
      setTenders(tenders.filter((t) => t.id !== id));
    } catch (err) {
      alert("Silme hatası");
    }
  };

  const handleInvoiceGenerated = (newInvoice) => {
    setInvoices([newInvoice, ...invoices]);
    setPreviewData(newInvoice);
    setPreviewType("invoice");
  };

  const handleUpdateInvoiceStatus = async (id, status) => {
    try {
      const updated = await updateInvoiceStatus(id, status);
      setInvoices(invoices.map((inv) => (inv.id === id ? updated : inv)));
    } catch (err) {
      alert("Fatura durumu güncellenemedi");
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm("Bu faturayı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteInvoice(id);
      setInvoices(invoices.filter((inv) => inv.id !== id));
    } catch (err) {
      alert("Fatura silinemedi");
    }
  };

  const formatTL = (val) => new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(val || 0);

  return (
    <div className="tender-page-container">
      {/* Üst Başlık & Butonlar */}
      <div className="tender-header-bar">
        <div>
          <h1 className="tender-title">
            <span className="tender-title-icon"><ModuleIcon name="building" size={22} /></span>
            İhale Teklif Dosyası & Otomatik Fatura Yönetimi
          </h1>
          <p className="tender-subtitle">
            Catering ihaleleri için canlı kâr marjı hesabı yapın, ay sonu hakediş ve KDV'li faturaları otomatik üretin.
          </p>
        </div>

        <div className="tender-action-buttons">
          <button className="btn-success" onClick={() => setIsInvoiceModalOpen(true)}>
            <ModuleIcon name="receipt" /> Otomatik Hakediş Faturası Kes
          </button>
          <button className="btn-primary" onClick={() => setIsTenderModalOpen(true)}>
            <ModuleIcon name="plus" /> Yeni İhale & Teklif Oluştur
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="İhale ve fatura verileri yükleniyor" minHeight={300} size={42} />
      ) : (
        <>
      {/* KPI Metrik Kartları */}
      <TenderCards tenders={tenders} invoices={invoices} />

      {/* Navigasyon Sekmeleri */}
      <div className="tender-tabs">
        <button
          className={`tab-btn ${activeTab === "tenders" ? "active" : ""}`}
          onClick={() => setActiveTab("tenders")}
        >
          <ModuleIcon name="list" /> İhale Teklif Cetvelleri ({tenders.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "invoices" ? "active" : ""}`}
          onClick={() => setActiveTab("invoices")}
        >
          <ModuleIcon name="receipt" /> Hakedişler & Faturalar ({invoices.length})
        </button>
      </div>

      {/* Sekme 1: İhaleler Listesi */}
      {activeTab === "tenders" && (
        <div className="tender-table-container">
          <table className="tender-table">
            <thead>
              <tr>
                <th>İhale / Proje Adı</th>
                <th>Kurum / Müşteri</th>
                <th>Günlük Öğün</th>
                <th>Hedef Kâr %</th>
                <th>Teklif Durumu</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {tenders.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                    Henüz kayıtlı ihale bulunmuyor. Yukarıdaki "Yeni İhale Oluştur" butonuna basarak ilk teklifinizi hazırlayabilirsiniz.
                  </td>
                </tr>
              ) : (
                tenders.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong className="tender-row-title">{item.title}</strong>
                      <br />
                      <span className="tender-row-muted">{item.meal_type}</span>
                    </td>
                    <td>{item.institution_name}</td>
                    <td>{item.daily_person_count?.toLocaleString("tr-TR")} Kişi</td>
                    <td>
                      <span style={{ color: "#38bdf8", fontWeight: "bold" }}>%{item.profit_margin_percent}</span>
                    </td>
                    <td>
                      <span className={`status-badge status-${item.status}`}>{item.status}</span>
                    </td>
                    <td>
                      <button
                        className="action-btn-sm"
                        onClick={() => {
                          setPreviewData(item);
                          setPreviewType("proposal");
                        }}
                      >
                        <ModuleIcon name="file" size={14} /> Önizle / PDF
                      </button>
                      {item.status === "DRAFT" && (
                        <button
                          className="action-btn-sm"
                          style={{ background: "#10b981" }}
                          onClick={() => handleUpdateTenderStatus(item.id, "SUBMITTED")}
                        >
                          Teklif Ver
                        </button>
                      )}
                      {item.status === "SUBMITTED" && (
                        <button
                          className="action-btn-sm"
                          style={{ background: "#3b82f6" }}
                          onClick={() => handleUpdateTenderStatus(item.id, "WON")}
                        >
                          Kazanıldı
                        </button>
                      )}
                      <button
                        className="action-btn-sm"
                        style={{ background: "#ef4444" }}
                        onClick={() => handleDeleteTender(item.id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Sekme 2: Faturalar Kataloğu */}
      {activeTab === "invoices" && (
        <div className="tender-table-container">
          <table className="tender-table">
            <thead>
              <tr>
                <th>Fatura No</th>
                <th>Müşteri / Kurum</th>
                <th>Dönem</th>
                <th>Fiili Öğün</th>
                <th>Matrah</th>
                <th>KDV (%10)</th>
                <th>Genel Toplam</th>
                <th>Durum</th>
                <th>İşlemler</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "30px", color: "#94a3b8" }}>
                    Henüz oluşturulmuş fatura bulunmuyor. "Otomatik Hakediş Faturası Kes" butonuna basarak saniyeler içinde fatura üretebilirsiniz.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>
                      <strong style={{ color: "#38bdf8" }}>{inv.invoice_number}</strong>
                    </td>
                    <td>{inv.client_name}</td>
                    <td>{inv.period_month}/{inv.period_year}</td>
                    <td>{inv.total_meals_delivered?.toLocaleString("tr-TR")} Öğün</td>
                    <td>{formatTL(inv.subtotal)}</td>
                    <td>{formatTL(inv.vat_amount)}</td>
                    <td>
                      <strong style={{ color: "#10b981" }}>{formatTL(inv.grand_total)}</strong>
                    </td>
                    <td>
                      <span className={`status-badge status-${inv.status}`}>{inv.status}</span>
                    </td>
                    <td>
                      <button
                        className="action-btn-sm"
                        onClick={() => {
                          setPreviewData(inv);
                          setPreviewType("invoice");
                        }}
                      >
                        <ModuleIcon name="printer" size={14} /> Fatura PDF
                      </button>
                      {inv.status === "ISSUED" && (
                        <button
                          className="action-btn-sm"
                          style={{ background: "#10b981" }}
                          onClick={() => handleUpdateInvoiceStatus(inv.id, "PAID")}
                        >
                          Ödendi Yap
                        </button>
                      )}
                      <button
                        className="action-btn-sm"
                        style={{ background: "#ef4444" }}
                        onClick={() => handleDeleteInvoice(inv.id)}
                      >
                        Sil
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {/* Modals */}
      <TenderFormModal
        isOpen={isTenderModalOpen}
        onClose={() => setIsTenderModalOpen(false)}
        onSubmit={handleCreateTender}
      />

      <InvoiceGeneratorModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onGenerated={handleInvoiceGenerated}
      />

      <InvoicePdfPreviewModal
        isOpen={!!previewData}
        onClose={() => setPreviewData(null)}
        data={previewData}
        type={previewType}
      />
    </div>
  );
}
