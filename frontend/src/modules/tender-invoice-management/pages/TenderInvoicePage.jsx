import React, { useState, useEffect } from "react";
import TenderCards from "../components/TenderCards";
import TenderFormModal from "../components/TenderFormModal";
import InvoiceGeneratorModal from "../components/InvoiceGeneratorModal";
import InvoicePdfPreviewModal from "../components/InvoicePdfPreviewModal";
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
          <h1 className="tender-title">🏢 İhale Teklif Dosyası & Otomatik Fatura Yönetimi</h1>
          <p className="tender-subtitle">
            Catering ihaleleri için canlı kâr marjı hesabı yapın, ay sonu hakediş ve KDV'li faturaları otomatik üretin.
          </p>
        </div>

        <div className="tender-action-buttons">
          <button className="btn-success" onClick={() => setIsInvoiceModalOpen(true)}>
            🧾 Otomatik Hakediş Faturası Kes
          </button>
          <button className="btn-primary" onClick={() => setIsTenderModalOpen(true)}>
            ➕ Yeni İhale & Teklif Oluştur
          </button>
        </div>
      </div>

      {/* KPI Metrik Kartları */}
      <TenderCards tenders={tenders} invoices={invoices} />

      {/* Navigasyon Sekmeleri */}
      <div className="tender-tabs">
        <button
          className={`tab-btn ${activeTab === "tenders" ? "active" : ""}`}
          onClick={() => setActiveTab("tenders")}
        >
          📋 İhale Teklif Cetvelleri ({tenders.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "invoices" ? "active" : ""}`}
          onClick={() => setActiveTab("invoices")}
        >
          🧾 Hakedişler & Faturalar ({invoices.length})
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
                      <strong style={{ color: "#f8fafc" }}>{item.title}</strong>
                      <br />
                      <span style={{ fontSize: "12px", color: "#94a3b8" }}>{item.meal_type}</span>
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
                        📄 Önizle / PDF
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
                          Kazanıldı 🎉
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
                        🖨️ Fatura PDF
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
