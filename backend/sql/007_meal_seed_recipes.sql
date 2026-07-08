-- Yeni yemekler (mevcut 9 + bu dosyadaki 15 = kategori başına 4 yemek)
insert into meals (name, category, portions)
select v.name, v.category, 40
from (values
  ('Ezogelin Çorbası',   'Çorba'),
  ('Fırın Tavuk But',    'Ana Yemek'),
  ('Kuru Fasulye',       'Ana Yemek'),
  ('Sigara Böreği',      'Ara Sıcak'),
  ('Kaşarlı Tost',       'Ara Sıcak'),
  ('Mücver',             'Ara Sıcak'),
  ('Haşlanmış Yumurta',  'Ara Sıcak'),
  ('Bulgur Pilavı',      'Tahıl (Pilav/Makarna)'),
  ('Cacık',              'Yoğurt/Salata'),
  ('Çoban Salata',       'Yoğurt/Salata'),
  ('Havuç Salatası',     'Yoğurt/Salata'),
  ('Sütlaç',             'Tatlı/Meyve'),
  ('İrmik Helvası',      'Tatlı/Meyve'),
  ('Meyve Tabağı',       'Tatlı/Meyve'),
  ('Muhallebi',          'Tatlı/Meyve')
) as v(name, category)
where not exists (select 1 from meals m where m.name = v.name);

-- Tüm yemekler (eski + yeni) için tarif (malzeme + miktar) kayıtları
-- miktarlar 40 porsiyonluk toplam parti miktarıdır (ilgili malzemenin birimi cinsinden)
insert into meal_ingredients (meal_id, ingredient_id, quantity)
select (select id from meals m where m.name = v.meal_name),
       (select id from ingredients i where i.name = v.ingredient_name),
       v.quantity
from (values
  ('Tavuk Çorbası',      'Tavuk Göğsü',      2.4),
  ('Tavuk Çorbası',      'Pirinç',           0.8),
  ('Tavuk Çorbası',      'Soğan',            0.4),
  ('Tavuk Çorbası',      'Tuz',              0.12),
  ('Tavuk Çorbası',      'Un',               0.4),

  ('Mercimek Çorbası',   'Kırmızı Mercimek', 2.0),
  ('Mercimek Çorbası',   'Soğan',            0.4),
  ('Mercimek Çorbası',   'Tereyağı',         0.4),
  ('Mercimek Çorbası',   'Un',               0.4),
  ('Mercimek Çorbası',   'Tuz',              0.12),

  ('Domates Çorbası',    'Domates',          3.2),
  ('Domates Çorbası',    'Salça',            0.4),
  ('Domates Çorbası',    'Tereyağı',         0.4),
  ('Domates Çorbası',    'Un',               0.4),
  ('Domates Çorbası',    'Tuz',              0.12),

  ('Ezogelin Çorbası',   'Kırmızı Mercimek', 1.6),
  ('Ezogelin Çorbası',   'Bulgur',           0.8),
  ('Ezogelin Çorbası',   'Salça',            0.4),
  ('Ezogelin Çorbası',   'Sarımsak',         0.08),
  ('Ezogelin Çorbası',   'Tuz',              0.12),

  ('Biber Dolması',      'Kıyma',            3.2),
  ('Biber Dolması',      'Pirinç',           1.2),
  ('Biber Dolması',      'Domates',          0.8),
  ('Biber Dolması',      'Soğan',            0.4),
  ('Biber Dolması',      'Tuz',              0.12),

  ('Lazanya',            'Kıyma',            2.8),
  ('Lazanya',            'Makarna',          2.0),
  ('Lazanya',            'Kaşar Peyniri',    0.8),
  ('Lazanya',            'Domates',          0.8),
  ('Lazanya',            'Un',               0.4),

  ('Fırın Tavuk But',    'Tavuk But',        4.8),
  ('Fırın Tavuk But',    'Patates',          2.0),
  ('Fırın Tavuk But',    'Zeytinyağı',       0.4),
  ('Fırın Tavuk But',    'Sarımsak',         0.12),
  ('Fırın Tavuk But',    'Tuz',              0.12),

  ('Kuru Fasulye',       'Kuru Fasulye',     2.8),
  ('Kuru Fasulye',       'Soğan',            0.4),
  ('Kuru Fasulye',       'Salça',            0.4),
  ('Kuru Fasulye',       'Ayçiçek Yağı',     0.4),
  ('Kuru Fasulye',       'Tuz',              0.12),

  ('Sigara Böreği',      'Yufka',            2.0),
  ('Sigara Böreği',      'Kaşar Peyniri',    1.2),
  ('Sigara Böreği',      'Yumurta',          12),
  ('Sigara Böreği',      'Ayçiçek Yağı',     0.4),

  ('Kaşarlı Tost',       'Yufka',            1.6),
  ('Kaşarlı Tost',       'Kaşar Peyniri',    1.2),
  ('Kaşarlı Tost',       'Tereyağı',         0.2),

  ('Mücver',             'Kabak',            4.0),
  ('Mücver',             'Yumurta',          8),
  ('Mücver',             'Un',               0.8),
  ('Mücver',             'Ayçiçek Yağı',     0.4),
  ('Mücver',             'Tuz',              0.08),

  ('Haşlanmış Yumurta',  'Yumurta',          40),
  ('Haşlanmış Yumurta',  'Tuz',              0.04),

  ('Pilav',              'Pirinç',           3.2),
  ('Pilav',              'Tereyağı',         0.2),
  ('Pilav',              'Tuz',              0.08),

  ('Soslu Makarna',      'Makarna',          3.6),
  ('Soslu Makarna',      'Salça',            0.4),
  ('Soslu Makarna',      'Ayçiçek Yağı',     0.2),
  ('Soslu Makarna',      'Tuz',              0.08),

  ('Ispanaklı Pilav',    'Pirinç',           2.8),
  ('Ispanaklı Pilav',    'Ispanak',          1.2),
  ('Ispanaklı Pilav',    'Soğan',            0.4),
  ('Ispanaklı Pilav',    'Tereyağı',         0.2),

  ('Bulgur Pilavı',      'Bulgur',           3.2),
  ('Bulgur Pilavı',      'Domates',          0.8),
  ('Bulgur Pilavı',      'Soğan',            0.4),
  ('Bulgur Pilavı',      'Tereyağı',         0.2),

  ('Sebzeli Yoğurt',     'Yoğurt',           4.0),
  ('Sebzeli Yoğurt',     'Salatalık',        1.2),
  ('Sebzeli Yoğurt',     'Sarımsak',         0.08),

  ('Cacık',              'Yoğurt',           4.8),
  ('Cacık',              'Salatalık',        1.6),
  ('Cacık',              'Sarımsak',         0.08),
  ('Cacık',              'Tuz',              0.04),

  ('Çoban Salata',       'Domates',          1.6),
  ('Çoban Salata',       'Salatalık',        1.6),
  ('Çoban Salata',       'Soğan',            0.4),
  ('Çoban Salata',       'Zeytinyağı',       0.4),
  ('Çoban Salata',       'Limon',            0.2),

  ('Havuç Salatası',     'Havuç',            2.4),
  ('Havuç Salatası',     'Yoğurt',           1.6),
  ('Havuç Salatası',     'Sarımsak',         0.08),

  ('Sütlaç',             'Süt',              6.0),
  ('Sütlaç',             'Pirinç',           0.4),
  ('Sütlaç',             'Şeker',            0.8),

  ('İrmik Helvası',      'İrmik',            2.0),
  ('İrmik Helvası',      'Şeker',            1.2),
  ('İrmik Helvası',      'Tereyağı',         0.8),
  ('İrmik Helvası',      'Süt',              2.0),

  ('Meyve Tabağı',       'Elma',             2.0),
  ('Meyve Tabağı',       'Muz',              2.0),
  ('Meyve Tabağı',       'Portakal',         2.0),

  ('Muhallebi',          'Süt',              6.0),
  ('Muhallebi',          'Şeker',            0.8),
  ('Muhallebi',          'Un',               0.4)
) as v(meal_name, ingredient_name, quantity)
where not exists (
  select 1 from meal_ingredients mi
  where mi.meal_id = (select id from meals m where m.name = v.meal_name)
    and mi.ingredient_id = (select id from ingredients i where i.name = v.ingredient_name)
);

-- Tarife göre kalori/protein/demir (porsiyon başına) hesapla ve önbelleğe yaz
update meals m
set calories = round(coalesce(agg.total_cal, 0) / greatest(m.portions, 1), 2),
    protein  = round(coalesce(agg.total_pro, 0) / greatest(m.portions, 1), 2),
    iron     = round(coalesce(agg.total_iron, 0) / greatest(m.portions, 1), 2)
from (
  select mi.meal_id,
         sum(mi.quantity * i.calories) as total_cal,
         sum(mi.quantity * i.protein)  as total_pro,
         sum(mi.quantity * i.iron)     as total_iron
  from meal_ingredients mi
  join ingredients i on i.id = mi.ingredient_id
  group by mi.meal_id
) agg
where agg.meal_id = m.id;
