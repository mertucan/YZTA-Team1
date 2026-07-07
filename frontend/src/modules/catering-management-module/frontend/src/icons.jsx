const ICONS = {
  Award: "🏅",
  Building2: "🏢",
  Calendar: "📅",
  Check: "✓",
  Edit2: "✎",
  Globe: "🌐",
  Key: "🔑",
  LayoutDashboard: "▦",
  LogOut: "↩",
  Plus: "+",
  ShieldCheck: "🛡",
  Trash2: "🗑",
  Users: "👥",
  X: "×",
};

function makeIcon(name) {
  return function Icon({ size = 18, className = "", style = {}, ...props }) {
    return (
      <span
        aria-hidden="true"
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: size,
          height: size,
          fontSize: Math.max(12, Number(size) || 18),
          lineHeight: 1,
          ...style,
        }}
        {...props}
      >
        {ICONS[name]}
      </span>
    );
  };
}

export const Award = makeIcon("Award");
export const Building2 = makeIcon("Building2");
export const Calendar = makeIcon("Calendar");
export const Check = makeIcon("Check");
export const Edit2 = makeIcon("Edit2");
export const Globe = makeIcon("Globe");
export const Key = makeIcon("Key");
export const LayoutDashboard = makeIcon("LayoutDashboard");
export const LogOut = makeIcon("LogOut");
export const Plus = makeIcon("Plus");
export const ShieldCheck = makeIcon("ShieldCheck");
export const Trash2 = makeIcon("Trash2");
export const Users = makeIcon("Users");
export const X = makeIcon("X");
