-- Dashboard'daki haftalık takvim kartlarında "kaç kişi için / kişi başı TL" hesaplanabilmesi için
-- katalogdan seçilen yemeklerin porsiyon sayısı menü kalemine de kopyalanır.
alter table weekly_menu_items
  add column if not exists portions integer;

update weekly_menu_items wmi
set portions = m.portions
from meals m
where wmi.meal_id = m.id
  and wmi.portions is null;
