-- Fiyat artık parti (alım) bazlıdır: her parti alınırken birim fiyatı girilir.
-- ingredients.price türetilmiş bir alana dönüşür: eldeki partilerin miktar-ağırlıklı
-- ortalama birim fiyatı (AI menü maliyeti bunu kullanır).
alter table ingredient_batches
  add column if not exists unit_price numeric;

-- Mevcut partilere, malzemenin o anki fiyatını başlangıç değeri olarak kopyala
-- (böylece ortalama hesabı ilk günden çalışır, toplamlar değişmez).
update ingredient_batches b
set unit_price = i.price
from ingredients i
where b.ingredient_id = i.id
  and b.unit_price is null
  and i.price > 0;
