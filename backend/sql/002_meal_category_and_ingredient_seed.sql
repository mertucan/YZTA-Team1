-- Yemekler tablosuna kategori alanı (Çorba, Ana Yemek, Ara Sıcak, Tahıl (Pilav/Makarna), Yoğurt/Salata, Tatlı/Meyve)
alter table meals
  add column if not exists category varchar(40) not null default 'Ana Yemek';

-- Kategori bazlı eksik malzemeler + tuz/şeker
-- calories/protein/iron değerleri 100g/100ml başınadır (mevcut verilerle aynı ölçek mantığı)
insert into ingredients (name, unit, stock, calories, protein, iron, price, expiry_date)
select v.name, v.unit, v.stock, v.calories, v.protein, v.iron, v.price, null
from (values
  -- Genel / her yemekte kullanılan temel malzemeler
  ('Tuz',            'kg',    100, 0,   0,    0,    15),
  ('Şeker',          'kg',    80,  387, 0,    0,    40),
  ('Un',             'kg',    100, 364, 10,   1.2,  22),
  ('Tereyağı',       'kg',    15,  717, 0.9,  0,    350),
  ('Sarımsak',       'kg',    10,  149, 6.4,  1.7,  90),
  ('Salça',          'kg',    25,  82,  4.3,  2.0,  60),
  -- Çorba
  ('Nane (Kuru)',    'kg',    3,   285, 20.8, 11.9, 400),
  -- Ara Sıcak
  ('Yumurta',        'adet',  300, 78,  6.3,  0.9,  3.5),
  ('Kaşar Peyniri',  'kg',    20,  380, 25,   0.8,  280),
  ('Yufka',          'paket', 40,  275, 7,    1.5,  18),
  -- Tahıl (Pilav/Makarna)
  ('Bulgur',         'kg',    60,  342, 12.3, 2.5,  30),
  -- Yoğurt/Salata
  ('Salatalık',      'kg',    25,  15,  0.7,  0.3,  18),
  ('Marul',          'kg',    15,  15,  1.4,  0.9,  20),
  ('Zeytinyağı',     'lt',    20,  884, 0,    0.6,  180),
  ('Limon',          'kg',    15,  29,  1.1,  0.6,  25),
  -- Tatlı/Meyve
  ('Elma',           'kg',    40,  52,  0.3,  0.1,  25),
  ('Muz',            'kg',    30,  89,  1.1,  0.3,  35),
  ('Portakal',       'kg',    40,  47,  0.9,  0.1,  22),
  ('Süt',            'lt',    60,  61,  3.2,  0,    28),
  ('İrmik',          'kg',    20,  360, 12.7, 1.2,  26)
) as v(name, unit, stock, calories, protein, iron, price)
where not exists (
  select 1 from ingredients i where i.name = v.name
);
