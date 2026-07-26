import React, { useState } from "react";

export default function IngredientCarbonTable({ factors, onSaveFactor, onDeleteFactor }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [editingItem, setEditingItem] = useState(null);
  const [co2Input, setCo2Input] = useState("");
  const [notesInput, setNotesInput] = useState("");

  const categories = ["ALL", ...new Set(factors.map((f) => f.category).filter(Boolean))];

  const filteredFactors = factors.filter((item) => {
    const matchesSearch = (item.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === "ALL" || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const handleEditClick = (item) => {
    setEditingItem(item);
    setCo2Input(item.co2_per_unit);
    setNotesInput(item.notes || "");
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    onSaveFactor({
      ingredient_id: editingItem.ingredient_id,
      co2_per_unit: parseFloat(co2Input) || 0,
      notes: notesInput,
    });
    setEditingItem(null);
  };

  const getCO2Badge = (val) => {
    if (val >= 10.0) return <span className="sus-card-badge badge-red">Yüksek ({val} kg)</span>;
    if (val >= 3.0) return <span className="sus-card-badge badge-amber">Orta ({val} kg)</span>;
    return <span className="sus-card-badge badge-green">Düşük ({val} kg)</span>;
  };

  return (
    <div className="sus-section-card">
      <div className="sus-section-title">
        <span>Malzeme Karbon Faktör Veritabanı</span>
        <span style={{ fontSize: "12px", color: "var(--text3)" }}>{filteredFactors.length} Malzeme Listelendi</span>
      </div>

      {/* Arama ve Kategori Filtreleri */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Malzeme adı ile ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="sus-input"
          style={{ width: "260px" }}
        />

        <div style={{ display: "flex", gap: "6px", overflowX: "auto" }} className="no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`sus-tab-btn ${selectedCategory === cat ? "active" : ""}`}
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              {cat === "ALL" ? "Tüm Kategoriler" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div className="sus-table-container">
        <table className="sus-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Malzeme Adı</th>
              <th>Kategori</th>
              <th>Birim</th>
              <th>Karbon Faktörü (kg CO₂e)</th>
              <th>Emisyon Seviyesi</th>
              <th>Yerellik</th>
              <th>Notlar</th>
              <th style={{ textAlign: "right" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {filteredFactors.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: "center", padding: "24px", color: "var(--text3)" }}>
                  Arama kriterlerine uygun malzeme bulunamadı.
                </td>
              </tr>
            ) : (
              filteredFactors.map((item) => (
                <tr key={item.ingredient_id}>
                  <td style={{ color: "var(--text3)", fontWeight: 600 }}>#{item.ingredient_id}</td>
                  <td style={{ fontWeight: 800 }}>{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.unit}</td>
                  <td style={{ fontWeight: 900, color: "var(--accent)" }}>
                    {item.co2_per_unit} kg CO₂e / {item.unit}
                  </td>
                  <td>{getCO2Badge(item.co2_per_unit)}</td>
                  <td>
                    {item.is_local ? (
                      <span className="sus-card-badge badge-green">Yerli Üretim</span>
                    ) : (
                      <span className="sus-card-badge badge-amber">Ulusal / İthal</span>
                    )}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--text2)" }}>{item.notes || "-"}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      onClick={() => handleEditClick(item)}
                      className="sus-btn sus-btn-secondary"
                      style={{ padding: "4px 10px", fontSize: "12px" }}
                    >
                      Düzenle
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Düzenleme Modalı */}
      {editingItem && (
        <div className="sus-modal-overlay">
          <div className="sus-modal">
            <div className="sus-modal-head">
              <h3>Karbon Faktörü Düzenle: {editingItem.name}</h3>
              <button className="sus-modal-close" onClick={() => setEditingItem(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="sus-form-group">
                <label>1 {editingItem.unit} Malzeme İçin CO₂ Emisyonu (kg CO₂e):</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={co2Input}
                  onChange={(e) => setCo2Input(e.target.value)}
                  className="sus-input"
                  required
                />
              </div>

              <div className="sus-form-group">
                <label>Notlar / Kaynak Bilgisi:</label>
                <input
                  type="text"
                  placeholder="Örn: IPCC 2024 Emisyon Katsayısı Tablosu"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  className="sus-input"
                />
              </div>

              <div style={{ display: "flex", justifyRight: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="sus-btn sus-btn-secondary"
                  style={{ flex: 1 }}
                >
                  İptal
                </button>
                <button type="submit" className="sus-btn sus-btn-primary" style={{ flex: 1 }}>
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
