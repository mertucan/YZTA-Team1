-- Malzemelere fiyat + son kullanma tarihi (tahmini bozulma günü) + besin değerleri
alter table ingredients
  add column if not exists price       numeric not null default 0,   -- birim başına fiyat (TL)
  add column if not exists expiry_date date,                          -- son kullanma tarihi / tahmini bozulma günü
  add column if not exists protein     numeric not null default 0,    -- calories ile aynı ölçek/birim mantığı
  add column if not exists iron        numeric not null default 0;    -- mg, calories ile aynı ölçek mantığı

-- Gemini/RAG ile üretilen haftalık menüler
create table if not exists weekly_menus (
  id             serial primary key,
  week_start_date date not null,
  budget         numeric not null,
  total_cost     numeric not null default 0,
  total_calories numeric not null default 0,
  total_protein  numeric not null default 0,
  total_iron     numeric not null default 0,
  status         varchar(20) not null default 'draft',  -- draft | approved
  notes          text,
  created_at     timestamp not null default now()
);

create table if not exists weekly_menu_items (
  id             serial primary key,
  weekly_menu_id integer not null references weekly_menus(id) on delete cascade,
  day_of_week    varchar(20) not null,   -- 'Pazartesi'..'Cuma'
  meal_name      varchar(150) not null, -- LLM'in önerdiği yemek adı
  ingredient_id  integer not null references ingredients(id),
  quantity       numeric not null,
  estimated_cost numeric not null default 0,
  calories       numeric not null default 0,
  protein        numeric not null default 0,
  iron           numeric not null default 0
);

create index if not exists ix_weekly_menu_items_menu_id on weekly_menu_items(weekly_menu_id);
