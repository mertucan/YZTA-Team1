# YemekhanAI — Modül SDK

Bu klasör, yeni modül oluştururken takip edilecek kuralları ve araçları içerir.

---

## Hızlı Başlangıç

PowerShell'i proje kökünde aç ve çalıştır:

```powershell
.\sdk\create-module.ps1
```

Script modül adını, etiketini ve diğer bilgileri sorar; klasör yapısını otomatik oluşturur.

---

## Modül Nedir?

Her modül `frontend/src/modules/<modul-adi>/` altında **tamamen bağımsız** bir klasördür.
Ana projeye sadece **bir satır** eklenerek entegre edilir.

```
frontend/src/modules/
├── health-tracker/     ← örnek modül (referans al)
│   ├── index.ts        ← manifest: id, label, icon, route, component
│   ├── api/            ← sadece bu modüle ait API çağrıları
│   └── pages/          ← React sayfaları
└── senin-modulun/
    ├── index.ts
    ├── api/
    └── pages/
```

---

## Modül Manifest (index.ts)

Her modülün bir manifest dosyası olmalı:

```ts
import { AppModule } from "../types";
import MyPage from "./pages/MyPage";

export const myModule: AppModule = {
  id:          "modul-adi",          // kebab-case, benzersiz olmalı
  label:       "Modül Etiketi",      // sidebar'da görünecek isim
  icon:        "📊",                 // tek emoji
  route:       "/modules/modul-adi", // her zaman /modules/ ile başlamalı
  description: "Ne işe yarıyor?",
  author:      "Adın Soyadın",
  component:   MyPage,
};
```

---

## AppModule Arayüzü

```ts
interface AppModule {
  id:          string;               // benzersiz tanımlayıcı
  label:       string;               // sidebar metni
  icon:        string;               // emoji
  route:       string;               // /modules/<id>
  description: string;               // kısa açıklama
  author:      string;               // modülü geliştiren kişi
  component:   ComponentType;        // ana React bileşeni
}
```

---

## API Katmanı

Modülüne özel API çağrılarını `api/` altında tut.
Projenin merkezi Axios client'ını kullan:

```ts
import client from "../../../api/client";

export const getMyData = () =>
  client.get("/my-endpoint").then((r) => r.data);
```

Backend'e yeni endpoint gerekiyorsa `backend/app/routers/` altına yeni bir dosya ekle
ve `backend/app/main.py`'de `app.include_router(...)` ile kaydet.

---

## Sisteme Kaydetme

Modülü oluşturduktan sonra **tek yapman gereken** şey
`frontend/src/modules/index.ts` dosyasına bir satır eklemek:

```ts
// frontend/src/modules/index.ts
import { healthTrackerModule } from "./health-tracker";
import { myModule } from "./modul-adi";          // ← bunu ekle

export const modules: AppModule[] = [
  healthTrackerModule,
  myModule,                                       // ← bunu ekle
];
```

Bu kadar — sidebar ve router otomatik güncellenir.

---

## Kurallar

| Kural | Açıklama |
|-------|----------|
| **Bağımsızlık** | Başka bir modülün dosyasını import etme |
| **Route** | `/modules/<id>` formatına uyman zorunlu |
| **ID** | Benzersiz ve kebab-case olmalı |
| **API** | Kendi `api/` klasörünü kullan, merkezi dosyalara dokunma |
| **Backend** | Yeni router ekleyebilirsin, mevcut router'lara dokunma |
| **CSS** | `globals.css`'deki CSS değişkenlerini (`var(--accent)` vb.) kullan |

---

## CSS Değişkenleri (globals.css'den)

```css
--accent:      #3b6ef7   /* mavi — birincil */
--green:       #16a05e   /* yeşil — başarı */
--amber:       #c47f00   /* sarı — uyarı */
--red:         #d63030   /* kırmızı — hata/kritik */
--purple:      #7c3aed   /* mor — özel */
--text:        #1a1d2e   /* ana metin */
--text2:       #5a6080   /* ikincil metin */
--text3:       #9ba3c0   /* soluk metin */
--surface:     #ffffff   /* kart arkaplanı */
--border:      #e2e6f0   /* kenarlık */
--radius:      10px      /* köşe yuvarlama */
--mono:        JetBrains Mono  /* sayılar için */
```

---

## Referans: health-tracker Modülü

Nasıl çalıştığını görmek için `frontend/src/modules/health-tracker/` klasörüne bak.
Kopyalayıp üzerine yazarak başlayabilirsin.
