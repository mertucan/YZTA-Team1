alter table university_menu_assignments
  add column if not exists weekly_menu_id integer references weekly_menus(id) on delete set null;

create index if not exists ix_university_menu_assignments_weekly_menu_id
  on university_menu_assignments(weekly_menu_id);
