-- Yemekler artık stok değil, "porsiyon" (tarifin kaç porsiyon olduğu) ile takip edilir.
-- Kalori/protein/demir, tarifte kullanılan malzeme miktarlarından hesaplanıp bu tabloda
-- (meals.calories/protein/iron) önbelleklenir; gerçek kaynak meal_ingredients tablosudur.

alter table meals
  add column if not exists portions integer not null default 1,
  add column if not exists protein  numeric not null default 0,
  add column if not exists iron     numeric not null default 0;

create table if not exists meal_ingredients (
  id            serial primary key,
  meal_id       integer not null references meals(id) on delete cascade,
  ingredient_id integer not null references ingredients(id),
  quantity      numeric not null default 0
);

create index if not exists ix_meal_ingredients_meal_id on meal_ingredients(meal_id);

alter table meals drop column if exists stock;
alter table meals drop column if exists ingredient_id;
alter table meals drop column if exists rating_id;
