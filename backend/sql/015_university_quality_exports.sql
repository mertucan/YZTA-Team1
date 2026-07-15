create table if not exists university_quality_exports (
  id                       bigserial primary key,
  requested_by             bigint not null references user_profiles(id) on delete cascade,
  university_id            bigint references universities(id) on delete set null,
  organization_id          varchar(60) not null,
  organization_name        varchar(160) not null,
  export_format            varchar(10) not null,
  start_date               date,
  end_date                 date,
  nutrition_quality_score  numeric not null default 0,
  menu_count               integer not null default 0,
  item_count               integer not null default 0,
  status                   varchar(40) not null default 'GENERATED',
  created_at               timestamptz not null default now()
);

create index if not exists ix_university_quality_exports_requested_by
  on university_quality_exports(requested_by);

create index if not exists ix_university_quality_exports_university_id
  on university_quality_exports(university_id);

create index if not exists ix_university_quality_exports_status
  on university_quality_exports(status);
