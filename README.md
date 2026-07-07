# YemekhanAI – Üniversite Beslenme ve Sürdürülebilirlik Yönetim Sistemi

> Yapay zeka destekli karar destek sistemi ile üniversite yemekhanelerinde menü planlama, stok yönetimi, öğrenci katılımı ve sürdürülebilirlik analizlerini destekleyen entegre bir platform.

---

# 📑 Proje Hakkında

## 👥 Takım Üyeleri (Takım 1)

| Profil | İsim | Rol | Socials |
| :---: | :--- | :--- | :---: |
| <a href="https://github.com/mertucan" target="_blank"><img src="https://github.com/mertucan.png" width="50"></a> | **Mert Uçan** | Product Owner | <a href="https://www.linkedin.com/in/mertucan/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |
| <a href="https://github.com/Fatmaa35" target="_blank"><img src="https://github.com/Fatmaa35.png" width="50"></a> | **Fatma Kaplan** | Scrum Master | <a href="https://www.linkedin.com/in/fatma-kaplan-462499313/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |
| <a href="https://github.com/barisuyumaz" target="_blank"><img src="https://github.com/barisuyumaz.png" width="50"></a> | **Barış Uyumaz** | Developer | <a href="https://www.linkedin.com/in/barisuyumaz/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |
| <a href="https://github.com/sudenazkalaycik" target="_blank"><img src="https://github.com/sudenazkalaycik.png" width="50"></a> | **Sudenaz Kalaycık** | Developer | <a href="https://www.linkedin.com/in/sudenazkalaycik/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |
| <a href="https://github.com/sevvalozer" target="_blank"><img src="https://github.com/sevvalozer.png" width="50"></a> | **Şevval Özer** | Developer | <a href="https://www.linkedin.com/in/sevval-ozer/" target="_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png" width="35" alt="LinkedIn"></a> |

---

# 💡 Ürün Adı

**YemekhanAI**

---

# 📝 Proje Tanımı

YemekhanAI, üniversite yemekhanelerinin operasyonel süreçlerini veri odaklı yöntemlerle desteklemek amacıyla geliştirilen yapay zeka tabanlı bir karar destek sistemidir.

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
- Öğrenciler
- Akademik ve idari personel

---

# 📋 Product Backlog

Proje kapsamında kullanıcı hikâyeleri (User Stories) önceliklendirilmiş ve geliştirme süreci üç sprint olacak şekilde planlanmıştır. Sprint kapsamları, ürünün Minimum Viable Product (MVP) hedefleri ve takımın geliştirme kapasitesi dikkate alınarak Story Point tahminleri ile belirlenmiştir.

| Sprint | Hedeflenen Story Point |
| :----- | :--------------------: |
| Sprint 1 | 50 |
| Sprint 2 | 100 |
| Sprint 3 | 100 |

Toplam proje kapsamı **250 Story Point** olarak planlanmıştır. Sprint 1'de temel sistem mimarisinin oluşturulması, veritabanı tasarımı ve çekirdek modüllerin geliştirilmesi hedeflenirken, Sprint 2 ve Sprint 3'te yapay zekâ destekli analizler ve sistemin tamamlayıcı özelliklerinin geliştirilmesi planlanmaktadır.

🔗 **[Sprint 1 Trello Board](https://trello.com/invite/b/6a39b01ac7486cd960963d06/ATTI61c96b260ca26974531643958cc5a9d3E8F8A550/bootcamp1st-sprint)**

<a href="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/27.png" target="_blank">
  <img src="https://raw.githubusercontent.com/Fatmaa35/YZTA-Team1/main/bootcampFiles/sprintOne/boardUpdate/27.png" alt="Sprint 1 Trello Board">
</a>

---

# 🔄 Sprint 1

## Sprint Notları

Sprint 1 kapsamında;

- Takım üyeleri ve görev dağılımları belirlenmiştir.
- Farklı proje fikirleri değerlendirilmiştir.
- Veri erişilebilirliği ve uygulanabilirlik analizleri yapılmıştır.
- Kampüs beslenme yönetimi problemi MVP olarak seçilmiştir.
- Ürün ismi **YemekhanAI** olarak belirlenmiştir.
- Sistem mimarisi planlanmıştır.
- Kullanılacak teknolojiler belirlenmiştir.

---

## Product Backlog Düzeni

Sprint 1 kapsamında proje için User Stories belirlenmiş, önceliklendirilmiş ve geliştirme görevlerine ayrılmıştır. Sprint planlamasında 50 Story Point hedeflenmiş olmakla birlikte, proje fikrinin belirlenmesi, gereksinim analizi ve sistem mimarisinin oluşturulması süreçlerinin Sprint 1 içerisinde tamamlanması nedeniyle 26 kullanıcı hikâyesi backlog'a eklenmiştir. Kalan kullanıcı hikâyelerinin Sprint 2 kapsamında oluşturulması ve geliştirme sürecine dahil edilmesi planlanmaktadır.

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
<summary>Güncellemeler</summary>

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

---

# 📌 Sprint 2

Sprint 2 süreci tamamlandıktan sonra bu bölüm güncellenecektir.

---

# 📌 Sprint 3

Sprint 3 süreci ve proje teslimine ilişkin bilgiler sprint sonunda eklenecektir.

---

# 📄 Lisans

Bu proje **YZTA Bootcamp 2026** kapsamında eğitim ve geliştirme amacıyla hazırlanmıştır.
