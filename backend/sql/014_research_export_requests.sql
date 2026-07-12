create table if not exists research_export_requests (
  id                   bigserial primary key,
  requested_by          bigint not null references user_profiles(id) on delete cascade,
  recipient_email       varchar(255) not null,
  recipient_name        varchar(120),
  start_date            date,
  end_date              date,
  record_count          integer not null default 0,
  subject_count         integer not null default 0,
  status                varchar(40) not null default 'CREATED',
  delivery_message      text,
  brevo_message_id      varchar(120),
  download_token_hash   varchar(64) not null,
  download_expires_at   timestamptz not null,
  created_at            timestamptz not null default now()
);

create index if not exists ix_research_export_requests_requested_by
  on research_export_requests(requested_by);

create index if not exists ix_research_export_requests_status
  on research_export_requests(status);
