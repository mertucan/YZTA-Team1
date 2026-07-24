-- Otomatik Sipariş Ajanı: tedarikçiler + satın alma / teklif talebi kayıtları.
-- Malzeme kritik seviyeye düştüğünde sistem eksik listesinden otomatik bir sipariş
-- taslağı üretir; müdür tedarikçi seçip "gönderildi", teslim alınınca "teslim alındı"
-- yapar. Teslim alma stoğa otomatik parti ekler (döngüyü kapatır).

create table if not exists suppliers (
  id           serial primary key,
  name         varchar(120) not null,
  contact_name varchar(120),
  email        varchar(160),
  phone        varchar(40),
  categories   varchar(240),                 -- virgülle: "sebze, et, bakliyat"
  note         varchar(300),
  created_at   timestamp    not null default now()
);

create table if not exists purchase_orders (
  id              serial primary key,
  supplier_id     int references suppliers(id) on delete set null,
  supplier_name   varchar(120),              -- oluşturulduğu andaki tedarikçi adı (snapshot)
  status          varchar(20)  not null default 'draft', -- draft / sent / received / cancelled
  note            varchar(400),
  items           jsonb        not null default '[]',    -- [{ingredient_id,name,unit,quantity,unit_price,line_total,reason}]
  total_estimated numeric      not null default 0,        -- TL (tahmini)
  auto_generated  boolean      not null default true,
  created_at      timestamp    not null default now(),
  sent_at         timestamp,
  received_at     timestamp
);

create index if not exists ix_purchase_orders_status on purchase_orders(status);
create index if not exists ix_purchase_orders_created on purchase_orders(created_at);
