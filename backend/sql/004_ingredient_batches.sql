-- Malzemeler artık "ana kategori" gibi düşünülüyor; her alım bir "parti" (batch) olarak
-- ayrı ayrı tarih/miktar/SKT ile tutulur. Ana malzeme satırındaki stock, tüm partilerin
-- toplamıdır; SKT artık ana satırda değil, parti (batch) seviyesinde tutulur.

create table if not exists ingredient_batches (
  id             serial primary key,
  ingredient_id  integer not null references ingredients(id) on delete cascade,
  quantity       numeric not null default 0,
  purchase_date  date not null default current_date,
  expiry_date    date,
  created_at     timestamp not null default now()
);

create index if not exists ix_ingredient_batches_ingredient_id on ingredient_batches(ingredient_id);

-- Mevcut stokları ilk parti olarak taşı (toplam korunur)
insert into ingredient_batches (ingredient_id, quantity, purchase_date, expiry_date)
select id, stock, current_date, expiry_date
from ingredients
where stock > 0
  and not exists (select 1 from ingredient_batches b where b.ingredient_id = ingredients.id);

-- SKT artık ana malzeme satırında değil, parti seviyesinde
alter table ingredients drop column if exists expiry_date;
