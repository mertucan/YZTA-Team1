# TabloDot – Üniversite Beslenme ve Sürdürülebilirlik Yönetim Sistemi

> Yapay zeka destekli karar destek sistemi ile üniversite yemekhanelerinde menü planlama, stok yönetimi, öğrenci katılımı ve sürdürülebilirlik analizlerini destekleyen entegre bir platform.

---

# 📑 Proje Hakkında

## 👥 Takım Üyeleri (Takım 1)

| Profil | İsim | Rol | Socials |
| :---: | :--- | :--- | :---: |
| <a href="https://github.com/mertucan" target="_blank" rel="noopener noreferrer"><img src="https://github.com/mertucan.png" width="50"></a> | **Mert Uçan** | Product Owner | <a href="https://www.linkedin.com/in/mertucan/" target="_blank" rel="noopener noreferrer"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |
| <a href="https://github.com/Fatmaa35" target="_blank" rel="noopener noreferrer"><img src="https://github.com/Fatmaa35.png" width="50"></a> | **Fatma Kaplan** | Scrum Master | <a href="https://www.linkedin.com/in/fatma-kaplan-462499313/" target="_blank" rel="noopener noreferrer"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |
| <a href="https://github.com/barisuyumaz" target="_blank" rel="noopener noreferrer"><img src="https://github.com/barisuyumaz.png" width="50"></a> | **Barış Uyumaz** | Developer | <a href="https://www.linkedin.com/in/barisuyumaz/" target="_blank" rel="noopener noreferrer"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |
| <a href="https://github.com/sudenazkalaycik" target="_blank" rel="noopener noreferrer"><img src="https://github.com/sudenazkalaycik.png" width="50"></a> | **Sudenaz Kalaycık** | Developer | <a href="https://www.linkedin.com/in/sudenazkalaycik/" target="_blank" rel="noopener noreferrer"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |
| <a href="https://github.com/sevvalozer" target="_blank" rel="noopener noreferrer"><img src="https://github.com/sevvalozer.png" width="50"></a> | **Şevval Özer** | Developer | <a href="https://www.linkedin.com/in/sevval-ozer/" target="_blank" rel="noopener noreferrer"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |

---

<h1 align="center">TabloDot</h1>

<p align="center">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/logo.png" alt="TabloDot Logo" width="220">
</p>


# 🔗 Proje Repoları

> **Canlı Demo:** [https://tablodot.onrender.com/](https://tablodot.onrender.com/)

| Bölüm | Repository |
| :--- | :--- |
| **Web Uygulaması** | [mertucan/YZTA-Team1](https://github.com/mertucan/YZTA-Team1) |
| **Mobil Uygulama** | [sudenazkalaycik/YZA-Team1-TabloDot](https://github.com/sudenazkalaycik/YZA-Team1-TabloDot) |

> Web ve mobil geliştirme süreçleri ayrı GitHub repoları üzerinden yürütülmektedir.

---

# 🚀 Projeyi Çalıştırma

Bu repo içerisinde web uygulaması backend ve frontend klasörleri altında yer almaktadır.

## Web Uygulaması

Web projesinde backend FastAPI, frontend ise React/Vite ile geliştirilmiştir.

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Backend varsayılan olarak `http://127.0.0.1:8000` adresinde çalışır.

### Frontend

Yeni bir terminal açarak:

```bash
cd frontend
npm install
npm run dev
```

Frontend varsayılan olarak Vite tarafından verilen local adreste çalışır. Genellikle:

```text
http://localhost:5173
```

---

# 📝 Proje Tanımı

TabloDot, üniversite yemekhanelerinin operasyonel süreçlerini veri odaklı yöntemlerle desteklemek amacıyla geliştirilen yapay zeka tabanlı bir karar destek sistemidir.

Proje kapsamında farklı problem alanları değerlendirilmiş; veri erişilebilirliği, uygulanabilirlik ve teknik gerçekleştirilebilirlik kriterleri doğrultusunda kampüs beslenme yönetimi problemi Minimum Viable Product (MVP) olarak belirlenmiştir.

Sistemin temel amacı;

- Yemek menülerinin planlanmasını desteklemek,
- Malzeme ve stok yönetimini kolaylaştırmak,
- Öğrenci katılım verilerini analiz ederek israfı azaltmak,
- Menülerin beslenme değerlerini değerlendirmek,
- Karbon ayak izi analizleri ile sürdürülebilir karar alma süreçlerine katkı sağlamaktır.

---

# 🎯 Proje Amaçları

- Üniversite yemekhanelerinde operasyonel verimliliğin artırılması
- Gıda israfının azaltılması
- Menü planlamasında veri odaklı kararların desteklenmesi
- Sağlıklı beslenme kriterlerinin izlenmesi
- Karbon ayak izinin ölçülmesi ve azaltılmasına yönelik analizlerin sunulması

---

# 🛠️ Kullanılan Teknolojiler

## Frontend

- React.js
- Vite
- Axios

## Mobil Uygulama

- Mobil uygulama geliştirme süreci ayrı bir repo üzerinden yürütülmektedir: [sudenazkalaycik/YZA-Team1-TabloDot](https://github.com/sudenazkalaycik/YZA-Team1-TabloDot)

## Backend

- FastAPI (Python)

## Veritabanı Diyagramı

- Supabase (PostgreSQL)

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/database-schemaDiagram.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/database-schemaDiagram.png" alt="Database Schema Diagram">
</a>

## Yapay Zeka

- Google Gemini API

---

# 📦 Proje Modülleri

## 📊 Dashboard

Sistemde yer alan temel operasyonel göstergelerin tek panel üzerinden izlenmesini sağlar.

Bu modülde;

- Günlük aktif öğrenci sayısı
- Malzeme stok durumu
- Haftalık özet istatistikler
- Temel performans göstergeleri

sunulmaktadır.

---

## 🍽️ Menü ve Malzeme Yönetimi

Menülerin ve menülerde kullanılan malzemelerin yönetildiği modüldür.

Başlıca özellikleri:

- Menü oluşturma
- Menü güncelleme
- Malzeme yönetimi
- Stok takibi
- Tedarik bilgilerinin yönetimi

---

## 👥 Öğrenci ve Devamsızlık Yönetimi

Öğrencilerin yemekhane kullanım verileri kayıt altına alınmaktadır.

Bu veriler ilerleyen aşamalarda;

- Talep tahmini
- Menü optimizasyonu
- Gıda israfı analizleri

için kullanılacaktır.

---

## 🩺 Sağlık Analizi

Hazırlanan menülerin beslenme açısından değerlendirilmesini sağlayan modüldür.

Analiz edilen bilgiler;

- Kalori
- Protein
- Karbonhidrat
- Yağ
- Alerjen bilgileri
- Genel beslenme uygunluğu

---

## 🌱 Sürdürülebilirlik Analizi

Bu modül menülerin çevresel etkilerini değerlendirmektedir.

Kapsamında;

- Menü karbon ayak izi hesaplama
- Emisyon kaynaklarının analizi
- Menü değişikliklerinin karbon etkisinin simülasyonu
- Sürdürülebilirlik puanı oluşturulması

bulunmaktadır.

---

# 🎯 Hedef Kullanıcılar

- Üniversite yemekhane yöneticileri
- Satın alma birimleri
- Üniversite yönetimleri
- Akademik ve idari personel
- Öğrenciler

---

# 📋 Product Backlog

Proje kapsamında kullanıcı hikayeleri (User Stories) önceliklendirilmiş ve geliştirme süreci üç sprint olacak şekilde planlanmıştır. Sprint kapsamları, ürünün Minimum Viable Product (MVP) hedefleri ve takımın geliştirme kapasitesi dikkate alınarak Story Point tahminleri ile belirlenmiştir.

| Sprint | Hedeflenen Story Point |
| :----- | :--------------------: |
| Sprint 1 | 50 |
| Sprint 2 | 100 |
| Sprint 3 | 100 |

Toplam proje kapsamı **250 Story Point** olarak planlanmıştır. Sprint 1'de temel sistem mimarisinin oluşturulması, veritabanı tasarımı ve çekirdek modüllerin geliştirilmesi hedeflenirken, Sprint 2 ve Sprint 3'te yapay zeka destekli analizler ve sistemin tamamlayıcı özelliklerinin geliştirilmesi planlanmaktadır.

🔗 **[Sprint 1 Trello Board](https://trello.com/invite/b/6a39b01ac7486cd960963d06/ATTI61c96b260ca26974531643958cc5a9d3E8F8A550/bootcamp1st-sprint)**

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/27.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/27.png" alt="Sprint 1 Trello Board">
</a>

🔗 **[Sprint 2 Trello Board](https://trello.com/invite/b/6a4d297105582150ec6b151f/ATTI531ec30d84b283d268e2386c35c0979a7105D64C/bootcamp-2st-sprint)**

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/9.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/9.png" alt="Sprint 2 Trello Board">
</a>

🔗 **[Sprint 3 Trello Board](https://trello.com/invite/b/6a5ccab705cc382bde8836ff/ATTI419394473d4451ceb0a807d70ee7f40dCD146952/bootcamp-3st-sprint)**

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/10.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/10.png" alt="Sprint 3 Trello Board">
</a>

---

<details>
<summary><h1><strong> Sprint 1</strong></h1></summary>

## Sprint Notları

Sprint 1 kapsamında;

- Takım üyeleri ve görev dağılımları belirlenmiştir.
- Farklı proje fikirleri değerlendirilmiştir.
- Veri erişilebilirliği ve uygulanabilirlik analizleri yapılmıştır.
- Kampüs beslenme yönetimi problemi MVP olarak seçilmiştir.
- Ürün ismi **TabloDot** olarak belirlenmiştir.
- Sistem mimarisi planlanmıştır.
- Kullanılacak teknolojiler belirlenmiştir.

---

## Product Backlog Düzeni

Sprint 1 kapsamında proje için User Stories belirlenmiş, önceliklendirilmiş ve geliştirme görevlerine ayrılmıştır. Sprint planlamasında 50 Story Point hedeflenmiş olmakla birlikte, proje fikrinin belirlenmesi, gereksinim analizi ve sistem mimarisinin oluşturulması süreçlerinin Sprint 1 içerisinde tamamlanması nedeniyle 26 kullanıcı hikayesi backlog'a eklenmiştir. Kalan kullanıcı hikayelerinin Sprint 2 kapsamında oluşturulması ve geliştirme sürecine dahil edilmesi planlanmaktadır.

---

## Daily Scrum

Takım içi günlük iletişim ve ilerleme takibi Slack ve WhatsApp üzerinden asenkron olarak yürütülmektedir.

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/1.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/1.png" alt="Daily Scrum Toplantı 1">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/toplanti1.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/toplanti1.png" alt="Daily Scrum Toplantı 2">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/toplanti2.jpeg" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/toplanti2.jpeg" alt="Daily Scrum Toplantı 3">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/toplanti3.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/toplanti3.png" alt="Daily Scrum Toplantı 4">
</a>

---

## Sprint Board Update

Sprint planlaması ve görev takibi Trello üzerinden yürütülmektedir.

<details>
<summary><strong>Güncellemeler</strong></summary>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/2.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/2.png" alt="Sprint Board Update 2">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/3.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/3.png" alt="Sprint Board Update 3">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/4.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/4.png" alt="Sprint Board Update 4">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/5.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/5.png" alt="Sprint Board Update 5">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/6.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/6.png" alt="Sprint Board Update 6">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/21.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/21.png" alt="Sprint Board Update 21">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/22.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/22.png" alt="Sprint Board Update 22">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/24.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/24.png" alt="Sprint Board Update 24">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/26.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/26.png" alt="Sprint Board Update 26">
</a>

</details>

---

## Ürün Durumu

Sprint 1 sonunda;

- Sistem mimarisi oluşturulmuştur.
- Supabase veritabanı tasarlanmıştır.
- Backend temel yapısı geliştirilmiştir.
- Frontend proje yapısı oluşturulmuştur.
- Dashboard modülünün geliştirilmesine başlanmıştır.
- Menü ve Malzeme Yönetimi modülünün ilk sürümü geliştirilmiştir.
- Frontend ve Backend entegrasyonunun ilk aşaması tamamlanmıştır.
- Sürdürülebilirlik modülü için veri modeli ve analiz yaklaşımı planlanmıştır.

---

## Sprint Review

Sprint sonunda gerçekleştirilen değerlendirme toplantısında;

- Sprint hedeflerinin büyük ölçüde tamamlandığı değerlendirilmiştir.
- Kullanıcı verilerinin yönetimine yönelik ek geliştirmelerin ilerleyen sprintlerde ele alınmasına karar verilmiştir.
- Geliştirilen modüllerin temel fonksiyon testlerinde kritik seviyede bir hata tespit edilmemiştir.
- Sprint hedefleri doğrultusunda ikinci sprintte yapay zeka destekli analiz modüllerinin geliştirilmesine başlanması planlanmıştır.

### Katılımcılar

- Fatma Kaplan
- Mert Uçan
- Barış Uyumaz
- Sudenaz Kalaycık
- Şevval Özer

---

## Sprint Retrospective

Sprint sonunda aşağıdaki kararlar alınmıştır.

- Görev dağılımlarının netleştirilmesine
- Story Point tahminlerinin daha ayrıntılı yapılmasına
- Kod kalitesini artırmak amacıyla test süreçlerine daha fazla zaman ayrılmasına
- Backend ve Frontend entegrasyonunun daha sık test edilmesine
- Sprint boyunca Trello ve Slack kullanımının düzenli şekilde sürdürülmesine

karar verilmiştir.

</details>

---

<details>
<summary><h1><strong> Sprint 2</strong></h1></summary>

## Sprint Notları

Sprint 2 kapsamında;

- Sprint 1 sonunda oluşturulan temel sistem mimarisi üzerinden geliştirme süreci ilerletilmiştir.
- Trello üzerinde Sprint 2 görevleri planlanmış ve takım içi görev takibi düzenli olarak güncellenmiştir.
- Yapay zeka destekli sürdürülebilirlik ve beslenme analizi çıktıları için raporlama çalışmaları yapılmıştır.
- Yemekhane tüketim, obezite ve beslenme ilişkisini inceleyen analiz raporu hazırlanmıştır.
- Ürün arayüzü için ekran görüntüleri ve modül çıktıları dokümantasyon sürecine eklenmiştir.
- Sprint sürecinde takım toplantıları Meets üzerinden yürütülmüş ve ilerleme kayıt altına alınmıştır.
- 2.Sprint kapsamında toplam 144 Story Point tamamlanmıştır. Ekibimiz, 1. Sprint'e kıyasla daha yüksek bir çalışma temposu sergileyerek planlanan hedefin üzerinde bir tamamlanma performansı göstermiştir.
- TabloDot projemizi destekleyecek mobil uygulamanın geliştirme süreci, kod yönetimi ve sürüm takibinin daha düzenli yürütülebilmesi amacıyla mobil uygulama için ayrı bir GitHub deposu oluşturulmuştur: [sudenazkalaycik/YZA-Team1-TabloDot](https://github.com/sudenazkalaycik/YZA-Team1-TabloDot)

---

## Product Backlog Düzeni

Sprint 2 kapsamında Sprint 1'de oluşturulan backlog yapısı genişletilmiş, yapay zeka destekli analizler, raporlama çıktıları ve ürün dokümantasyonu önceliklendirilmiştir. Sprint planlamasında 100 Story Point hedeflenmiş; sürdürülebilirlik analizi, beslenme değerlendirmesi, ekran çıktılarının hazırlanması ve sprint dokümantasyonunun güncellenmesi işleri geliştirme sürecine dahil edilmiştir.

---

## Daily Scrum

Takım içi günlük iletişim ve ilerleme takibi Whatsapp ve Meets üzerinden asenkron olarak yürütülmektedir.

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/toplanti4.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/toplanti4.png" alt="Daily Scrum Toplantı 4">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/toplanti5.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/toplanti5.png" alt="Daily Scrum Toplantı 5">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/toplanti6.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/toplanti6.png" alt="Daily Scrum Toplantı 6">
</a>

---

## Sprint Board Update

Sprint planlaması ve görev takibi Trello üzerinden yürütülmektedir.

<details>
<summary><strong>Güncellemeler</strong></summary>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/1.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/1.png" alt="Sprint 2 Board Update 1">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/2.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/2.png" alt="Sprint 2 Board Update 2">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/3.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/3.png" alt="Sprint 2 Board Update 3">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/4.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/4.png" alt="Sprint 2 Board Update 4">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/5.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/5.png" alt="Sprint 2 Board Update 5">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/6.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/6.png" alt="Sprint 2 Board Update 6">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/7.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/7.png" alt="Sprint 2 Board Update 7">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/8.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/8.png" alt="Sprint 2 Board Update 8">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/9.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/BoardUpdate/9.png" alt="Sprint 2 Board Update 9">
</a>

</details>

---

## Ürün Durumu

Sprint 2 sonunda;

- Temel arayüz (Dashboard) üzerinde öğrenci sayısı, yaş grubu, bölgesel fiyat verileri ve günlük bütçe gibi menü optimizasyonunda kullanılacak parametrelerin girilebildiği yapı geliştirilmiştir.
- AI Menü Optimizasyon Motoru için Python, Gemini API ve beslenme veri tabanı yaklaşımıyla kalori, protein ve demir dengesi gözeten haftalık menü üretim mantığı kurgulanmıştır.
- Tedarikçi Fiyat Karşılaştırma modülü ile menüdeki ürünler için farklı tedarikçi fiyatlarının karşılaştırılabileceği altyapı planlanmış ve ilk akış hazırlanmıştır.
- Sürdürülebilirlik Skoru modülü ile oluşturulan menülerin karbon ayak izini hesaplayan ve raporlanabilir sürdürülebilirlik çıktısı üreten yapı Sprint 2 kapsamına alınmıştır.
- Mevsimsel Menü Önerisi modülü ile yerel ve mevsimsel sebze kullanımını artırmaya, maliyeti düşürmeye ve alternatif menü önerileri üretmeye yönelik AI destekli öneri akışı tasarlanmıştır.
- Üniversite Beslenme Kalitesi Entegrasyonu için beslenme kalitesi metriklerinin dış sistemlere ve kurumsal değerlendirme süreçlerine aktarılabilmesini hedefleyen veri aktarım yapısı planlanmıştır.
- Akademik Veri Analizi kapsamında araştırmacılar için toplu ve anonimleştirilmiş beslenme verilerinin dışa aktarılmasına yönelik export ihtiyacı tanımlanmıştır.
- Sağlık Risk Analizi modülü ile anonimleştirilmiş beslenme verileri üzerinden obezite ve anemi gibi sağlık risklerinin istatistiksel olarak incelenmesine yönelik analiz yaklaşımı hazırlanmıştır.
- Partner Firma Paneli ile sağlıklı ürün sağlayan firmaların ürünlerini doğrudan reçete ve menü önerilerine entegre edebilmesine yönelik iş modeli ve ürün akışı tanımlanmıştır.
- Yemekhane tüketimi, obezite ve beslenme korelasyonuna ilişkin PDF raporu hazırlanmış; Sprint 2 ürün ekran görüntüleri `bootcampFiles/sprintTwo/screenshots` klasöründe toplanmıştır.

<details>
<summary><strong>Ürün Görselleri</strong></summary>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/9.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/9.png" alt="Sprint 2 Ürün Görseli 9">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/10.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/10.png" alt="Sprint 2 Ürün Görseli 10">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/11.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/11.png" alt="Sprint 2 Ürün Görseli 11">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/12.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/12.png" alt="Sprint 2 Ürün Görseli 12">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/13.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/13.png" alt="Sprint 2 Ürün Görseli 13">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/14.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/14.png" alt="Sprint 2 Ürün Görseli 14">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/15.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/15.png" alt="Sprint 2 Ürün Görseli 15">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/16.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/16.png" alt="Sprint 2 Ürün Görseli 16">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/17.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/17.png" alt="Sprint 2 Ürün Görseli 17">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/18.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/18.png" alt="Sprint 2 Ürün Görseli 18">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/19.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/19.png" alt="Sprint 2 Ürün Görseli 19">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/20.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/20.png" alt="Sprint 2 Ürün Görseli 20">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/21.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/21.png" alt="Sprint 2 Ürün Görseli 21">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/22.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/22.png" alt="Sprint 2 Ürün Görseli 22">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/23.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/23.png" alt="Sprint 2 Ürün Görseli 23">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/24.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/24.png" alt="Sprint 2 Ürün Görseli 24">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/25.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/25.png" alt="Sprint 2 Ürün Görseli 25">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/26.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/26.png" alt="Sprint 2 Ürün Görseli 26">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/27.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/27.png" alt="Sprint 2 Ürün Görseli 27">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/28.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/28.png" alt="Sprint 2 Ürün Görseli 28">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/29.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/29.png" alt="Sprint 2 Ürün Görseli 29">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/30.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintTwo/screenshots/30.png" alt="Sprint 2 Ürün Görseli 30">
</a>

</details>

---

## Sprint Review

Sprint sonunda gerçekleştirilen değerlendirme toplantısında;

- Sprint 2 kapsamında hedeflenen dokümantasyon ve board güncellemelerinin tamamlandığı değerlendirilmiştir.
- Yapay zeka destekli analiz ve raporlama çıktılarının proje hedefleriyle uyumlu ilerlediği görülmüştür.
- Ürün ekran görüntülerinin README'ye eklenecek şekilde düzenlenmesine karar verilmiştir.
- Sprint 3'te ürünün son görsel sunumu, eksik modül açıklamaları ve teslim dokümantasyonunun tamamlanması planlanmıştır.

### Katılımcılar

- Fatma Kaplan
- Mert Uçan
- Barış Uyumaz
- Sudenaz Kalaycık
- Şevval Özer

---

## Sprint Retrospective

Sprint sonunda aşağıdaki kararlar alınmıştır.

- Toplantı çıktılarının sprint klasörleri altında düzenli tutulmasına
- Board güncellemelerinin README içinde açılır kapanır menülerle sunulmasına
- Ürün ekran görüntülerinin ayrı bir görseller bölümü altında toplanmasına
- Analiz raporlarının teslim dokümantasyonunda daha görünür hale getirilmesine
- Sprint 3'te final ürün durumunun daha kısa ve net bir akışla sunulmasına
- Mobil uygulama geliştirme sürecinin Sprint 3'te [mobil uygulama reposu](https://github.com/sudenazkalaycik/YZA-Team1-TabloDot) üzerinden gerçekleştirilmesine

karar verilmiştir.

---

</details>

---

<details>
<summary><h1><strong>Sprint 3</strong></h1></summary>

## Sprint Notları

Sprint 3 kapsamında;

- Sprint 2 sonunda planlanan final ürün akışı, eksik modül açıklamaları ve teslim dokümantasyonu tamamlanmıştır.
- TabloDot'un final ürün kapsamı FastAPI backend ve React/Vite frontend üzerinden teslim edilebilir hale getirilmiştir.
- Mobil uygulama geliştirme süreci ayrı GitHub reposu üzerinden sürdürülmüş ve ana proje dokümantasyonuyla ilişkilendirilmiştir: [sudenazkalaycik/YZA-Team1-TabloDot](https://github.com/sudenazkalaycik/YZA-Team1-TabloDot)
- Ana web uygulamasında dashboard, öğrenci/devamsızlık, yemek-menü, malzeme-stok, harcama, sipariş, yapay zeka menü planlayıcı, sürdürülebilirlik skoru, sağlık risk analizi, öğrenci sağlık bayrakları, araştırma veri aktarımı, üniversite kalite entegrasyonu, partner ürünleri ve ihale/fatura yönetimi modülleri bir araya getirilmiştir.
- Google Gemini API destekli menü planlama yaklaşımı, stok gerçekliği, porsiyon, bütçe, besin değeri ve kullanıcı talimatlarını birlikte değerlendiren karar destek yapısı olarak netleştirilmiştir.
- Satın alma ve maliyet tarafında tedarikçi fiyatları, harcamalar, siparişler, ihale kayıtları ve fatura çıktıları final ürün anlatısına dahil edilmiştir.
- Sürdürülebilirlik, sağlık riski, akademik araştırma verisi ve kurumsal kalite raporlaması gibi tamamlayıcı modüller teslim kapsamının ayırt edici parçaları olarak düzenlenmiştir.
- Kullanıcıların ürünü daha hızlı anlayabilmesi için Sık Sorulan Sorular dokümanı hazırlanmıştır: [`bootcampFiles/sprintThree/SSS.md`](bootcampFiles/sprintThree/SSS.md)
- Sprint 3 board güncellemeleri, toplantı görselleri ve ürün ekran görüntüleri README içerisine eklenmiştir.
- Sprint planlaması kapsamında Bootcamp sonunda toplam **250 Story Point** tamamlanması hedeflenmiştir. Bu doğrultuda **Sprint 1'de 26 Story Point**, **Sprint 2'de 144 Story Point** ve **Sprint 3'te 80 Story Point** başarıyla tamamlanmış; böylece belirlenen **250 Story Point** hedefine ulaşılmıştır. Ekibimiz, sprintler boyunca planlanan geliştirmeleri tamamlayarak proje kapsamını başarıyla sonlandırmış ve ürünü final teslimine hazır hale getirmiştir.


---

## Product Backlog Düzeni

Sprint 3 kapsamında backlog, ürünün çalışır son halini ve teslim dokümantasyonunu tamamlamaya odaklanacak şekilde düzenlenmiştir. Ana uygulama modüllerinin entegrasyonu, catering yönetim akışı, yapay zeka destekli menü planlayıcı, sürdürülebilirlik skoru, sağlık risk analizi, öğrenci sağlık bayrakları, araştırma ve kalite export süreçleri, partner ürünleri, ihale/fatura yönetimi, SSS dokümantasyonu ve final sunum hazırlıkları önceliklendirilmiştir.

Bu sprintte geliştirme görevleri, TabloDot'un yalnızca menü planlayan bir uygulama değil; yemekhane operasyonu, karar destek, maliyet kontrolü, sağlık, sürdürülebilirlik ve kurumsal raporlama süreçlerini birlikte ele alan entegre bir platform olarak teslim edilmesi amacıyla gruplanmıştır.

---

## Daily Scrum

Takım içi günlük iletişim ve ilerleme takibi WhatsApp ve Meets üzerinden asenkron olarak yürütülmektedir.

<details>
<summary><strong>Daily Scrum Görselleri</strong></summary>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/toplanti7.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/toplanti7.png" alt="Daily Scrum Toplantı 7">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/toplanti8.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/toplanti8.png" alt="Daily Scrum Toplantı 8">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/toplanti9.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/toplanti9.png" alt="Daily Scrum Toplantı 9">
</a>

</details>

---

## Sprint Board Update

Sprint planlaması ve görev takibi Trello üzerinden yürütülmektedir.

<details>
<summary><strong>Güncellemeler</strong></summary>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/1.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/1.png" alt="Sprint 3 Board Update 1">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/2.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/2.png" alt="Sprint 3 Board Update 2">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/3.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/3.png" alt="Sprint 3 Board Update 3">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/4.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/4.png" alt="Sprint 3 Board Update 4">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/5.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/5.png" alt="Sprint 3 Board Update 5">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/6.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/6.png" alt="Sprint 3 Board Update 6">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/7.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/7.png" alt="Sprint 3 Board Update 7">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/8.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/8.png" alt="Sprint 3 Board Update 8">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/9.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/9.png" alt="Sprint 3 Board Update 9">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/10.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/BoardUpdate/10.png" alt="Sprint 3 Board Update 10">
</a>

</details>

---

## Ürün Durumu

Sprint 3 sonunda;

- Backend tarafında FastAPI tabanlı `TabloDot API` yapısı; dashboard, öğrenciler, devamsızlık, yemekler, menüler, malzemeler, siparişler, harcamalar, sürdürülebilirlik, sağlık risk analizi, öğrenci sağlık bayrakları, partner ürünleri, araştırma export'u, üniversite kalite export'u, ihale ve fatura router'larıyla genişletilmiştir.
- Frontend tarafında React/Vite uygulaması, modüler sayfa yapısıyla yönetici paneli ve karar destek ekranlarını tek arayüz altında toplamıştır.
- AI Menü Planlayıcı modülü; öğrenci sayısı, bütçe, stok, reçete, porsiyon ve besin değerlerini dikkate alan haftalık menü önerisi yaklaşımıyla final ürüne eklenmiştir.
- Malzeme ve stok tarafında parti bazlı takip, SKT bilgisi, stok gerçekliği ve menü üretimiyle ilişkili stok kontrolü ürün akışına dahil edilmiştir.
- Harcama, sipariş, tedarikçi fiyatı, ihale ve fatura yönetimiyle yemekhane operasyonunun mali boyutu daha görünür hale getirilmiştir.
- Sürdürülebilirlik Skoru modülü; menü ve malzeme bazlı karbon etkisi, yerel/mevsimsel ürün kullanımı ve raporlanabilir çevresel çıktı yaklaşımıyla teslim kapsamına alınmıştır.
- Sağlık Risk Analizi, Sağlık Takibi ve Öğrenci Sağlık Bayrakları modülleriyle beslenme, alerjen, özel ihtiyaç ve risk değerlendirme başlıkları ürün içinde görünür hale getirilmiştir.
- Research Export ve University Quality Integration modülleriyle anonimleştirilmiş akademik veri aktarımı ve kurumsal kalite göstergelerine yönelik raporlama hedefi desteklenmiştir.
- Partner Products modülüyle sağlıklı veya sürdürülebilir ürün sağlayan firmaların ürünlerinin sisteme tanıtılması ve menü önerileriyle ilişkilendirilebilmesi hedeflenmiştir.
- Catering Management modülüyle catering firmalarının şirket, üniversite, kullanıcı, rol ve menü atama süreçlerini yönetebileceği ayrı bir iş akışı oluşturulmuştur.
- SSS dokümanı ile ürünün problemi, hedef kitlesi, yapay zeka kullanımı, stok, maliyet, sağlık, sürdürülebilirlik, KVKK yaklaşımı ve başarı metrikleri açıklanmıştır.
- Mobil uygulama reposu, ana web projesini destekleyen öğrenci tarafı kullanım senaryoları için dokümantasyonda bağlantılı şekilde tutulmuştur.

<details>
<summary><strong>Ürün Görselleri</strong></summary>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/1.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/1.png" alt="Sprint 3 Ürün Görseli 1">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/2.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/2.png" alt="Sprint 3 Ürün Görseli 2">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/3.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/3.png" alt="Sprint 3 Ürün Görseli 3">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/4.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/4.png" alt="Sprint 3 Ürün Görseli 4">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/5.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/5.png" alt="Sprint 3 Ürün Görseli 5">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/6.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/6.png" alt="Sprint 3 Ürün Görseli 6">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/7.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/7.png" alt="Sprint 3 Ürün Görseli 7">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/8.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/8.png" alt="Sprint 3 Ürün Görseli 8">
</a>

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/9.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintThree/screenShots/9.png" alt="Sprint 3 Ürün Görseli 9">
</a>

</details>

---

## Sprint Review

Sprint sonunda gerçekleştirilen değerlendirme toplantısında;

- Sprint 3 kapsamında TabloDot'un final ürün teslimine uygun seviyede modüler bir web uygulaması ve API yapısına ulaştığı değerlendirilmiştir.
- Ürünün temel değer önerisinin menü planlama, stok yönetimi, maliyet kontrolü, sağlık kısıtları, sürdürülebilirlik analizi, catering operasyonları ve kurumsal raporlamayı tek platformda birleştirmesi olduğu netleştirilmiştir.
- Yapay zeka çıktılarının otomatik karar mekanizması değil, yetkili kullanıcıya öneri ve analiz sunan karar destek çıktısı olarak konumlandırılması doğru bulunmuştur.
- SSS dokümanının ürünün teknik, operasyonel ve etik/veri gizliliği yönlerini açıklamak için README'yi destekleyen ayrı bir kaynak olarak kullanılmasına karar verilmiştir.
- Final sunumunda ana web uygulaması, backend servisleri, mobil uygulama bağlantısı ve teslim dokümantasyonu birlikte ele alınacak şekilde anlatım yapılması planlanmıştır.

### Katılımcılar

- Fatma Kaplan
- Mert Uçan
- Barış Uyumaz
- Sudenaz Kalaycık
- Şevval Özer

---

## Sprint Retrospective

Sprint sonunda aşağıdaki kararlar alınmıştır.

- Ürün dokümantasyonunun Sprint 1, Sprint 2 ve Sprint 3 için aynı başlık düzeninde tutulmasına
- Görsel içeriklerin README içerisinde ilgili sprint başlıkları altında toplanmasına
- SSS dokümanının proje tesliminde destekleyici kaynak olarak kullanılmasına
- Mobil uygulama ve ana web projesi arasındaki bağlantının README'de açık şekilde gösterilmesine
- Final ürün sunumunda operasyonel fayda, maliyet kontrolü, sürdürülebilirlik etkisi, sağlık uygunluğu ve ölçülebilir başarı metriklerinin öne çıkarılmasına,
- Projenin sprintler boyunca geliştirilen tüm modüllerinin entegre edilerek final teslimine hazır hale getirilmesine

karar verilmiştir.

</details>

---

# 📄 Lisans

Bu proje **YZTA Bootcamp 2026** kapsamında eğitim ve geliştirme amacıyla hazırlanmıştır.
