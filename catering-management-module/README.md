# 🍽️ Catering Management SaaS

Üniversiteler için çok kiracılı (multi-tenant) catering yönetim platformu.
FastAPI + React + Supabase ile geliştirilmiştir.

---

## 📁 Proje Yapısı

```
CateringManagement/
├── backend/                    # FastAPI REST API
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py       # Uygulama ayarları (pydantic-settings)
│   │   │   └── database.py     # SQLAlchemy engine & session
│   │   ├── routers/
│   │   │   ├── auth.py         # Giriş / kayıt endpoint'leri
│   │   │   ├── companies.py    # Catering şirket yönetimi
│   │   │   ├── dashboard.py    # İstatistik & özet
│   │   │   ├── menu_assignments.py # Menü-üniversite atamaları
│   │   │   ├── universities.py # Üniversite CRUD
│   │   │   └── users.py        # Kullanıcı CRUD & rol yönetimi
│   │   ├── __init__.py
│   │   ├── auth.py             # JWT doğrulama & RBAC bağımlılıkları
│   │   ├── main.py             # FastAPI app, CORS, startup seed
│   │   ├── models.py           # SQLAlchemy ORM modelleri
│   │   ├── schemas.py          # Pydantic şemaları (request/response)
│   │   └── services.py         # İş mantığı servisleri
│   ├── sql/                    # Ham SQL betikleri (opsiyonel)
│   ├── .env.example            # Ortam değişkeni şablonu
│   └── requirements.txt        # Python bağımlılıkları
│
├── frontend/                   # React + Vite + TypeScript SPA
│   ├── src/
│   │   ├── components/
│   │   │   └── RealtimeIndicator.tsx  # Supabase realtime göstergesi
│   │   ├── hooks/
│   │   │   └── useRealtimeData.ts     # Realtime veri hook'u
│   │   ├── styles/             # CSS modülleri
│   │   ├── App.tsx             # Ana uygulama & tüm sayfalar
│   │   ├── api.ts              # Fetch wrapper (apiGet/Post/Put/Delete)
│   │   ├── main.tsx            # React entry point
│   │   ├── supabase.ts         # Supabase client başlatma
│   │   ├── types.ts            # TypeScript tip tanımları
│   │   └── vite-env.d.ts
│   ├── index.html
│   ├── .env.example            # Ortam değişkeni şablonu
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

## ⚙️ Teknoloji Yığını

| Katman | Teknoloji |
|---|---|
| Backend | FastAPI 0.115, SQLAlchemy 2.0, Pydantic v2 |
| Veritabanı | PostgreSQL (Supabase) |
| Kimlik Doğrulama | Supabase Auth + JWT (python-jose) |
| Frontend | React 18, TypeScript, Vite 6 |
| Gerçek Zamanlı | Supabase Realtime |
| UI İkonları | Lucide React |
| Routing | React Router DOM v7 |

---

## 🔐 Rol Sistemi (RBAC)

| Rol | Açıklama |
|---|---|
| `SUPER_ADMIN` | Tüm şirket ve kullanıcılara tam erişim |
| `CATERING_ADMIN` | Kendi şirketi kapsamında tam yönetim |
| `UNIVERSITY_ADMIN` | Kendi üniversitesi kapsamında yönetim |
| `DIETITIAN` | Menü görüntüleme ve raporlama |
| `WAREHOUSE_STAFF` | Depo ve stok işlemleri |
| `PURCHASING_STAFF` | Satın alma işlemleri |

Tüm yetki kontrolleri **backend'de** FastAPI bağımlılıkları (`Depends`) aracılığıyla uygulanır.

---

## 🚀 Kurulum & Çalıştırma

### Gereksinimler

- Python 3.11+
- Node.js 18+
- Bir Supabase projesi

---

### 1. Backend

```bash
cd backend

# Sanal ortam oluştur & aktive et
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # Linux/macOS

# Bağımlılıkları yükle
pip install -r requirements.txt

# Ortam değişkenlerini yapılandır
cp .env.example .env
# .env dosyasını düzenleyerek kendi değerlerinizi girin

# Sunucuyu başlat
uvicorn app.main:app --reload --port 8000
```

Uygulama başladığında tablolar otomatik oluşturulur ve örnek veriler eklenir.

API dokümantasyonu: http://localhost:8000/docs

---

### 2. Frontend

```bash
cd frontend

# Bağımlılıkları yükle
npm install

# Ortam değişkenlerini yapılandır
cp .env.example .env
# .env dosyasını düzenleyerek kendi değerlerinizi girin

# Geliştirme sunucusunu başlat
npm run dev
```



## 📡 API Endpoint Özeti

| Method | Endpoint | Açıklama |
|---|---|---|
| POST | `/api/auth/login` | Kullanıcı girişi |
| GET | `/api/dashboard` | İstatistik özeti |
| GET/POST | `/api/companies` | Şirket listesi / oluşturma |
| GET/PUT/DELETE | `/api/companies/{id}` | Şirket detay yönetimi |
| GET/POST | `/api/universities` | Üniversite listesi / oluşturma |
| GET/PUT/DELETE | `/api/universities/{id}` | Üniversite detay yönetimi |
| GET/POST | `/api/users` | Kullanıcı listesi / oluşturma |
| GET/PUT/DELETE | `/api/users/{id}` | Kullanıcı detay & rol yönetimi |
| GET/POST | `/api/menu-assignments` | Menü atama listesi / oluşturma |
| GET/PUT/DELETE | `/api/menu-assignments/{id}` | Menü atama yönetimi |
| GET | `/health` | Sunucu sağlık kontrolü |

---

## 🏗️ Mimari Notlar

- **Multi-tenancy**: Her kullanıcı `company_id` ile şirketine bağlıdır. Tüm sorgular otomatik olarak kiracı kapsamında filtrelenir.
- **Lisans Yönetimi**: Her şirketin maksimum üniversite ve kullanıcı sayısını sınırlayan lisans kaydı bulunur.
- **Hata İşleme**: Frontend'deki `api.ts` modülü FastAPI'nin döndürdüğü hata mesajlarını (string, dizi veya obje) okunabilir forma dönüştürür.
- **Gerçek Zamanlı Güncellemeler**: Supabase Realtime ile tablo değişiklikleri anlık olarak yansıtılır.
