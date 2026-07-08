-- Parti (batch) seviyesindeki SKT alanları için gerçekçi, malzemenin bozulma hızına göre
-- güncel tarihe (current_date) göreli son kullanma tarihleri. Sadece SKT'si boş partiler doldurulur.
update ingredient_batches b
set expiry_date = current_date + v.days_offset
from ingredients i
join (values
  ('Tavuk Göğsü', 4), ('Kıyma', 3), ('Tavuk But', 5), ('Yoğurt', 10), ('Süt', 6),
  ('Domates', 7), ('Salatalık', 6), ('Marul', 4), ('Ispanak', 5), ('Kabak', 8), ('Havuç', 14),
  ('Yumurta', 25), ('Kaşar Peyniri', 45), ('Limon', 20), ('Elma', 30), ('Muz', 12),
  ('Portakal', 25), ('Yufka', 60),
  ('Pirinç', 365), ('Bulgur', 300), ('Makarna', 400), ('Un', 200), ('Şeker', 500), ('Tuz', 720),
  ('Kırmızı Mercimek', 300), ('Nohut', 300), ('Kuru Fasulye', 300), ('Zeytinyağı', 250),
  ('Ayçiçek Yağı', 250), ('Nane (Kuru)', 400), ('İrmik', 300), ('Ceviz', 200), ('Tereyağı', 90),
  ('Salça', 250), ('Sarımsak', 60), ('Soğan', 60), ('Patates', 45), ('Karnabahar', 10)
) as v(name, days_offset) on v.name = i.name
where b.ingredient_id = i.id
  and b.expiry_date is null;
