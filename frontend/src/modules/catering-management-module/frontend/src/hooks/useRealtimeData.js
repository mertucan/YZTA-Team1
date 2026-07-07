import { useEffect, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "../supabase";

function useRealtimeData({
  onUniversityChange,
  onUserChange,
  onMenuChange,
  onCompanyChange,
  initialUniversities,
  initialUsers,
  initialMenus,
  initialCompanies,
  enabled
}) {
  const [status, setStatus] = useState("connecting");
  const univRef = useRef(initialUniversities);
  const userRef = useRef(initialUsers);
  const menuRef = useRef(initialMenus);
  const compRef = useRef(initialCompanies);

  useEffect(() => {
    univRef.current = initialUniversities;
  }, [initialUniversities]);

  useEffect(() => {
    userRef.current = initialUsers;
  }, [initialUsers]);

  useEffect(() => {
    menuRef.current = initialMenus;
  }, [initialMenus]);

  useEffect(() => {
    compRef.current = initialCompanies;
  }, [initialCompanies]);

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) {
      setStatus("closed");
      return;
    }

    setStatus("connecting");

    const channel = supabase
      .channel("catering-db-changes", {
        config: {
          broadcast: { self: false }
        }
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "universities" }, (payload) => {
        const next = [...univRef.current, payload.new];
        univRef.current = next;
        onUniversityChange(next);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "universities" }, (payload) => {
        const updated = payload.new;
        const next = univRef.current.map((item) =>
          String(item.id) === String(updated.id) ? { ...item, ...updated } : item
        );
        univRef.current = next;
        onUniversityChange(next);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "universities" }, (payload) => {
        const deleted = payload.old;
        const next = univRef.current.filter((item) => String(item.id) !== String(deleted.id));
        univRef.current = next;
        onUniversityChange(next);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "user_profiles" }, (payload) => {
        const next = [...userRef.current, payload.new];
        userRef.current = next;
        onUserChange(next);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "user_profiles" }, (payload) => {
        const updated = payload.new;
        const next = userRef.current.map((item) =>
          String(item.id) === String(updated.id) ? { ...item, ...updated } : item
        );
        userRef.current = next;
        onUserChange(next);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "user_profiles" }, (payload) => {
        const deleted = payload.old;
        const next = userRef.current.filter((item) => String(item.id) !== String(deleted.id));
        userRef.current = next;
        onUserChange(next);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "university_menu_assignments" }, (payload) => {
        const next = [...menuRef.current, payload.new];
        menuRef.current = next;
        onMenuChange(next);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "university_menu_assignments" }, (payload) => {
        const updated = payload.new;
        const next = menuRef.current.map((item) =>
          String(item.id) === String(updated.id) ? { ...item, ...updated } : item
        );
        menuRef.current = next;
        onMenuChange(next);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "university_menu_assignments" }, (payload) => {
        const deleted = payload.old;
        const next = menuRef.current.filter((item) => String(item.id) !== String(deleted.id));
        menuRef.current = next;
        onMenuChange(next);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "companies" }, (payload) => {
        const next = [...compRef.current, payload.new];
        compRef.current = next;
        onCompanyChange(next);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "companies" }, (payload) => {
        const updated = payload.new;
        const next = compRef.current.map((item) =>
          String(item.id) === String(updated.id) ? { ...item, ...updated } : item
        );
        compRef.current = next;
        onCompanyChange(next);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "companies" }, (payload) => {
        const deleted = payload.old;
        const next = compRef.current.filter((item) => String(item.id) !== String(deleted.id));
        compRef.current = next;
        onCompanyChange(next);
      })
      .subscribe((channelStatus) => {
        if (channelStatus === "SUBSCRIBED") {
          setStatus("live");
        } else if (channelStatus === "CHANNEL_ERROR" || channelStatus === "TIMED_OUT") {
          setStatus("error");
        } else if (channelStatus === "CLOSED") {
          setStatus("closed");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onCompanyChange, onMenuChange, onUniversityChange, onUserChange]);

  return { status };
}

export {
  useRealtimeData
};
