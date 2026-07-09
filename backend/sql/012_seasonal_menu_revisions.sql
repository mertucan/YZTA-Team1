-- Epic 10: Mevsimsel ve yerel menu onerileri icin malzeme sinyalleri
alter table public.ingredients
  add column if not exists is_local boolean not null default false,
  add column if not exists origin_region varchar(120),
  add column if not exists season_start_month smallint,
  add column if not exists season_end_month smallint,
  add column if not exists market_price numeric,
  add column if not exists last_price_checked_at date;

alter table public.ingredients
  add constraint ingredients_season_start_month_check
    check (season_start_month is null or season_start_month between 1 and 12) not valid,
  add constraint ingredients_season_end_month_check
    check (season_end_month is null or season_end_month between 1 and 12) not valid;

comment on column public.ingredients.is_local is 'Yerel tedarik/uretim bilgisi.';
comment on column public.ingredients.origin_region is 'Urunun geldigi bolge veya yerel tedarik notu.';
comment on column public.ingredients.season_start_month is 'Urunun sezona girdigi ay (1-12).';
comment on column public.ingredients.season_end_month is 'Urunun sezondan ciktigi ay (1-12).';
comment on column public.ingredients.market_price is 'Karsilastirma icin guncel piyasa birim fiyati.';
comment on column public.ingredients.last_price_checked_at is 'Piyasa fiyati kontrol tarihi.';
