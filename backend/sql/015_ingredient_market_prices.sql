-- Malzemelerin market (A101) ürün eşleştirmesi ve güncel fiyat takibi.
-- Her malzeme için kaynak başına tek kayıt tutulur; "A101 Veri Çek" bu kaydı günceller.
create table if not exists ingredient_market_prices (
  id             serial primary key,
  ingredient_id  integer not null references ingredients(id) on delete cascade,
  source         varchar(20) not null default 'a101',
  product_url    text not null,          -- ürün sayfası (tıklayınca açılır)
  product_name   text,                   -- A101'deki ürün adı
  pack_quantity  numeric,                -- paket, malzeme birimi cinsinden kaç birim (ör. 2500 G -> 2.5 kg)
  pack_unit      varchar(10),            -- malzemenin birimi (kg/lt/adet/paket)
  last_price     numeric,                -- paketin güncel fiyatı (TL)
  unit_price     numeric,                -- birim başına fiyat = last_price / pack_quantity
  unit_matched   boolean not null default false,  -- ürün birimi malzeme birimiyle eşleşti mi
  checked_at     timestamp,              -- fiyatın çekildiği an
  unique (ingredient_id, source)
);

create index if not exists ix_ingredient_market_prices_ing on ingredient_market_prices(ingredient_id);
