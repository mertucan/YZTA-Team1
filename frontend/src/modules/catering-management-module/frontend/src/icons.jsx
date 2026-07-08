const ICON_PATHS = {
  Award: [
    <circle key="a1" cx="12" cy="8" r="6" />,
    <path key="a2" d="M15.5 13.2 17 22l-5-3-5 3 1.5-8.8" />,
  ],
  Building2: [
    <path key="b1" d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />,
    <path key="b2" d="M4 22h16" />,
    <path key="b3" d="M10 6h.01M14 6h.01M10 10h.01M14 10h.01M10 14h.01M14 14h.01" />,
  ],
  Calendar: [
    <path key="c1" d="M8 2v4M16 2v4" />,
    <rect key="c2" x="3" y="4" width="18" height="18" rx="2" />,
    <path key="c3" d="M3 10h18" />,
  ],
  Check: [<path key="ch1" d="m20 6-11 11-5-5" />],
  Edit2: [
    <path key="e1" d="M12 20h9" />,
    <path key="e2" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  ],
  Eye: [
    <path key="ey1" d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />,
    <circle key="ey2" cx="12" cy="12" r="3" />,
  ],
  EyeOff: [
    <path key="eo1" d="m3 3 18 18" />,
    <path key="eo2" d="M10.6 10.6a3 3 0 0 0 4.2 4.2" />,
    <path key="eo3" d="M9.9 5.2A9.4 9.4 0 0 1 12 5c6.5 0 10 7 10 7a17.8 17.8 0 0 1-3.2 4.2" />,
    <path key="eo4" d="M6.6 6.6C3.7 8.6 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.5 4.6-1.2" />,
  ],
  Globe: [
    <circle key="g1" cx="12" cy="12" r="10" />,
    <path key="g2" d="M2 12h20M12 2a15.3 15.3 0 0 1 0 20M12 2a15.3 15.3 0 0 0 0 20" />,
  ],
  Key: [
    <circle key="k1" cx="7.5" cy="14.5" r="3.5" />,
    <path key="k2" d="M10 12 21 1M16 6l2 2M13 9l2 2" />,
  ],
  LayoutDashboard: [
    <rect key="l1" x="3" y="3" width="7" height="9" rx="1" />,
    <rect key="l2" x="14" y="3" width="7" height="5" rx="1" />,
    <rect key="l3" x="14" y="12" width="7" height="9" rx="1" />,
    <rect key="l4" x="3" y="16" width="7" height="5" rx="1" />,
  ],
  LogOut: [
    <path key="lo1" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />,
    <path key="lo2" d="M16 17l5-5-5-5" />,
    <path key="lo3" d="M21 12H9" />,
  ],
  Plus: [<path key="p1" d="M12 5v14M5 12h14" />],
  ShieldCheck: [
    <path key="s1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
    <path key="s2" d="m9 12 2 2 4-5" />,
  ],
  Trash2: [
    <path key="t1" d="M3 6h18" />,
    <path key="t2" d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
    <path key="t3" d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />,
    <path key="t4" d="M10 11v6M14 11v6" />,
  ],
  Users: [
    <path key="u1" d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />,
    <circle key="u2" cx="9" cy="7" r="4" />,
    <path key="u3" d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />,
  ],
  X: [
    <path key="x1" d="M18 6 6 18" />,
    <path key="x2" d="m6 6 12 12" />,
  ],
};

function makeIcon(name) {
  return function Icon({ size = 18, className = "", style = {}, ...props }) {
    return (
      <svg
        aria-hidden="true"
        className={className}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ display: "inline-block", flex: "0 0 auto", ...style }}
        {...props}
      >
        {ICON_PATHS[name]}
      </svg>
    );
  };
}

export const Award = makeIcon("Award");
export const Building2 = makeIcon("Building2");
export const Calendar = makeIcon("Calendar");
export const Check = makeIcon("Check");
export const Edit2 = makeIcon("Edit2");
export const Eye = makeIcon("Eye");
export const EyeOff = makeIcon("EyeOff");
export const Globe = makeIcon("Globe");
export const Key = makeIcon("Key");
export const LayoutDashboard = makeIcon("LayoutDashboard");
export const LogOut = makeIcon("LogOut");
export const Plus = makeIcon("Plus");
export const ShieldCheck = makeIcon("ShieldCheck");
export const Trash2 = makeIcon("Trash2");
export const Users = makeIcon("Users");
export const X = makeIcon("X");
