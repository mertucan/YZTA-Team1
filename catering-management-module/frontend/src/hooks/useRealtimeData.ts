import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";
import type { Company, MenuAssignment, University, UserProfile } from "../types";

export type RealtimeStatus = "connecting" | "live" | "closed" | "error";

interface RealtimeDataHandlers {
  onUniversityChange: (universities: University[]) => void;
  onUserChange: (users: UserProfile[]) => void;
  onMenuChange: (menus: MenuAssignment[]) => void;
  onCompanyChange: (companies: Company[]) => void;
  initialUniversities: University[];
  initialUsers: UserProfile[];
  initialMenus: MenuAssignment[];
  initialCompanies: Company[];
  enabled: boolean;
}

export function useRealtimeData({
  onUniversityChange,
  onUserChange,
  onMenuChange,
  onCompanyChange,
  initialUniversities,
  initialUsers,
  initialMenus,
  initialCompanies,
  enabled,
}: RealtimeDataHandlers) {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  // Use refs so event handlers always have latest data without stale closures
  const univRef = useRef<University[]>(initialUniversities);
  const userRef = useRef<UserProfile[]>(initialUsers);
  const menuRef = useRef<MenuAssignment[]>(initialMenus);
  const compRef = useRef<Company[]>(initialCompanies);

  // Keep refs in sync whenever parent state changes
  useEffect(() => { univRef.current = initialUniversities; }, [initialUniversities]);
  useEffect(() => { userRef.current = initialUsers; }, [initialUsers]);
  useEffect(() => { menuRef.current = initialMenus; }, [initialMenus]);
  useEffect(() => { compRef.current = initialCompanies; }, [initialCompanies]);

  useEffect(() => {
    if (!enabled) {
      setStatus("closed");
      return;
    }

    setStatus("connecting");

    const channel = supabase
      .channel("catering-db-changes", {
        config: {
          broadcast: { self: false },
        },
      })

      // ─── universities ─────────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "universities" },
        (payload) => {
          const newRow = payload.new as University;
          const next = [...univRef.current, newRow];
          univRef.current = next;
          onUniversityChange(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "universities" },
        (payload) => {
          const updated = payload.new as University;
          const next = univRef.current.map((u) =>
            String(u.id) === String(updated.id) ? { ...u, ...updated } : u
          );
          univRef.current = next;
          onUniversityChange(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "universities" },
        (payload) => {
          const deleted = payload.old as { id: string | number };
          const next = univRef.current.filter(
            (u) => String(u.id) !== String(deleted.id)
          );
          univRef.current = next;
          onUniversityChange(next);
        }
      )

      // ─── user_profiles ────────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_profiles" },
        (payload) => {
          const newRow = payload.new as UserProfile;
          const next = [...userRef.current, newRow];
          userRef.current = next;
          onUserChange(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_profiles" },
        (payload) => {
          const updated = payload.new as UserProfile;
          const next = userRef.current.map((u) =>
            String(u.id) === String(updated.id) ? { ...u, ...updated } : u
          );
          userRef.current = next;
          onUserChange(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "user_profiles" },
        (payload) => {
          const deleted = payload.old as { id: string | number };
          const next = userRef.current.filter(
            (u) => String(u.id) !== String(deleted.id)
          );
          userRef.current = next;
          onUserChange(next);
        }
      )

      // ─── university_menu_assignments ──────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "university_menu_assignments" },
        (payload) => {
          const newRow = payload.new as MenuAssignment;
          const next = [...menuRef.current, newRow];
          menuRef.current = next;
          onMenuChange(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "university_menu_assignments" },
        (payload) => {
          const updated = payload.new as MenuAssignment;
          const next = menuRef.current.map((m) =>
            String(m.id) === String(updated.id) ? { ...m, ...updated } : m
          );
          menuRef.current = next;
          onMenuChange(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "university_menu_assignments" },
        (payload) => {
          const deleted = payload.old as { id: string | number };
          const next = menuRef.current.filter(
            (m) => String(m.id) !== String(deleted.id)
          );
          menuRef.current = next;
          onMenuChange(next);
        }
      )

      // ─── companies ────────────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "companies" },
        (payload) => {
          const newRow = payload.new as Company;
          const next = [...compRef.current, newRow];
          compRef.current = next;
          onCompanyChange(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "companies" },
        (payload) => {
          const updated = payload.new as Company;
          const next = compRef.current.map((c) =>
            String(c.id) === String(updated.id) ? { ...c, ...updated } : c
          );
          compRef.current = next;
          onCompanyChange(next);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "companies" },
        (payload) => {
          const deleted = payload.old as { id: string | number };
          const next = compRef.current.filter(
            (c) => String(c.id) !== String(deleted.id)
          );
          compRef.current = next;
          onCompanyChange(next);
        }
      )

      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") {
          setStatus("live");
        } else if (
          channelStatus === "CHANNEL_ERROR" ||
          channelStatus === "TIMED_OUT"
        ) {
          setStatus("error");
        } else if (channelStatus === "CLOSED") {
          setStatus("closed");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { status };
}
