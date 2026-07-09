-- AI Menü Planlayıcı artık "Yemek Kategorisi" kataloğundaki hazır yemeklerle de beslenebilir.
-- Bir weekly_menu_items satırı ya AI/malzeme tabanlıdır (ingredient_id dolu) ya da
-- katalogdan seçilmiş bir yemektir (meal_id dolu). Bu yüzden ingredient_id/quantity artık zorunlu değil.
alter table weekly_menu_items
  add column if not exists meal_id  integer references meals(id) on delete cascade,
  add column if not exists category varchar(40);

alter table weekly_menu_items
  alter column ingredient_id drop not null,
  alter column quantity drop not null;
