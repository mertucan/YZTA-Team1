insert into roles (role_name)
values ('PARTNER_COMPANY')
on conflict (role_name) do nothing;

create table if not exists partner_product_integrations (
  id                       bigserial primary key,
  company_id               bigint references companies(id) on delete set null,
  submitted_by             bigint not null references user_profiles(id) on delete cascade,
  reviewed_by              bigint references user_profiles(id) on delete set null,
  partner_company_name     varchar(150) not null,
  brand_name               varchar(120) not null,
  product_name             varchar(160) not null,
  product_category         varchar(80) not null,
  suggested_menu_category  varchar(80) not null,
  serving_size             varchar(80),
  calories                 numeric not null default 0,
  protein                  numeric not null default 0,
  sugar                    numeric not null default 0,
  sodium                   numeric not null default 0,
  target_segments          varchar(240),
  allergens                varchar(240),
  integration_note         text,
  status                   varchar(30) not null default 'PENDING_REVIEW',
  review_note              text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index if not exists ix_partner_product_integrations_company_id
  on partner_product_integrations(company_id);

create index if not exists ix_partner_product_integrations_submitted_by
  on partner_product_integrations(submitted_by);

create index if not exists ix_partner_product_integrations_status
  on partner_product_integrations(status);

create index if not exists ix_partner_product_integrations_menu_category
  on partner_product_integrations(suggested_menu_category);

alter table weekly_menu_items
  add column if not exists partner_product_integration_id bigint references partner_product_integrations(id) on delete set null,
  add column if not exists source varchar(30) not null default 'CATALOG';

create index if not exists ix_weekly_menu_items_partner_product_integration_id
  on weekly_menu_items(partner_product_integration_id);
