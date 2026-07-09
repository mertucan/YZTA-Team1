-- 007'de eklenen tarifler 40 porsiyonluk toplam miktar olarak girildi;
-- eski 9 yemeğin portions alanı hâlâ varsayılan (1) kalmıştı, düzeltiliyor.
update meals
set portions = 40
where name in (
  'Tavuk Çorbası', 'Mercimek Çorbası', 'Domates Çorbası',
  'Biber Dolması', 'Lazanya',
  'Pilav', 'Soslu Makarna', 'Ispanaklı Pilav',
  'Sebzeli Yoğurt'
);

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
