import React, { useState } from "react";

export default function MenuEcoCalculator({ factors = [] }) {
  const [portionCount, setPortionCount] = useState(500);
  const [selectedIngredients, setSelectedIngredients] = useState([
    { ingredient_id: 1, quantity_per_portion: 0.15 }, // 150g Tavuk / Et
    { ingredient_id: 2, quantity_per_portion: 0.08 }, // 80g Pirinç
    { ingredient_id: 3, quantity_per_portion: 0.10 }, // 100g Mercimek
  ]);

  const [isOptimized, setIsOptimized] = useState(false);

  // Quick lookup dictionary by ingredient_id and id
  const factorMap = {};
  factors.forEach((f) => {
    if (f.ingredient_id != null) factorMap[f.ingredient_id] = f;
    if (f.id != null) factorMap[f.id] = f;
  });

  // Calculate CO2 emissions per 1 portion and total for portionCount
  const calculateEmissions = (items) => {
    let singlePortionCO2 = 0;
    const itemDetails = items.map((item) => {
      const ing = factorMap[item.ingredient_id] || factors.find((f) => f.ingredient_id === item.ingredient_id || f.id === item.ingredient_id) || {};
      const co2PerUnit = Number(ing.co2_per_unit || 0);
      const qty = Number(item.quantity_per_portion || 0);
      const itemCO2PerPortion = qty * co2PerUnit;
      singlePortionCO2 += itemCO2PerPortion;
      return {
        ...item,
        name: ing.name || `Malzeme #${item.ingredient_id}`,
        unit: ing.unit || "kg",
        co2_per_unit: co2PerUnit,
        itemCO2PerPortion,
        totalItemCO2: itemCO2PerPortion * portionCount,
      };
    });

    const totalCO2 = singlePortionCO2 * portionCount;
    return { singlePortionCO2, totalCO2, itemDetails };
  };

  const currentCalc = calculateEmissions(selectedIngredients);

  // Optimization simulation: Replace high-carbon ingredients (CO2 >= 4.0, e.g. Tavuk / Kıyma / Dana) with lower-carbon legume/vegetable alternatives (e.g. Mercimek)
  const getOptimizedBuild = () => {
    const swapList = [];
    const newItems = selectedIngredients.map((item) => {
      const ing = factorMap[item.ingredient_id] || factors.find((f) => f.ingredient_id === item.ingredient_id || f.id === item.ingredient_id);
      if (ing && Number(ing.co2_per_unit) >= 4.0) {
        // Find a low CO2 ingredient (preferably Mercimek / Bakliyat)
        const lowAlt = factors.find(
          (f) => Number(f.co2_per_unit) <= 1.5 && (f.name?.toLowerCase().includes("mercimek") || f.name?.toLowerCase().includes("bakliyat") || f.name?.toLowerCase().includes("fasulye"))
        ) || factors.find((f) => Number(f.co2_per_unit) < 2.0 && f.ingredient_id !== item.ingredient_id) || factors[0];

        if (lowAlt) {
          const targetId = lowAlt.ingredient_id || lowAlt.id;
          swapList.push({
            originalName: ing.name,
            originalCO2: Number(ing.co2_per_unit),
            newName: lowAlt.name,
            newCO2: Number(lowAlt.co2_per_unit),
          });
          return { ...item, ingredient_id: targetId };
        }
      }
      return item;
    });

    return { newItems, swapList };
  };

  const { newItems: optimizedItems, swapList: swapItems } = getOptimizedBuild();
  const optimizedCalc = calculateEmissions(optimizedItems);

  const activeCalc = isOptimized ? optimizedCalc : currentCalc;
  const co2Saved = Math.max(0, currentCalc.totalCO2 - optimizedCalc.totalCO2);
  const savingPercent = currentCalc.totalCO2 > 0 ? ((co2Saved / currentCalc.totalCO2) * 100).toFixed(1) : "0.0";

  // Ingredient list handlers
  const handleQuantityChange = (idx, newQty) => {
    const updated = [...selectedIngredients];
    updated[idx].quantity_per_portion = Math.max(0, parseFloat(newQty) || 0);
    setSelectedIngredients(updated);
  };

  const handleIngredientSelect = (idx, newId) => {
    const updated = [...selectedIngredients];
    updated[idx].ingredient_id = parseInt(newId) || 1;
    setSelectedIngredients(updated);
  };

  const handleRemoveIngredient = (idx) => {
    if (selectedIngredients.length <= 1) return;
    const updated = selectedIngredients.filter((_, i) => i !== idx);
    setSelectedIngredients(updated);
  };

  const handleAddIngredient = () => {
    const nextFactor = factors.find((f) => !selectedIngredients.some((si) => si.ingredient_id === (f.ingredient_id || f.id))) || factors[0];
    if (nextFactor) {
      setSelectedIngredients([...selectedIngredients, { ingredient_id: nextFactor.ingredient_id || nextFactor.id, quantity_per_portion: 0.05 }]);
    }
  };

  return (
    <div className="sus-section-card">
      <div className="sus-section-title">
        <span>Canlı Menü Karbon Ayak İzi Hesaplayıcı & Yeşil İkame</span>
        <span style={{ fontSize: "12px", color: "var(--green)", fontWeight: 700 }}>
          Canlı Veri Analizi
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        {/* Sol Parametre Paneli */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="sus-form-group">
            <label style={{ fontWeight: 700, marginBottom: "6px", display: "block" }}>
              👥 Öğrenci Porsiyon Sayısı:
            </label>
            <input
              type="number"
              value={portionCount}
              onChange={(e) => setPortionCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="sus-input"
              min="1"
              style={{ fontWeight: 800, fontSize: "16px" }}
            />
          </div>

          <div style={{ background: "var(--surface2)", padding: "16px", borderRadius: "10px", border: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h4 style={{ fontSize: "14px", fontWeight: 800, color: "var(--text)", margin: 0 }}>
                🍲 Menü İçeriği ve Malzeme Emisyonları:
              </h4>
              <button
                onClick={handleAddIngredient}
                style={{
                  padding: "4px 10px",
                  fontSize: "12px",
                  fontWeight: 700,
                  background: "var(--green)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                + Malzeme Ekle
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {currentCalc.itemDetails.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "var(--surface)",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <select
                      value={item.ingredient_id}
                      onChange={(e) => handleIngredientSelect(idx, e.target.value)}
                      className="sus-select"
                      style={{
                        flex: 1,
                        marginRight: "8px",
                      }}
                    >
                      {factors.map((f) => (
                        <option key={f.id || f.ingredient_id} value={f.ingredient_id || f.id}>
                          {f.name} ({Number(f.co2_per_unit).toFixed(2)} kg CO₂e/{f.unit || "kg"})
                        </option>
                      ))}
                    </select>

                    {selectedIngredients.length > 1 && (
                      <button
                        onClick={() => handleRemoveIngredient(idx)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--red, #ef4444)",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "14px",
                        }}
                        title="Sil"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ color: "var(--text2)" }}>Porsiyon Miktarı:</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.quantity_per_portion}
                        onChange={(e) => handleQuantityChange(idx, e.target.value)}
                        style={{
                          width: "70px",
                          padding: "2px 6px",
                          background: "var(--surface2)",
                          color: "var(--text)",
                          border: "1px solid var(--border)",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: "bold",
                        }}
                      />
                      <span style={{ color: "var(--text2)" }}>{item.unit}</span>
                    </div>

                    <div style={{ color: "var(--green)", fontWeight: 700 }}>
                      {(item.itemCO2PerPortion).toFixed(3)} kg CO₂e / porsiyon
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {!isOptimized ? (
              <button onClick={() => setIsOptimized(true)} className="sus-btn sus-btn-primary" style={{ width: "100%" }}>
                🌱 Düşük Emisyonlu Yeşil İkameyi Uygula
              </button>
            ) : (
              <button onClick={() => setIsOptimized(false)} className="sus-btn sus-btn-secondary" style={{ width: "100%" }}>
                ↺ Orijinal Menüye Dön
              </button>
            )}
          </div>
        </div>

        {/* Sağ Karbon Sonuç Kartı */}
        <div
          style={{
            background: isOptimized
              ? "linear-gradient(135deg, rgba(22, 160, 94, 0.18) 0%, rgba(232, 128, 0, 0.12) 100%)"
              : "var(--surface2)",
            border: isOptimized ? "1px solid var(--green-border)" : "1px solid var(--border)",
            borderRadius: "12px",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            gap: "20px",
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "12px", fontWeight: 800, color: isOptimized ? "var(--green)" : "var(--text2)" }}>
                {isOptimized ? "✅ OPTİMİZE EDİLMİŞ YEŞİL MENÜ" : "ORİJİNAL MENÜ EMİSYONU"}
              </span>
              <span style={{ fontSize: "11px", background: "var(--surface)", padding: "2px 8px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                Hassas Hesaplama
              </span>
            </div>

            {/* Toplam Karbon Sonucu (toFixed(2)) */}
            <div style={{ fontSize: "40px", fontWeight: 900, color: "var(--text)", marginTop: "12px" }}>
              {activeCalc.totalCO2.toFixed(2)}{" "}
              <small style={{ fontSize: "18px", fontWeight: 700, color: "var(--text2)" }}>kg CO₂e</small>
            </div>

            {/* 1 Porsiyon Emisyon Detayı */}
            <div
              style={{
                marginTop: "12px",
                padding: "10px 14px",
                background: "var(--surface)",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                fontSize: "13px",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--text2)" }}>1 Porsiyon Emisyonu:</span>
              <strong style={{ color: "var(--text)" }}>{activeCalc.singlePortionCO2.toFixed(3)} kg CO₂e</strong>
            </div>

            <p style={{ fontSize: "12px", color: "var(--text2)", marginTop: "10px", lineHeight: "1.5" }}>
              Formül: <strong>{portionCount} porsiyon × {activeCalc.singlePortionCO2.toFixed(3)} kg CO₂e/porsiyon</strong> = {activeCalc.totalCO2.toFixed(2)} kg CO₂e
            </p>
          </div>

          {/* İkame Değişim Detayları */}
          {isOptimized && swapItems.length > 0 && (
            <div style={{ background: "var(--surface)", padding: "12px", borderRadius: "8px", border: "1px solid var(--green-border)", fontSize: "12px" }}>
              <div style={{ fontWeight: 800, color: "var(--green)", marginBottom: "6px" }}>♻️ Uygulanan Yeşil İkameler:</div>
              {swapItems.map((sw, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "var(--text)" }}>
                  <span style={{ textDecoration: "line-through", color: "var(--text3)" }}>{sw.originalName} ({sw.originalCO2.toFixed(2)})</span>
                  <span style={{ fontWeight: 700, color: "var(--green)" }}>➔ {sw.newName} ({sw.newCO2.toFixed(2)})</span>
                </div>
              ))}
            </div>
          )}

          {isOptimized && (
            <div style={{ background: "var(--green-bg)", padding: "16px", borderRadius: "10px", border: "1px solid var(--green-border)" }}>
              <div style={{ fontWeight: 900, color: "var(--green)", fontSize: "16px" }}>
                🎉 Toplam %{savingPercent} Karbon Tasarrufu!
              </div>
              <div style={{ fontSize: "13px", color: "var(--text)", marginTop: "6px" }}>
                Tek günde <strong>{co2Saved.toFixed(2)} kg CO₂e</strong> atmosfere salınmaktan kurtarıldı.
              </div>
            </div>
          )}

          <div style={{ fontSize: "11px", color: "var(--text3)", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
            * Emisyon değerleri, ulusal gıda karbon ayak izi veritabanı katsayıları temel alınarak canlı hesaplanmaktadır.
          </div>
        </div>
      </div>
    </div>
  );
}


