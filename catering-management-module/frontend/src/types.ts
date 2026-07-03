export type Role =
  | "SUPER_ADMIN"
  | "CATERING_ADMIN"
  | "UNIVERSITY_ADMIN"
  | "DIETITIAN"
  | "WAREHOUSE_STAFF"
  | "PURCHASING_STAFF";

export type Dashboard = {
  total_universities: number;
  total_users: number;
  active_license: boolean;
  license_ends_at: string | null;
  license_days_left: number | null;
};

export type Company = {
  id: string;
  company_name: string;
  tax_number: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: boolean;
  created_at: string;
};

export type License = {
  id: string;
  company_id: string;
  plan_name: string;
  max_universities: number;
  max_users: number;
  start_date: string;
  expire_date: string;
  status: boolean;
};

export type University = {
  id: string;
  company_id: string;
  university_name: string;
  city: string | null;
  student_count: number | null;
  status: boolean;
  created_at: string;
};

export type UserProfile = {
  id: string;
  auth_user_id: string;
  company_id: string | null;
  university_id: string | null;
  email: string;
  full_name: string;
  phone: string | null;
  role_name: string;
  is_active: boolean;
  created_at: string;
};

export type MenuAssignment = {
  id: string;
  menu_id: string;
  university_id: string;
  company_id: string;
  assigned_by: string;
  start_date: string;
  end_date: string;
  status: string;
  is_published: boolean;
  created_at: string;
};
