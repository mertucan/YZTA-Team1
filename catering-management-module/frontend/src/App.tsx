import {
  Award,
  Building2,
  Calendar,
  Check,
  Edit2,
  Globe,
  Key,
  LayoutDashboard,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Routes, Route, Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

import { apiDelete, apiGet, apiPost, apiPut } from "./api";
import { supabase } from "./supabase";
import type { Company, Dashboard, License, MenuAssignment, Role, University, UserProfile } from "./types";
import { useRealtimeData } from "./hooks/useRealtimeData";
import { RealtimeIndicator } from "./components/RealtimeIndicator";

type View =
  | "dashboard"
  | "inventory"
  | "meals"
  | "ai-menu"
  | "allergies"
  | "holidays"
  | "dorms"
  | "reports"
  | "yok-univ"
  | "catering";

type CateringTab = "universities" | "users" | "menu-assignments" | "companies";


const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Süper Admin",
  CATERING_ADMIN: "Catering Yöneticisi",
  UNIVERSITY_ADMIN: "Üniversite Yöneticisi",
  DIETITIAN: "Diyetisyen",
  WAREHOUSE_STAFF: "Depo Görevlisi",
  PURCHASING_STAFF: "Satın Alma Sorumlusu",
};

function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");


  const navigate = useNavigate();
  const location = useLocation();

  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [universities, setUniversities] = useState<University[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [menuAssignments, setMenuAssignments] = useState<MenuAssignment[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modals state
  const [modalType, setModalType] = useState<
    | "add-univ"
    | "edit-univ"
    | "add-user"
    | "edit-user"
    | "add-menu"
    | "edit-menu"
    | "add-company"
    | "edit-company"
    | "edit-license"
    | null
  >(null);

  // Selected item for edit/license
  const [selectedUniv, setSelectedUniv] = useState<University | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedMenu, setSelectedMenu] = useState<MenuAssignment | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);

  // Form Fields states
  const [univForm, setUnivForm] = useState({
    university_name: "",
    city: "",
    student_count: 0,
    status: true,
    company_id: "",
  });

  const [userForm, setUserForm] = useState({
    auth_user_id: "",
    email: "",
    full_name: "",
    role_name: "DIETITIAN",
    university_id: "",
    phone: "",
    is_active: true,
    company_id: "",
  });

  const [menuForm, setMenuForm] = useState({
    menu_id: "",
    university_id: "",
    start_date: "",
    end_date: "",
    status: "ACTIVE",
    is_published: false,
    company_id: "",
  });

  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    tax_number: "",
    email: "",
    phone: "",
    address: "",
    plan_name: "Starter",
    max_users: 5,
    max_universities: 2,
    start_date: "",
    expire_date: "",
    status: true,
  });

  const [licenseForm, setLicenseForm] = useState({
    plan_name: "Starter",
    max_users: 5,
    max_universities: 2,
    start_date: "",
    expire_date: "",
    status: true,
  });

  // Init auth check
  useEffect(() => {
    const hasMock = localStorage.getItem("mock_session");
    if (hasMock) {
      setIsAuthed(true);
      setSessionReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(Boolean(data.session));
      setSessionReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthed(true);
      } else if (!localStorage.getItem("mock_session")) {
        setIsAuthed(false);
      }
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Fetch current user details on auth
  useEffect(() => {
    if (!isAuthed) {
      setCurrentUser(null);
      return;
    }
    setLoading(true);
    apiGet<UserProfile[]>("/users")
      .then((profiles) => {
        const mockSessionStr = localStorage.getItem("mock_session");
        if (mockSessionStr) {
          try {
            const mockSession = JSON.parse(mockSessionStr);
            const myProfile = profiles.find((p) => p.email === mockSession.user.email);
            if (myProfile) {
              setCurrentUser(myProfile);
            } else if (mockSession.user.email === "superadmin@catering.com") {
              setCurrentUser({
                id: "00000000-0000-0000-0000-000000000000",
                auth_user_id: "00000000-0000-0000-0000-000000000000",
                company_id: null,
                university_id: null,
                email: mockSession.user.email,
                full_name: "Süper Admin Yetkilisi",
                role_name: "SUPER_ADMIN",
                phone: null,
                is_active: true,
                created_at: new Date().toISOString(),
              });
            }
          } catch {
            // ignore
          }
          return;
        }

        // Find current authenticated user's profile
        supabase.auth.getUser().then(({ data }) => {
          const authId = data.user?.id;
          const myProfile = profiles.find((p) => p.auth_user_id === authId);
          if (myProfile) {
            setCurrentUser(myProfile);
          } else {
            // Super admin or out-of-band profile creation fallback
            // Create a temporary representation if not in table
            setCurrentUser({
              id: "00000000-0000-0000-0000-000000000000",
              auth_user_id: authId || "",
              company_id: null,
              university_id: null,
              email: data.user?.email || "superadmin@system.local",
              full_name: "Sistem Yöneticisi",
              role_name: "SUPER_ADMIN",
              phone: null,
              is_active: true,
              created_at: new Date().toISOString(),
            });
          }
        });
      })
      .catch((err: Error) => {
        setError(err.message);
        if (
          err.message.includes("profile not found") ||
          err.message.includes("not active") ||
          err.message.includes("Oturum bulunamadı") ||
          err.message.includes("Forbidden") ||
          err.message.includes("403") ||
          err.message.includes("401")
        ) {
          localStorage.removeItem("mock_session");
          setIsAuthed(false);
          setCurrentUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, [isAuthed]);

  // Load view data
  const loadData = (silent = false) => {
    if (!isAuthed) return;
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    const fetches: Promise<unknown>[] = [
      apiGet<Dashboard>("/dashboard"),
      apiGet<University[]>("/universities"),
      apiGet<UserProfile[]>("/users"),
      apiGet<MenuAssignment[]>("/menu-assignments"),
    ];

    if (currentUser?.role_name === "SUPER_ADMIN") {
      fetches.push(apiGet<Company[]>("/companies"));
    }

    Promise.all(fetches)
      .then(([dashboardData, universityData, userData, menuData, companyData]) => {
        setDashboard(dashboardData as Dashboard);
        setUniversities(universityData as University[]);
        setUsers(userData as UserProfile[]);
        setMenuAssignments(menuData as MenuAssignment[]);
        if (companyData) {
          setCompanies(companyData as Company[]);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => {
        if (!silent) {
          setLoading(false);
        }
      });
  };

  useEffect(() => {
    if (isAuthed && currentUser) {
      // Initial full load (with loading spinner)
      loadData(false);
    }
  }, [isAuthed, currentUser]);

  // ── Supabase Realtime subscription ────────────────────────────────────────
  const { status: realtimeStatus } = useRealtimeData({
    enabled: isAuthed && !!currentUser,
    initialUniversities: universities,
    initialUsers: users,
    initialMenus: menuAssignments,
    initialCompanies: companies,
    onUniversityChange: setUniversities,
    onUserChange: setUsers,
    onMenuChange: setMenuAssignments,
    onCompanyChange: setCompanies,
  });

  const licenseTone = useMemo(() => {
    if (!dashboard?.active_license) return "danger";
    if ((dashboard.license_days_left ?? 999) <= 30) return "warning";
    return "success";
  }, [dashboard]);

  async function signIn() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      let data;
      let sessionToken;

      try {
        // 1. Try signing in via Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (authError) throw authError;
        if (!authData.session) throw new Error("Oturum başlatılamadı.");

        // 2. Fetch the user profile from backend
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/me`, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${authData.session.access_token}`
          },
        });
        data = await response.json();
        if (!response.ok) throw new Error(data.detail ?? "Profil bilgisi alınamadı.");
        sessionToken = authData.session.access_token;
      } catch (supabaseErr) {
        // Fallback: Try backend login directly (useful for local seed users not in Supabase Auth)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const fallbackData = await response.json();
        if (!response.ok) {
          throw new Error(fallbackData.detail ?? "Giriş başarısız.");
        }
        data = fallbackData.user;
        sessionToken = fallbackData.access_token;
      }

      const mockSession = {
        access_token: sessionToken,
        user: { email: data.email, id: data.auth_user_id },
      };
      localStorage.setItem("mock_session", JSON.stringify(mockSession));
      setIsAuthed(true);
      setCurrentUser(data);
      setInfo("Başarıyla giriş yapıldı.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister() {
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      // 1. Sign up via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (authError) {
        throw new Error(authError.message);
      }
      if (!authData.user) {
        throw new Error("Kayıt oluşturulamadı.");
      }

      // 2. Register company and profile on the backend
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          full_name: fullName,
          email,
          auth_user_id: authData.user.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail ?? "Firma kaydı oluşturulamadı.");
      }

      const sessionToken = authData.session?.access_token || `mock-token-${email}`;
      const mockSession = {
        access_token: sessionToken,
        user: { email: data.user.email, id: data.user.auth_user_id },
      };
      localStorage.setItem("mock_session", JSON.stringify(mockSession));
      setIsAuthed(true);
      setCurrentUser(data.user);
      setInfo("Firma kaydı oluşturuldu ve başarıyla giriş yapıldı.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }


  async function signOut() {
    localStorage.removeItem("mock_session");
    await supabase.auth.signOut();
    setIsAuthed(false);
    setEmail("");
    setPassword("");
    setFullName("");
    setCompanyName("");
    setAuthMode("login");
    setError(null);
    setInfo(null);
    setDashboard(null);
    setUniversities([]);
    setUsers([]);
    setMenuAssignments([]);
    setCompanies([]);
    setCurrentUser(null);
    navigate("/");
  }

  // Action handlers
  const handleAddUniv = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = currentUser?.role_name === "SUPER_ADMIN" 
        ? `/universities?company_id=${univForm.company_id}` 
        : "/universities";
      await apiPost(url, {
        university_name: univForm.university_name,
        city: univForm.city || null,
        student_count: univForm.student_count || null,
      });
      setModalType(null);
      setInfo("Üniversite başarıyla eklendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUniv = async () => {
    if (!selectedUniv) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/universities/${selectedUniv.id}`, {
        university_name: univForm.university_name,
        city: univForm.city || null,
        student_count: univForm.student_count || null,
        status: univForm.status,
      });
      setModalType(null);
      setInfo("Üniversite başarıyla güncellendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUniv = async (id: string) => {
    if (!confirm("Bu üniversiteyi silmek istediğinize emin misiniz?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiDelete(`/universities/${id}`);
      setInfo("Üniversite başarıyla silindi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = currentUser?.role_name === "SUPER_ADMIN" 
        ? `/users?company_id=${userForm.company_id}` 
        : "/users";
      await apiPost(url, {
        auth_user_id: userForm.auth_user_id,
        email: userForm.email,
        full_name: userForm.full_name,
        role_name: userForm.role_name,
        phone: userForm.phone || null,
        university_id: userForm.university_id || null,
      });
      setModalType(null);
      setInfo("Kullanıcı başarıyla eklendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/users/${selectedUser.id}`, {
        full_name: userForm.full_name,
        phone: userForm.phone || null,
        is_active: userForm.is_active,
        role_name: userForm.role_name,
        university_id: userForm.university_id || null,
      });
      setModalType(null);
      setInfo("Kullanıcı başarıyla güncellendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiDelete(`/users/${id}`);
      setInfo("Kullanıcı başarıyla silindi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMenu = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = currentUser?.role_name === "SUPER_ADMIN" 
        ? `/menu-assignments?company_id=${menuForm.company_id}` 
        : "/menu-assignments";
      await apiPost(url, {
        menu_id: menuForm.menu_id,
        university_id: menuForm.university_id,
        start_date: menuForm.start_date,
        end_date: menuForm.end_date,
        status: menuForm.status,
        is_published: menuForm.is_published,
      });
      setModalType(null);
      setInfo("Menü ataması başarıyla eklendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditMenu = async () => {
    if (!selectedMenu) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/menu-assignments/${selectedMenu.id}`, {
        start_date: menuForm.start_date,
        end_date: menuForm.end_date,
        status: menuForm.status,
        is_published: menuForm.is_published,
      });
      setModalType(null);
      setInfo("Menü ataması başarıyla güncellendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!confirm("Bu menü atamasını silmek istediğinize emin misiniz?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiDelete(`/menu-assignments/${id}`);
      setInfo("Menü ataması başarıyla silindi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompany = async () => {
    try {
      setLoading(true);
      setError(null);
      await apiPost("/companies", companyForm);
      setModalType(null);
      setInfo("Firma ve lisansı başarıyla eklendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditCompany = async () => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/companies/${selectedCompany.id}`, {
        company_name: companyForm.company_name,
        tax_number: companyForm.tax_number || null,
        email: companyForm.email || null,
        phone: companyForm.phone || null,
        address: companyForm.address || null,
        status: companyForm.status,
      });
      setModalType(null);
      setInfo("Firma başarıyla güncellendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleEditLicense = async () => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      setError(null);
      await apiPut(`/companies/${selectedCompany.id}/license`, licenseForm);
      setModalType(null);
      setInfo("Lisans başarıyla güncellendi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id: string) => {
    if (!confirm("Firma silindiğinde bağlı tüm üniversiteler, lisans ve kullanıcılar silinecektir. Emin misiniz?")) return;
    try {
      setLoading(true);
      setError(null);
      await apiDelete(`/companies/${id}`);
      setInfo("Firma başarıyla silindi.");
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setLoading(false);
    }
  };

  // Modal opens helper
  const openAddUnivModal = () => {
    setUnivForm({
      university_name: "",
      city: "",
      student_count: 0,
      status: true,
      company_id: companies[0]?.id || "",
    });
    setModalType("add-univ");
  };

  const openEditUnivModal = (univ: University) => {
    setSelectedUniv(univ);
    setUnivForm({
      university_name: univ.university_name,
      city: univ.city || "",
      student_count: univ.student_count || 0,
      status: univ.status,
      company_id: univ.company_id,
    });
    setModalType("edit-univ");
  };

  const openAddUserModal = () => {
    setUserForm({
      auth_user_id: crypto.randomUUID(), // Mock generate uuid for client ease
      email: "",
      full_name: "",
      role_name: "DIETITIAN",
      university_id: universities[0]?.id || "",
      phone: "",
      is_active: true,
      company_id: companies[0]?.id || "",
    });
    setModalType("add-user");
  };

  const openEditUserModal = (user: UserProfile) => {
    setSelectedUser(user);
    setUserForm({
      auth_user_id: user.auth_user_id,
      email: user.email,
      full_name: user.full_name,
      role_name: user.role_name,
      university_id: user.university_id || "",
      phone: user.phone || "",
      is_active: user.is_active,
      company_id: user.company_id || "",
    });
    setModalType("edit-user");
  };

  const openAddMenuModal = () => {
    setMenuForm({
      menu_id: crypto.randomUUID(),
      university_id: universities[0]?.id || "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: "ACTIVE",
      is_published: false,
      company_id: companies[0]?.id || "",
    });
    setModalType("add-menu");
  };

  const openEditMenuModal = (menu: MenuAssignment) => {
    setSelectedMenu(menu);
    setMenuForm({
      menu_id: menu.menu_id,
      university_id: menu.university_id,
      start_date: menu.start_date,
      end_date: menu.end_date,
      status: menu.status,
      is_published: menu.is_published,
      company_id: menu.company_id,
    });
    setModalType("edit-menu");
  };

  const openAddCompanyModal = () => {
    setCompanyForm({
      company_name: "",
      tax_number: "",
      email: "",
      phone: "",
      address: "",
      plan_name: "Starter",
      max_users: 5,
      max_universities: 2,
      start_date: new Date().toISOString().split("T")[0],
      expire_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      status: true,
    });
    setModalType("add-company");
  };

  const openEditCompanyModal = (company: Company) => {
    setSelectedCompany(company);
    setCompanyForm({
      company_name: company.company_name,
      tax_number: company.tax_number || "",
      email: company.email || "",
      phone: company.phone || "",
      address: company.address || "",
      plan_name: "Starter",
      max_users: 5,
      max_universities: 2,
      start_date: "",
      expire_date: "",
      status: company.status,
    });
    setModalType("edit-company");
  };

  const openEditLicenseModal = async (company: Company) => {
    setSelectedCompany(company);
    try {
      setLoading(true);
      const lic = await apiGet<License>(`/companies/${company.id}/license`);
      setSelectedLicense(lic);
      setLicenseForm({
        plan_name: lic.plan_name,
        max_users: lic.max_users,
        max_universities: lic.max_universities,
        start_date: lic.start_date,
        expire_date: lic.expire_date,
        status: lic.status,
      });
      setModalType("edit-license");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Lisans bilgisi yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  if (!sessionReady) {
    return (
      <main className="loading-container">
        <div className="spinner"></div>
        <p>Catering SaaS Başlatılıyor...</p>
      </main>
    );
  }

  if (!isAuthed) {
    return (
      <main className="login-shell">
        <section className="login-panel">
          <header className="login-header">
            <div className="logo-shield animate-pulse">
              <ShieldCheck size={40} />
            </div>
            <h1>Catering Yönetim Paneli</h1>
            <p>Çok kiracılı SaaS operasyonlarına güvenli erişim sağlayın.</p>
          </header>

          <div className="auth-tabs">
            <button
              className={`auth-tab-btn ${authMode === "login" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("login");
                setError(null);
                setInfo(null);
              }}
            >
              Giriş Yap
            </button>
            <button
              className={`auth-tab-btn ${authMode === "register" ? "active" : ""}`}
              onClick={() => {
                setAuthMode("register");
                setError(null);
                setInfo(null);
              }}
            >
              Kayıt Ol
            </button>
          </div>
          
          {authMode === "login" ? (
            <div className="login-form">
              <div className="input-group">
                <label>E-posta</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="ornek@catering.com" 
                />
              </div>
              
              <div className="input-group">
                <label>Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button disabled={loading} className="btn btn-primary" onClick={signIn}>
                {loading ? "Giriş Yapılıyor..." : "Giriş Yap"}
              </button>
            </div>
          ) : (
            <div className="login-form">
              <div className="input-group">
                <label>Firma Adı</label>
                <input 
                  type="text" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)} 
                  placeholder="Lale Catering A.Ş." 
                />
              </div>

              <div className="input-group">
                <label>Ad Soyad</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)} 
                  placeholder="Ahmet Yılmaz" 
                />
              </div>

              <div className="input-group">
                <label>E-posta</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="ornek@catering.com" 
                />
              </div>
              
              <div className="input-group">
                <label>Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (En az 6 karakter)"
                />
              </div>

              <button disabled={loading} className="btn btn-primary" onClick={handleRegister}>
                {loading ? "Kayıt Yapılıyor..." : "Kayıt Ol ve Giriş Yap"}
              </button>
            </div>
          )}

          {error && <div className="alert alert-danger" style={{ marginTop: "1rem" }}>{error}</div>}
          {info && <div className="alert alert-success" style={{ marginTop: "1rem" }}>{info}</div>}
        </section>
      </main>
    );
  }


  return (
    <main className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldCheck size={28} />
            <div>
              <strong style={{ fontSize: '18px', fontWeight: '800', color: '#ffffff' }}>YemekhanAI</strong>
              <div className="brand-sub">Üniversite Beslenme Sistemi</div>
            </div>
          </div>
        </div>

        <nav className="nav-menu" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <div className="sidebar-section-title">ANA MENÜ</div>
            <div className="sidebar-section">
              <NavLink 
                to="/catering" 
                end
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
              >
                <LayoutDashboard size={18} /> Dashboard (Catering)
              </NavLink>
            </div>
          </div>

          <div>
            <div className="sidebar-section-title">CATERING YÖNETİMİ</div>
            <div className="sidebar-section">
              {["SUPER_ADMIN", "CATERING_ADMIN"].includes(currentUser?.role_name || "") && (
                <NavLink 
                  to="/catering/universities" 
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                  <Building2 size={18} /> Üniversiteler
                </NavLink>
              )}
              {["SUPER_ADMIN", "CATERING_ADMIN", "UNIVERSITY_ADMIN"].includes(currentUser?.role_name || "") && (
                <NavLink 
                  to="/catering/users" 
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                  <Users size={18} /> Kullanıcılar
                </NavLink>
              )}
              {["SUPER_ADMIN", "CATERING_ADMIN", "UNIVERSITY_ADMIN", "DIETITIAN"].includes(currentUser?.role_name || "") && (
                <NavLink 
                  to="/catering/menu-assignments" 
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                  <Calendar size={18} /> Menü Atamaları
                </NavLink>
              )}
              {currentUser?.role_name === "SUPER_ADMIN" && (
                <NavLink 
                  to="/catering/companies" 
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                >
                  <Key size={18} /> Firmalar & Lisanslar
                </NavLink>
              )}
            </div>
          </div>
        </nav>

        {/* Profile Card, Realtime Indicator & Logout at the bottom */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Realtime bağlantı durumu */}
          <RealtimeIndicator status={realtimeStatus} />

          {currentUser && (
            <div className="user-profile-badge" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <div className="user-avatar" style={{ background: '#2563eb', fontWeight: 'bold' }}>
                {currentUser.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="user-info">
                <strong style={{ color: '#ffffff', fontSize: '13px' }}>{currentUser.full_name}</strong>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {currentUser.role_name === "SUPER_ADMIN" ? "Süper Admin" : ROLE_LABELS[currentUser.role_name as Role] || currentUser.role_name}
                </span>
              </div>
            </div>
          )}
          <button className="btn btn-logout" onClick={signOut} style={{ padding: '8px 12px' }}>
            <LogOut size={16} /> Çıkış Yap
          </button>
        </div>
      </aside>


      {/* Main Content */}
      <section className="content">
        {loading && (
          <div className="loading-overlay">
            <div className="spinner"></div>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="alert alert-danger">
            <span>{error}</span>
            <button className="close-btn" onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}
        {info && (
          <div className="alert alert-success">
            <span>{info}</span>
            <button className="close-btn" onClick={() => setInfo(null)}><X size={16} /></button>
          </div>
        )}

        {/* Views */}
        <Routes>
          <Route path="/" element={<Navigate to="/catering" replace />} />

          <Route path="/inventory" element={
            <div className="placeholder-view">
              <div className="placeholder-icon">📦</div>
              <h2>Malzeme Deposu</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu sonrasında aktif hale gelecektir.
              </p>
            </div>
          } />

          <Route path="/meals" element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🍳</div>
              <h2>Yapılacak Yemekler</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu sonrasında aktif hale gelecektir.
              </p>
            </div>
          } />

          <Route path="/ai-menu" element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🪄</div>
              <h2>AI Menü Planı</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu sonrasında aktif hale gelecektir.
              </p>
            </div>
          } />

          <Route path="/allergies" element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🚨</div>
              <h2>Alerji Profilleri</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu sonrasında aktif hale gelecektir.
              </p>
            </div>
          } />

          <Route path="/holidays" element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🏖️</div>
              <h2>Tatil & Devamsızlık</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu sonrasında aktif hale gelecektir.
              </p>
            </div>
          } />

          <Route path="/dorms" element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🏢</div>
              <h2>Yurtlar</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu sonrasında aktif hale gelecektir.
              </p>
            </div>
          } />

          <Route path="/reports" element={
            <div className="placeholder-view">
              <div className="placeholder-icon">📈</div>
              <h2>Raporlar</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu sonrasında aktif hale gelecektir.
              </p>
            </div>
          } />

          <Route path="/yok-univ" element={
            <div className="placeholder-view">
              <div className="placeholder-icon">🎓</div>
              <h2>YÖK / Üniversite</h2>
              <p>
                YemekhanAI Üniversite Beslenme Sistemi kapsamında bu modül diğer ekip üyeleri tarafından geliştirilmektedir. GitHub entegrasyonu sonrasında aktif hale gelecektir.
              </p>
            </div>
          } />

          <Route path="/catering" element={
            <>
              <div className="catering-tabs-container">
                <NavLink 
                  to="/catering" 
                  end
                  className={({ isActive }) => `catering-tab ${isActive ? "active" : ""}`}
                >
                  Genel Bakış
                </NavLink>
                <NavLink 
                  to="/catering/universities" 
                  className={({ isActive }) => `catering-tab ${isActive ? "active" : ""}`}
                >
                  Üniversiteler
                </NavLink>
                <NavLink 
                  to="/catering/users" 
                  className={({ isActive }) => `catering-tab ${isActive ? "active" : ""}`}
                >
                  Kullanıcılar
                </NavLink>
                <NavLink 
                  to="/catering/menu-assignments" 
                  className={({ isActive }) => `catering-tab ${isActive ? "active" : ""}`}
                >
                  Menü Atamaları
                </NavLink>
                {currentUser?.role_name === "SUPER_ADMIN" && (
                  <NavLink 
                    to="/catering/companies" 
                    className={({ isActive }) => `catering-tab ${isActive ? "active" : ""}`}
                  >
                    Firmalar & Lisanslar
                  </NavLink>
                )}
              </div>
              <Outlet />
            </>
          }>
            <Route index element={
              <>
                <header className="content-header">
                  <div>
                    <h1>Catering Yönetim Paneli</h1>
                    <p>Firma profili, lisans limitleri ve operasyonel özet verileri.</p>
                  </div>
                </header>

                <div className="metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  <article className="metric-card m-blue">
                    <span className="metric-label">FİRMA</span>
                    <strong className="metric-val" style={{ fontSize: '18px', marginTop: '8px', wordBreak: 'break-all' }}>
                      {currentUser?.role_name === "SUPER_ADMIN" ? "Merkezi Sistem (Tüm Firmalar)" : companies.find(c => c.id === currentUser?.company_id)?.company_name || "Lale Catering"}
                    </strong>
                    <span className="metric-sub">
                      Vergi No: {companies.find(c => c.id === currentUser?.company_id)?.tax_number || "1234567890"}
                    </span>
                  </article>
                  <article className="metric-card m-purple">
                    <span className="metric-label">LİSANS PLANI</span>
                    <strong className="metric-val">{dashboard?.active_license ? "Professional" : "Starter"}</strong>
                    <span className="metric-sub">Kalan: {dashboard?.license_days_left ?? 0} Gün</span>
                  </article>
                  <article className="metric-card m-orange">
                    <span className="metric-label">YÖNETİLEN ÜNİVERSİTE</span>
                    <strong className="metric-val">{universities.length}</strong>
                    <span className="metric-sub">Limit: {dashboard?.total_universities ?? 2} üniversite</span>
                  </article>
                  <article className="metric-card m-green">
                    <span className="metric-label">TOPLAM KULLANICI</span>
                    <strong className="metric-val">{users.length}</strong>
                    <span className="metric-sub">Limit: {dashboard?.total_users ?? 5} kullanıcı</span>
                  </article>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginTop: '24px' }}>
                  {/* Left Column: Son Menü Atamaları */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700' }}>Son Menü Atamaları</h3>
                    {menuAssignments.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: 0 }}>Henüz aktif menü ataması bulunmuyor.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {menuAssignments.slice(0, 5).map((menu) => {
                          const uName = universities.find((u) => u.id === menu.university_id)?.university_name || "Üniversite";
                          return (
                            <div key={menu.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                              <div>
                                <strong style={{ display: 'block', fontSize: '14px' }}>{uName}</strong>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  Tarih: {new Date(menu.start_date).toLocaleDateString("tr-TR")} - {new Date(menu.end_date).toLocaleDateString("tr-TR")}
                                </span>
                              </div>
                              <span className={`pill pill-${menu.status.toLowerCase()}`}>
                                {menu.status === "ACTIVE" ? "Aktif" : "Pasif"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Right Column: Dynamic SVG Pie Chart */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '700' }}>Hizmet Verilen Öğrenci Dağılımı</h3>
                    {(() => {
                      const chartData = universities.map(u => ({ name: u.university_name, value: u.student_count || 0 }));
                      const totalVal = chartData.reduce((sum, item) => sum + item.value, 0);
                      
                      if (totalVal === 0) {
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '200px', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px' }}>
                            <span style={{ fontSize: '32px', marginBottom: '8px' }}>📊</span>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Grafik için henüz okul/öğrenci verisi yok.</span>
                          </div>
                        );
                      }
                      
                      let cumulativeAngle = 0;
                      const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
                      
                      const slices = chartData.map((item, index) => {
                        const percentage = item.value / totalVal;
                        const angle = percentage * 360;
                        const r = 70;
                        const cx = 100;
                        const cy = 100;
                        
                        const x1 = cx + r * Math.cos((cumulativeAngle - 90) * Math.PI / 180);
                        const y1 = cy + r * Math.sin((cumulativeAngle - 90) * Math.PI / 180);
                        
                        cumulativeAngle += angle;
                        
                        const x2 = cx + r * Math.cos((cumulativeAngle - 90) * Math.PI / 180);
                        const y2 = cy + r * Math.sin((cumulativeAngle - 90) * Math.PI / 180);
                        
                        const largeArcFlag = angle > 180 ? 1 : 0;
                        const pathData = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
                        
                        return {
                          path: pathData,
                          color: colors[index % colors.length],
                          name: item.name,
                          percentage: (percentage * 100).toFixed(1),
                          value: item.value
                        };
                      });

                      return (
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
                          <svg width="180" height="180" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
                            {slices.map((slice, i) => (
                              <path 
                                key={i} 
                                d={slice.path} 
                                fill={slice.color} 
                                stroke="var(--bg-card)" 
                                strokeWidth="2"
                                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                              />
                            ))}
                            <circle cx="100" cy="100" r="45" fill="var(--bg-card)" />
                          </svg>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: '1', minWidth: '150px' }}>
                            {slices.slice(0, 5).map((slice, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: slice.color, display: 'inline-block' }}></span>
                                <span style={{ flex: '1', fontWeight: '500', color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }} title={slice.name}>{slice.name}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>%{slice.percentage}</span>
                              </div>
                            ))}
                            {slices.length > 5 && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingLeft: '18px' }}>
                                + {slices.length - 5} okul daha var
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            } />

            <Route path="universities" element={
              <>
                <header className="content-header">
                  <div>
                    <h1>Üniversiteler</h1>
                    <p>Catering firmasının hizmet sağladığı kayıtlı üniversiteler.</p>
                  </div>
                  {["SUPER_ADMIN", "CATERING_ADMIN"].includes(currentUser?.role_name || "") && (
                    <button className="btn btn-primary" onClick={openAddUnivModal}>
                      <Plus size={16} /> Yeni Üniversite Ekle
                    </button>
                  )}
                </header>

                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Üniversite Adı</th>
                        <th>Şehir</th>
                        <th>Öğrenci Sayısı</th>
                        <th>Durum</th>
                        <th>Kayıt Tarihi</th>
                        <th className="actions-col">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {universities.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center">Kayıtlı üniversite bulunamadı.</td>
                        </tr>
                      ) : (
                        universities.map((univ) => (
                          <tr key={univ.id}>
                            <td><strong>{univ.university_name}</strong></td>
                            <td>{univ.city ?? "-"}</td>
                            <td>{univ.student_count?.toLocaleString() ?? "-"}</td>
                            <td>
                              <span className={`pill pill-${univ.status ? "active" : "inactive"}`}>
                                {univ.status ? "Aktif" : "Pasif"}
                              </span>
                            </td>
                            <td>{new Date(univ.created_at).toLocaleDateString("tr-TR")}</td>
                            <td className="actions-col">
                              {["SUPER_ADMIN", "CATERING_ADMIN"].includes(currentUser?.role_name || "") ? (
                                <>
                                  <button className="icon-btn btn-edit" onClick={() => openEditUnivModal(univ)}>
                                    <Edit2 size={14} />
                                  </button>
                                  <button className="icon-btn btn-delete" onClick={() => handleDeleteUniv(univ.id)}>
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            } />

            <Route path="users" element={
              <>
                <header className="content-header">
                  <div>
                    <h1>Kullanıcı Yönetimi</h1>
                    <p>Catering personeli ve üniversite yöneticisi hesapları.</p>
                  </div>
                  {["SUPER_ADMIN", "CATERING_ADMIN", "UNIVERSITY_ADMIN"].includes(currentUser?.role_name || "") && (
                    <button className="btn btn-primary" onClick={openAddUserModal}>
                      <Plus size={16} /> Yeni Kullanıcı Davet Et
                    </button>
                  )}
                </header>

                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Ad Soyad</th>
                        <th>E-posta</th>
                        <th>Rol</th>
                        <th>Hizmet Yeri (Üniversite)</th>
                        <th>Telefon</th>
                        <th>Durum</th>
                        <th className="actions-col">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center">Kayıtlı kullanıcı bulunamadı.</td>
                        </tr>
                      ) : (
                        users.map((user) => {
                          const uName = universities.find((u) => u.id === user.university_id)?.university_name || "-";
                          return (
                            <tr key={user.id}>
                              <td><strong>{user.full_name}</strong></td>
                              <td>{user.email}</td>
                              <td>
                                <span className={`badge badge-role ${user.role_name.toLowerCase()}`}>
                                  {ROLE_LABELS[user.role_name as Role] || user.role_name}
                                </span>
                              </td>
                              <td>{uName}</td>
                              <td>{user.phone ?? "-"}</td>
                              <td>
                                <span className={`pill pill-${user.is_active ? "active" : "inactive"}`}>
                                  {user.is_active ? "Aktif" : "Pasif"}
                                </span>
                              </td>
                              <td className="actions-col">
                                {["SUPER_ADMIN", "CATERING_ADMIN", "UNIVERSITY_ADMIN"].includes(currentUser?.role_name || "") ? (
                                  <>
                                    <button className="icon-btn btn-edit" onClick={() => openEditUserModal(user)}>
                                      <Edit2 size={14} />
                                    </button>
                                    {user.auth_user_id !== currentUser?.auth_user_id && (
                                      <button className="icon-btn btn-delete" onClick={() => handleDeleteUser(user.id)}>
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </>
                                ) : "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            } />

            <Route path="menu-assignments" element={
              <>
                <header className="content-header">
                  <div>
                    <h1>Menü Atamaları</h1>
                    <p>AI ile oluşturulan menülerin üniversiteler bazında planlama ve takvimi.</p>
                  </div>
                  {["SUPER_ADMIN", "CATERING_ADMIN", "DIETITIAN"].includes(currentUser?.role_name || "") && (
                    <button className="btn btn-primary" onClick={openAddMenuModal}>
                      <Plus size={16} /> Menü Ata
                    </button>
                  )}
                </header>

                <div className="table-card">
                  <table>
                    <thead>
                      <tr>
                        <th>Menü ID</th>
                        <th>Üniversite</th>
                        <th>Başlangıç Tarihi</th>
                        <th>Bitiş Tarihi</th>
                        <th>Durum</th>
                        <th>Yayın Durumu</th>
                        <th>Atayan Yetkili</th>
                        <th className="actions-col">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {menuAssignments.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center">Kayıtlı menü ataması bulunamadı.</td>
                        </tr>
                      ) : (
                        menuAssignments.map((menu) => {
                          const uName = universities.find((u) => u.id === menu.university_id)?.university_name || "-";
                          const assignerName = users.find((u) => u.id === menu.assigned_by)?.full_name || "Bilinmiyor";
                          return (
                            <tr key={menu.id}>
                              <td><span className="mono">{menu.menu_id.substring(0, 8)}...</span></td>
                              <td><strong>{uName}</strong></td>
                              <td>{new Date(menu.start_date).toLocaleDateString("tr-TR")}</td>
                              <td>{new Date(menu.end_date).toLocaleDateString("tr-TR")}</td>
                              <td>
                                <span className={`pill pill-${menu.status.toLowerCase()}`}>
                                  {menu.status === "ACTIVE" ? "Aktif" : menu.status === "INACTIVE" ? "Pasif" : "Arşivlendi"}
                                </span>
                              </td>
                              <td>
                                <span className={`pill pill-${menu.is_published ? "active" : "inactive"}`}>
                                  {menu.is_published ? "Yayınlandı" : "Taslak"}
                                </span>
                              </td>
                              <td>{assignerName}</td>
                              <td className="actions-col">
                                {["SUPER_ADMIN", "CATERING_ADMIN", "DIETITIAN"].includes(currentUser?.role_name || "") ? (
                                  <>
                                    <button className="icon-btn btn-edit" onClick={() => openEditMenuModal(menu)}>
                                      <Edit2 size={14} />
                                    </button>
                                    {["SUPER_ADMIN", "CATERING_ADMIN"].includes(currentUser?.role_name || "") && (
                                      <button className="icon-btn btn-delete" onClick={() => handleDeleteMenu(menu.id)}>
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </>
                                ) : "-"}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            } />

            <Route path="companies" element={
              currentUser?.role_name === "SUPER_ADMIN" ? (
                <>
                  <header className="content-header">
                    <div>
                      <h1>Catering Firmaları & Lisans Planları</h1>
                      <p>SaaS platformuna kayıtlı tüm catering firmaları, limitleri ve lisansları.</p>
                    </div>
                    <button className="btn btn-primary" onClick={openAddCompanyModal}>
                      <Plus size={16} /> Yeni Firma Ekle
                    </button>
                  </header>

                  <div className="table-card">
                    <table>
                      <thead>
                        <tr>
                          <th>Firma Adı</th>
                          <th>Vergi No</th>
                          <th>E-posta</th>
                          <th>Telefon</th>
                          <th>Durum</th>
                          <th>Lisans Planı</th>
                          <th>Limitler (Üniv/Kullanıcı)</th>
                          <th className="actions-col-wide">İşlemler</th>
                        </tr>
                      </thead>
                      <tbody>
                        {companies.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center">Kayıtlı firma bulunamadı.</td>
                          </tr>
                        ) : (
                          companies.map((comp) => (
                            <tr key={comp.id}>
                              <td><strong>{comp.company_name}</strong></td>
                              <td>{comp.tax_number ?? "-"}</td>
                              <td>{comp.email ?? "-"}</td>
                              <td>{comp.phone ?? "-"}</td>
                              <td>
                                <span className={`pill pill-${comp.status ? "active" : "inactive"}`}>
                                  {comp.status ? "Aktif" : "Pasif"}
                                </span>
                              </td>
                              <td>
                                <span className="badge badge-plan">
                                  {comp.email ? "Professional" : "Starter"}
                                </span>
                              </td>
                              <td>
                                Detay için lisansı düzenleyin
                              </td>
                              <td className="actions-col-wide">
                                <button className="icon-btn btn-edit" title="Firmayı Düzenle" onClick={() => openEditCompanyModal(comp)}>
                                  <Edit2 size={14} /> Firma
                                </button>
                                <button className="icon-btn btn-license" title="Lisansı Düzenle" onClick={() => openEditLicenseModal(comp)}>
                                  <Award size={14} /> Lisans
                                </button>
                                <button className="icon-btn btn-delete" title="Firmayı Sil" onClick={() => handleDeleteCompany(comp.id)}>
                                  <Trash2 size={14} /> Sil
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <Navigate to="/catering" replace />
            } />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      </section>

      {/* Modals */}
      {modalType && (
        <div className="modal-backdrop" onClick={() => setModalType(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>
                {modalType === "add-univ" && "Üniversite Ekle"}
                {modalType === "edit-univ" && "Üniversite Düzenle"}
                {modalType === "add-user" && "Kullanıcı Ekle"}
                {modalType === "edit-user" && "Kullanıcı Düzenle"}
                {modalType === "add-menu" && "Menü Ata"}
                {modalType === "edit-menu" && "Menü Atamasını Düzenle"}
                {modalType === "add-company" && "Firma Ekle"}
                {modalType === "edit-company" && "Firma Bilgilerini Düzenle"}
                {modalType === "edit-license" && `Lisans Yönetimi - ${selectedCompany?.company_name}`}
              </h2>
              <button className="close-btn" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </header>

            <div className="modal-body">
              {/* Add / Edit University */}
              {(modalType === "add-univ" || modalType === "edit-univ") && (
                <>
                  {currentUser?.role_name === "SUPER_ADMIN" && modalType === "add-univ" && (
                    <div className="input-group">
                      <label>Firma</label>
                      <select 
                        value={univForm.company_id} 
                        onChange={(e) => setUnivForm({ ...univForm, company_id: e.target.value })}
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="input-group">
                    <label>Üniversite Adı</label>
                    <input
                      type="text"
                      value={univForm.university_name}
                      onChange={(e) => setUnivForm({ ...univForm, university_name: e.target.value })}
                      placeholder="Örn. İstanbul Teknik Üniversitesi"
                    />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Şehir</label>
                      <input
                        type="text"
                        value={univForm.city}
                        onChange={(e) => setUnivForm({ ...univForm, city: e.target.value })}
                        placeholder="Örn. İstanbul"
                      />
                    </div>
                    <div className="input-group">
                      <label>Öğrenci Sayısı</label>
                      <input
                        type="number"
                        value={univForm.student_count}
                        onChange={(e) => setUnivForm({ ...univForm, student_count: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  {modalType === "edit-univ" && (
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="univ_status"
                        checked={univForm.status}
                        onChange={(e) => setUnivForm({ ...univForm, status: e.target.checked })}
                      />
                      <label htmlFor="univ_status">Aktif Üniversite</label>
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={modalType === "add-univ" ? handleAddUniv : handleEditUniv}>
                    {loading ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </>
              )}

              {/* Add / Edit User */}
              {(modalType === "add-user" || modalType === "edit-user") && (
                <>
                  {currentUser?.role_name === "SUPER_ADMIN" && modalType === "add-user" && (
                    <div className="input-group">
                      <label>Firma</label>
                      <select 
                        value={userForm.company_id} 
                        onChange={(e) => setUserForm({ ...userForm, company_id: e.target.value })}
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {modalType === "add-user" && (
                    <div className="input-group">
                      <label>Auth User ID (Supabase UID)</label>
                      <input
                        type="text"
                        value={userForm.auth_user_id}
                        onChange={(e) => setUserForm({ ...userForm, auth_user_id: e.target.value })}
                        placeholder="UUID girin veya otomatik oluşanı kullanın"
                      />
                    </div>
                  )}
                  <div className="input-row">
                    <div className="input-group">
                      <label>E-posta</label>
                      <input
                        type="email"
                        value={userForm.email}
                        disabled={modalType === "edit-user"}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        placeholder="Örn. ahmet@catering.com"
                      />
                    </div>
                    <div className="input-group">
                      <label>Ad Soyad</label>
                      <input
                        type="text"
                        value={userForm.full_name}
                        onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                        placeholder="Ahmet Yılmaz"
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Telefon</label>
                      <input
                        type="text"
                        value={userForm.phone}
                        onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                        placeholder="555-1234"
                      />
                    </div>
                    <div className="input-group">
                      <label>Rol</label>
                      <select
                        value={userForm.role_name}
                        onChange={(e) => setUserForm({ ...userForm, role_name: e.target.value })}
                      >
                        {currentUser?.role_name === "SUPER_ADMIN" && (
                          <option value="SUPER_ADMIN">Süper Admin</option>
                        )}
                        {currentUser?.role_name !== "UNIVERSITY_ADMIN" && (
                          <option value="CATERING_ADMIN">Catering Yöneticisi</option>
                        )}
                        <option value="UNIVERSITY_ADMIN">Üniversite Yöneticisi</option>
                        <option value="DIETITIAN">Diyetisyen</option>
                        <option value="WAREHOUSE_STAFF">Depo Görevlisi</option>
                        <option value="PURCHASING_STAFF">Satın Alma Sorumlusu</option>
                      </select>
                    </div>
                  </div>
                  {userForm.role_name !== "SUPER_ADMIN" && userForm.role_name !== "CATERING_ADMIN" && (
                    <div className="input-group">
                      <label>Görevli Olduğu Üniversite</label>
                      <select
                        value={userForm.university_id}
                        onChange={(e) => setUserForm({ ...userForm, university_id: e.target.value })}
                      >
                        <option value="">Seçiniz...</option>
                        {universities.map((u) => (
                          <option key={u.id} value={u.id}>{u.university_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {modalType === "edit-user" && (
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="user_active"
                        checked={userForm.is_active}
                        onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                      />
                      <label htmlFor="user_active">Aktif Kullanıcı Hesabı</label>
                    </div>
                  )}
                  <button className="btn btn-primary" onClick={modalType === "add-user" ? handleAddUser : handleEditUser}>
                    {loading ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </>
              )}

              {/* Add / Edit Menu Assignment */}
              {(modalType === "add-menu" || modalType === "edit-menu") && (
                <>
                  {currentUser?.role_name === "SUPER_ADMIN" && modalType === "add-menu" && (
                    <div className="input-group">
                      <label>Firma</label>
                      <select 
                        value={menuForm.company_id} 
                        onChange={(e) => setMenuForm({ ...menuForm, company_id: e.target.value })}
                      >
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {modalType === "add-menu" && (
                    <div className="input-group">
                      <label>Menü ID (AI Modülünden Gelen Benzersiz Kimlik)</label>
                      <input
                        type="text"
                        value={menuForm.menu_id}
                        onChange={(e) => setMenuForm({ ...menuForm, menu_id: e.target.value })}
                        placeholder="UUID formatında"
                      />
                    </div>
                  )}
                  {modalType === "add-menu" && (
                    <div className="input-group">
                      <label>Üniversite</label>
                      <select
                        value={menuForm.university_id}
                        onChange={(e) => setMenuForm({ ...menuForm, university_id: e.target.value })}
                      >
                        {universities.map((u) => (
                          <option key={u.id} value={u.id}>{u.university_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="input-row">
                    <div className="input-group">
                      <label>Başlangıç Tarihi</label>
                      <input
                        type="date"
                        value={menuForm.start_date}
                        onChange={(e) => setMenuForm({ ...menuForm, start_date: e.target.value })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Bitiş Tarihi</label>
                      <input
                        type="date"
                        value={menuForm.end_date}
                        onChange={(e) => setMenuForm({ ...menuForm, end_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Durum</label>
                      <select
                        value={menuForm.status}
                        onChange={(e) => setMenuForm({ ...menuForm, status: e.target.value })}
                      >
                        <option value="ACTIVE">Aktif</option>
                        <option value="INACTIVE">Pasif</option>
                        <option value="ARCHIVED">Arşivlendi</option>
                      </select>
                    </div>
                    <div className="checkbox-group mt-large">
                      <input
                        type="checkbox"
                        id="is_published"
                        checked={menuForm.is_published}
                        onChange={(e) => setMenuForm({ ...menuForm, is_published: e.target.checked })}
                      />
                      <label htmlFor="is_published">Öğrencilere Yayınla</label>
                    </div>
                  </div>
                  <button className="btn btn-primary" onClick={modalType === "add-menu" ? handleAddMenu : handleEditMenu}>
                    {loading ? "Kaydediliyor..." : "Menüyü Ata"}
                  </button>
                </>
              )}

              {/* Add / Edit Company */}
              {(modalType === "add-company" || modalType === "edit-company") && (
                <>
                  <div className="input-group">
                    <label>Firma Adı</label>
                    <input
                      type="text"
                      value={companyForm.company_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                      placeholder="Örn. Lale Catering A.Ş."
                    />
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Vergi Numarası</label>
                      <input
                        type="text"
                        value={companyForm.tax_number}
                        onChange={(e) => setCompanyForm({ ...companyForm, tax_number: e.target.value })}
                        placeholder="Örn. 9988776655"
                      />
                    </div>
                    <div className="input-group">
                      <label>Firma E-postası</label>
                      <input
                        type="email"
                        value={companyForm.email}
                        onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                        placeholder="kurumsal@lale.com"
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Telefon</label>
                      <input
                        type="text"
                        value={companyForm.phone}
                        onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                        placeholder="555-555-5555"
                      />
                    </div>
                    <div className="input-group">
                      <label>Adres</label>
                      <input
                        type="text"
                        value={companyForm.address}
                        onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                        placeholder="Karanfil Sok. No: 12"
                      />
                    </div>
                  </div>

                  {modalType === "add-company" && (
                    <fieldset className="license-fieldset">
                      <legend>İlk Lisans Kurulumu</legend>
                      <div className="input-row">
                        <div className="input-group">
                          <label>Plan Adı</label>
                          <select
                            value={companyForm.plan_name}
                            onChange={(e) => setCompanyForm({ ...companyForm, plan_name: e.target.value })}
                          >
                            <option value="Starter">Starter</option>
                            <option value="Professional">Professional</option>
                            <option value="Enterprise">Enterprise</option>
                          </select>
                        </div>
                        <div className="input-group">
                          <label>Max Üniversite Limiti</label>
                          <input
                            type="number"
                            value={companyForm.max_universities}
                            onChange={(e) => setCompanyForm({ ...companyForm, max_universities: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                        <div className="input-group">
                          <label>Max Kullanıcı Limiti</label>
                          <input
                            type="number"
                            value={companyForm.max_users}
                            onChange={(e) => setCompanyForm({ ...companyForm, max_users: parseInt(e.target.value) || 1 })}
                          />
                        </div>
                      </div>
                      <div className="input-row">
                        <div className="input-group">
                          <label>Başlangıç Tarihi</label>
                          <input
                            type="date"
                            value={companyForm.start_date}
                            onChange={(e) => setCompanyForm({ ...companyForm, start_date: e.target.value })}
                          />
                        </div>
                        <div className="input-group">
                          <label>Bitiş Tarihi</label>
                          <input
                            type="date"
                            value={companyForm.expire_date}
                            onChange={(e) => setCompanyForm({ ...companyForm, expire_date: e.target.value })}
                          />
                        </div>
                      </div>
                    </fieldset>
                  )}

                  {modalType === "edit-company" && (
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        id="comp_status"
                        checked={companyForm.status}
                        onChange={(e) => setCompanyForm({ ...companyForm, status: e.target.checked })}
                      />
                      <label htmlFor="comp_status">Aktif Firma Hesabı</label>
                    </div>
                  )}

                  <button className="btn btn-primary" onClick={modalType === "add-company" ? handleAddCompany : handleEditCompany}>
                    {loading ? "Kaydediliyor..." : "Firma Kaydet"}
                  </button>
                </>
              )}

              {/* Edit License */}
              {modalType === "edit-license" && selectedLicense && (
                <>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Plan Adı</label>
                      <select
                        value={licenseForm.plan_name}
                        onChange={(e) => setLicenseForm({ ...licenseForm, plan_name: e.target.value })}
                      >
                        <option value="Starter">Starter</option>
                        <option value="Professional">Professional</option>
                        <option value="Enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Maksimum Üniversite</label>
                      <input
                        type="number"
                        value={licenseForm.max_universities}
                        onChange={(e) => setLicenseForm({ ...licenseForm, max_universities: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Maksimum Kullanıcı</label>
                      <input
                        type="number"
                        value={licenseForm.max_users}
                        onChange={(e) => setLicenseForm({ ...licenseForm, max_users: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>
                  <div className="input-row">
                    <div className="input-group">
                      <label>Lisans Başlangıcı</label>
                      <input
                        type="date"
                        value={licenseForm.start_date}
                        onChange={(e) => setLicenseForm({ ...licenseForm, start_date: e.target.value })}
                      />
                    </div>
                    <div className="input-group">
                      <label>Lisans Bitişi</label>
                      <input
                        type="date"
                        value={licenseForm.expire_date}
                        onChange={(e) => setLicenseForm({ ...licenseForm, expire_date: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="lic_active"
                      checked={licenseForm.status}
                      onChange={(e) => setLicenseForm({ ...licenseForm, status: e.target.checked })}
                    />
                    <label htmlFor="lic_active">Lisans Aktif</label>
                  </div>
                  <button className="btn btn-primary" onClick={handleEditLicense}>
                    {loading ? "Kaydediliyor..." : "Lisans Bilgilerini Güncelle"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
