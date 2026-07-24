-- Harcamalar / Giderler tablosu: yemekhane işletme giderleri (personel, elektrik, su,
-- tamir, malzeme dışı her türlü gider). Kayıtlar > Harcamalar ekranı bunu yönetir.
create table if not exists expenses (
  id           serial primary key,
  category     varchar(40)  not null,          -- Personel / Elektrik / Su / Doğalgaz / Tamir-Bakım / Kira / Diğer
  description  varchar(200),
  amount       numeric      not null default 0, -- TL
  expense_date date         not null default current_date,
  created_at   timestamp    not null default now()
);

create index if not exists ix_expenses_date on expenses(expense_date);
create index if not exists ix_expenses_category on expenses(category);
