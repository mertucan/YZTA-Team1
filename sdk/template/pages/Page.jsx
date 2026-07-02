import { useEffect, useState } from "react";
import { getItems, __COMPONENT_NAME__Item } from "../api/api";

export default function __COMPONENT_NAME__Page() {
  const [data, setData]     = useState<__COMPONENT_NAME__Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItems().then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: 40, color: "var(--text3)" }}>Yükleniyor...</div>;

  return (
    <div>
      {/* Başlık */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 20, fontWeight: 600 }}>__MODULE_ICON__ __MODULE_LABEL__</div>
        <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 3 }}>__MODULE_DESC__</div>
      </div>

      {/* İçerik buraya */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24, boxShadow: "var(--shadow)" }}>
        <p style={{ color: "var(--text2)" }}>Modül içeriğini buraya ekle.</p>
        <pre style={{ marginTop: 12, fontSize: 11, color: "var(--text3)" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
