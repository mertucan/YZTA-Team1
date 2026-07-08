-- Yeni yemek tarifleri için ek malzemeler
insert into ingredients (name, unit, stock, calories, protein, iron, price)
select v.name, v.unit, v.stock, v.calories, v.protein, v.iron, v.price
from (values
  ('Kuru Fasulye', 'kg', 40, 333, 21.4, 6.7, 55),
  ('Tavuk But',     'kg', 35, 209, 26,   1.3, 130),
  ('Kabak',         'kg', 25, 17,  1.2,  0.4, 18),
  ('Havuç',         'kg', 30, 41,  0.9,  0.3, 15),
  ('Nohut',         'kg', 40, 364, 19,   6.2, 45),
  ('Ceviz',         'kg', 10, 654, 15.2, 2.9, 300)
) as v(name, unit, stock, calories, protein, iron, price)
where not exists (
  select 1 from ingredients i where i.name = v.name
);

-- Bu partiler de ilk giriş olarak "alım" kaydı oluştursun
insert into ingredient_batches (ingredient_id, quantity, purchase_date, expiry_date)
select i.id, i.stock, current_date, null
from ingredients i
where i.name in ('Kuru Fasulye', 'Tavuk But', 'Kabak', 'Havuç', 'Nohut', 'Ceviz')
  and not exists (select 1 from ingredient_batches b where b.ingredient_id = i.id);
