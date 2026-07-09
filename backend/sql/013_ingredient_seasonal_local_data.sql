-- Epic 10: Mevcut malzemelere mevsimsellik, yerellik ve piyasa fiyatı verileri
-- Bu sorgu mevcut ingredients tablosundaki yeni alanları (is_local, origin_region,
-- season_start_month, season_end_month, market_price, last_price_checked_at) doldurur.
-- season_start_month > season_end_month olan kayıtlar yıl sonu geçişli (örn. 11→3 kış) olarak
-- backend tarafından doğru yorumlanmaktadır.

-- ─── Sebzeler ────────────────────────────────────────────────────────────────

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Çanakkale / Bursa / Antalya',
  season_start_month = 6,
  season_end_month   = 9,
  market_price = price * 1.25,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Domates';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Antalya / İzmir',
  season_start_month = 5,
  season_end_month   = 9,
  market_price = price * 1.20,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Salatalık';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Antalya / İzmir / Bursa',
  season_start_month = 5,
  season_end_month   = 9,
  market_price = price * 1.22,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Kabak';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Bursa / İzmir / Sakarya',
  season_start_month = 10,
  season_end_month   = 4,
  market_price = price * 1.18,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Ispanak';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Konya / Bursa / Eskişehir',
  season_start_month = 3,
  season_end_month   = 11,
  market_price = price * 1.15,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Havuç';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Niğde / Nevşehir / Afyonkarahisar',
  season_start_month = 3,
  season_end_month   = 11,
  market_price = price * 1.20,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Patates';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Bursa / Eskişehir / Konya',
  season_start_month = 4,
  season_end_month   = 10,
  market_price = price * 1.12,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Soğan';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Kastamonu (Taşköprü) / Karabük',
  season_start_month = 6,
  season_end_month   = 10,
  market_price = price * 1.20,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Sarımsak';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Ege / Akdeniz (İzmir / Antalya)',
  season_start_month = 3,
  season_end_month   = 6,
  market_price = price * 1.15,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Marul';

-- ─── Meyveler ────────────────────────────────────────────────────────────────

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Isparta / Karaman / Amasya',
  season_start_month = 8,
  season_end_month   = 11,
  market_price = price * 1.18,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Elma';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Adana / Mersin / Antalya',
  season_start_month = 11,
  season_end_month   = 3,
  market_price = price * 1.22,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Portakal';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Adana / Mersin / Antalya',
  season_start_month = 10,
  season_end_month   = 4,
  market_price = price * 1.25,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Limon';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Alanya / Antalya (yerli muz)',
  season_start_month = 1,
  season_end_month   = 12,
  market_price = price * 1.15,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Muz';

-- ─── Bakliyat ve tahıllar ─────────────────────────────────────────────────────

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Bursa / Kastamonu / Düzce',
  season_start_month = 3,
  season_end_month   = 10,
  market_price = price * 1.18,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Kuru Fasulye';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Çorum / Eskişehir / Konya',
  season_start_month = 3,
  season_end_month   = 10,
  market_price = price * 1.15,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Nohut';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Erzincan / Malatya / Elazığ',
  season_start_month = 1,
  season_end_month   = 12,
  market_price = price * 1.15,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Kırmızı Mercimek';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Güneydoğu Anadolu (Gaziantep / Şanlıurfa)',
  season_start_month = 1,
  season_end_month   = 12,
  market_price = price * 1.12,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Bulgur';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'İç Anadolu (Konya / Eskişehir / Ankara)',
  season_start_month = 1,
  season_end_month   = 12,
  market_price = price * 1.10,
  last_price_checked_at = CURRENT_DATE
WHERE name IN ('Pirinç', 'Makarna', 'Un', 'İrmik');

-- ─── Yağlar ──────────────────────────────────────────────────────────────────

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Ege Bölgesi (İzmir / Aydın / Muğla / Balıkesir)',
  season_start_month = 10,
  season_end_month   = 1,
  market_price = price * 1.15,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Zeytinyağı';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'İç Anadolu / Trakya (yerli üretim)',
  market_price = price * 1.10,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Ayçiçek Yağı';

-- ─── Hayvansal ürünler ────────────────────────────────────────────────────────

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Yerli çiftlik ürünü',
  market_price = price * 1.10,
  last_price_checked_at = CURRENT_DATE
WHERE name IN ('Yumurta', 'Süt', 'Yoğurt', 'Tereyağı');

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Yerli kümes hayvanları',
  market_price = price * 1.12,
  last_price_checked_at = CURRENT_DATE
WHERE name IN ('Tavuk Göğsü', 'Tavuk But');

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Yerli kasap / mezbaha',
  market_price = price * 1.12,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Kıyma';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Yerli mandıra (Ege / Trakya)',
  market_price = price * 1.10,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Kaşar Peyniri';

-- ─── Diğer / işlenmiş ────────────────────────────────────────────────────────

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Yerli domates işleme tesisi',
  market_price = price * 1.10,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Salça';

UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Tokat / Kütahya / Giresun',
  season_start_month = 9,
  season_end_month   = 12,
  market_price = price * 1.20,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Ceviz';

-- Yufka, Tuz, Şeker — işlenmiş/paketli; yerel olarak işaretlenebilir ama mevsim yok
UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Yerli üretim',
  market_price = price * 1.08,
  last_price_checked_at = CURRENT_DATE
WHERE name IN ('Yufka', 'Tuz', 'Şeker');

-- Nane (Kuru): Ege kökenli
UPDATE public.ingredients SET
  is_local = true,
  origin_region = 'Ege / Akdeniz',
  season_start_month = 5,
  season_end_month   = 9,
  market_price = price * 1.15,
  last_price_checked_at = CURRENT_DATE
WHERE name = 'Nane (Kuru)';
