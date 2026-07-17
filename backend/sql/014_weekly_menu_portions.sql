-- Menü seviyesinde "kaç kişi/porsiyon" değeri. Değiştirilince o menünün tüm kalemlerinin
-- porsiyonu bu değere eşitlenir; Dashboard kalem porsiyonundan kişi/toplam/kişi başı hesaplar.
alter table weekly_menus
  add column if not exists portions integer not null default 40;
