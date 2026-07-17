-- Katalog öğle/akşam yemeği tarzındadır: kahvaltılık yemekler kaldırılır.
-- (meal_ingredients ve weekly_menu_items kayıtları CASCADE ile birlikte silinir.)
delete from meals where name in ('Kaşarlı Tost', 'Haşlanmış Yumurta');

-- Yerlerine öğle/akşam tarzı iki Ara Sıcak (mevcut depo malzemeleriyle)
insert into meals (name, category, portions)
select v.name, 'Ara Sıcak', 40
from (values ('Patates Kızartması'), ('Su Böreği')) as v(name)
where not exists (select 1 from meals m where m.name = v.name);

-- Tarifler (miktarlar 40 porsiyonluk toplam)
insert into meal_ingredients (meal_id, ingredient_id, quantity)
select (select id from meals where name = v.meal),
       (select id from ingredients where name = v.ing),
       v.qty
from (values
  ('Patates Kızartması', 'Patates',       6.0),
  ('Patates Kızartması', 'Ayçiçek Yağı',  1.2),
  ('Patates Kızartması', 'Tuz',           0.08),
  ('Su Böreği',          'Yufka',         3.0),
  ('Su Böreği',          'Kaşar Peyniri', 1.6),
  ('Su Böreği',          'Yumurta',       10),
  ('Su Böreği',          'Süt',           1.0),
  ('Su Böreği',          'Tereyağı',      0.4)
) as v(meal, ing, qty)
where (select id from meals where name = v.meal) is not null
  and (select id from ingredients where name = v.ing) is not null
  and not exists (
    select 1 from meal_ingredients mi
    where mi.meal_id = (select id from meals where name = v.meal)
      and mi.ingredient_id = (select id from ingredients where name = v.ing)
  );

-- Yeni yemeklerin porsiyon başı besin değerlerini tariften hesapla
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
where agg.meal_id = m.id
  and m.name in ('Patates Kızartması', 'Su Böreği');

-- Silinen yemeklerin geçtiği haftalık menülerin toplamlarını yeniden hesapla
update weekly_menus w
set total_cost     = coalesce(agg.c, 0),
    total_calories = coalesce(agg.cal, 0),
    total_protein  = coalesce(agg.pro, 0),
    total_iron     = coalesce(agg.irn, 0)
from (
  select weekly_menu_id,
         round(sum(estimated_cost * coalesce(portions, 1))::numeric, 2) as c,
         round(sum(calories)::numeric, 2) as cal,
         round(sum(protein)::numeric, 2)  as pro,
         round(sum(iron)::numeric, 2)     as irn
  from weekly_menu_items
  group by weekly_menu_id
) agg
where agg.weekly_menu_id = w.id;

-- Kalemi tamamen boşalan menüler sıfırlanır
update weekly_menus
set total_cost = 0, total_calories = 0, total_protein = 0, total_iron = 0
where id not in (select distinct weekly_menu_id from weekly_menu_items);
