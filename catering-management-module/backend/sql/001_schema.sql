create extension if not exists "uuid-ossp";

-- 4. roles table
create table roles (
  id serial primary key,
  role_name varchar(50) not null unique
);

-- Seed initial roles
insert into roles (id, role_name) values
  (1, 'SUPER_ADMIN'),
  (2, 'CATERING_ADMIN'),
  (3, 'UNIVERSITY_ADMIN'),
  (4, 'DIETITIAN'),
  (5, 'WAREHOUSE_STAFF'),
  (6, 'PURCHASING_STAFF');

-- Select nextval for serial to match seeded rows
select setval('roles_id_seq', 6);

-- 1. companies table
create table companies (
  id uuid primary key default uuid_generate_v4(),
  company_name varchar(150) not null unique,
  tax_number varchar(20),
  email varchar(150),
  phone varchar(20),
  address text,
  status boolean not null default true,
  created_at timestamp not null default now()
);

-- 2. licenses table
create table licenses (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null unique references companies(id) on delete cascade,
  plan_name varchar(50) not null, -- Starter / Professional / Enterprise
  max_universities integer not null check (max_universities > 0),
  max_users integer not null check (max_users > 0),
  start_date date not null,
  expire_date date not null,
  status boolean not null default true,
  created_at timestamp not null default now(),
  check (expire_date >= start_date)
);

-- 3. universities table
create table universities (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references companies(id) on delete cascade,
  university_name varchar(200) not null,
  city varchar(100),
  student_count integer,
  status boolean not null default true,
  created_at timestamp not null default now(),
  unique (company_id, university_name)
);

-- 5. user_profiles table
create table user_profiles (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid unique,
  company_id uuid references companies(id) on delete cascade,
  university_id uuid references universities(id) on delete set null,
  role_id integer not null references roles(id),
  full_name varchar(120) not null,
  password_hash varchar(255),
  phone varchar(20),
  is_active boolean not null default true,
  created_at timestamp not null default now()
);


-- 6. university_menu_assignments table
create table university_menu_assignments (
  id uuid primary key default uuid_generate_v4(),
  menu_id uuid not null,
  university_id uuid not null references universities(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  assigned_by uuid not null references user_profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  status varchar(20) not null check (status in ('ACTIVE', 'INACTIVE', 'ARCHIVED')) default 'ACTIVE',
  is_published boolean not null default false,
  created_at timestamp not null default now(),
  check (end_date >= start_date)
);

-- Indexes for performance
create index ix_universities_company_id on universities(company_id);
create index ix_user_profiles_company_id on user_profiles(company_id);
create index ix_user_profiles_university_id on user_profiles(university_id);
create index ix_licenses_company_id on licenses(company_id);
create index ix_university_menu_assignments_university_id on university_menu_assignments(university_id);
create index ix_university_menu_assignments_company_id on university_menu_assignments(company_id);
