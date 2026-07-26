-- Gerçekçilik omurgası:
-- 1) ingredients.min_stock  : malzeme BAZLI kritik eşik (sabit 20 yerine; birim farkı
--    gözetir — 20 kg pirinç ile 20 adet yumurta aynı şey değildir)
-- 2) ingredient_batches.initial_quantity : partide SATIN ALINAN miktar. `quantity`
--    kalan miktardır (tüketimle azalır); malzeme GİDERİ ise alınan miktardan hesaplanır.
-- 3) consumption_logs : "Günü Kapat" servis tüketim kayıtları — günün menüsü servis
--    edilince stok partilerden FEFO (önce SKT'si yakın) düşülür ve buraya loglanır.

alter table ingredients add column if not exists min_stock numeric;

alter table ingredient_batches add column if not exists initial_quantity numeric;
update ingredient_batches set initial_quantity = quantity where initial_quantity is null;

create table if not exists consumption_logs (
  id             serial primary key,
  service_date   date not null unique,   -- bir gün yalnızca bir kez kapatılır
  weekly_menu_id int,
  day_of_week    varchar(20),
  total_portions int not null default 0,
  details        jsonb not null default '[]', -- [{ingredient_id,name,unit,required,consumed,shortfall}]
  created_at     timestamp not null default now()
);

-- Başlangıç eşiği: birime göre makul varsayılan (AI önerisi/elle giriş sonradan günceller)
update ingredients set min_stock = case unit
  when 'adet' then 30
  when 'lt'   then 10
  else 15
end where min_stock is null;
