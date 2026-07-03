alter table companies enable row level security;
alter table licenses enable row level security;
alter table universities enable row level security;
alter table user_profiles enable row level security;
alter table roles enable row level security;
alter table university_menu_assignments enable row level security;

create or replace function current_profile_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from user_profiles where auth_user_id = auth.uid() and is_active = true
$$;

create or replace function current_profile_role()
returns varchar(50)
language sql
security definer
stable
as $$
  select r.role_name 
  from user_profiles u
  join roles r on u.role_id = r.id
  where u.auth_user_id = auth.uid() and u.is_active = true
$$;

-- Roles policies
create policy roles_read on roles
for select using (true);

create policy roles_all on roles
for all using (current_profile_role() = 'SUPER_ADMIN');

-- Companies policies
create policy company_tenant_select on companies
for select using (
  current_profile_role() = 'SUPER_ADMIN'
  or id = current_profile_company_id()
);

create policy company_tenant_all on companies
for all using (current_profile_role() = 'SUPER_ADMIN');

-- Licenses policies
create policy license_tenant_select on licenses
for select using (
  current_profile_role() = 'SUPER_ADMIN'
  or company_id = current_profile_company_id()
);

create policy license_tenant_all on licenses
for all using (current_profile_role() = 'SUPER_ADMIN');

-- Universities policies
create policy university_tenant_select on universities
for select using (
  current_profile_role() = 'SUPER_ADMIN'
  or company_id = current_profile_company_id()
);

create policy university_tenant_modify on universities
for all using (
  current_profile_role() = 'SUPER_ADMIN'
  or (
    current_profile_role() = 'CATERING_ADMIN'
    and company_id = current_profile_company_id()
  )
);

-- User profiles policies
create policy user_profile_tenant_select on user_profiles
for select using (
  current_profile_role() = 'SUPER_ADMIN'
  or company_id = current_profile_company_id()
);

create policy user_profile_tenant_modify on user_profiles
for all using (
  current_profile_role() = 'SUPER_ADMIN'
  or (
    current_profile_role() = 'CATERING_ADMIN'
    and company_id = current_profile_company_id()
  )
  or (
    current_profile_role() = 'UNIVERSITY_ADMIN'
    and company_id = current_profile_company_id()
    and university_id = (select university_id from user_profiles where auth_user_id = auth.uid())
  )
);

-- University menu assignments policies
create policy menu_assignment_tenant_select on university_menu_assignments
for select using (
  current_profile_role() = 'SUPER_ADMIN'
  or company_id = current_profile_company_id()
);

create policy menu_assignment_tenant_modify on university_menu_assignments
for all using (
  current_profile_role() = 'SUPER_ADMIN'
  or (
    current_profile_role() in ('CATERING_ADMIN', 'DIETITIAN')
    and company_id = current_profile_company_id()
  )
);
