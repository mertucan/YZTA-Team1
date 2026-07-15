function makeIcon(name) {
  return function Icon({ size = 18, color = "currentColor", style, ...props }) {
    const common = {
      fill: "none",
      stroke: color,
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
    };

    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        style={{ display: "inline-block", flexShrink: 0, color, ...style }}
        {...props}
      >
        {name === "X" ? (
          <>
            <path d="M6 6l12 12" {...common} />
            <path d="M18 6L6 18" {...common} />
          </>
        ) : name === "Download" ? (
          <>
            <path d="M12 4v10" {...common} />
            <path d="M8 10l4 4 4-4" {...common} />
            <path d="M5 20h14" {...common} />
          </>
        ) : name === "Play" ? (
          <path d="M8 5l11 7-11 7z" fill={color} stroke="none" />
        ) : name === "TrendingUp" || name === "Activity" ? (
          <path d="M4 16l5-5 4 4 7-8" {...common} />
        ) : name === "BarChart2" ? (
          <>
            <path d="M6 20V10" {...common} />
            <path d="M12 20V4" {...common} />
            <path d="M18 20v-7" {...common} />
          </>
        ) : name === "Bell" ? (
          <>
            <path d="M6 9a6 6 0 0112 0c0 7 3 6 3 8H3c0-2 3-1 3-8" {...common} />
            <path d="M10 20a2 2 0 004 0" {...common} />
          </>
        ) : name === "Calendar" ? (
          <>
            <rect x="4" y="5" width="16" height="15" rx="2" {...common} />
            <path d="M8 3v4M16 3v4M4 10h16" {...common} />
          </>
        ) : name === "Users" ? (
          <>
            <circle cx="9" cy="8" r="3" {...common} />
            <path d="M3 20a6 6 0 0112 0" {...common} />
            <path d="M16 11a3 3 0 010-6M18 20a5 5 0 00-3-4" {...common} />
          </>
        ) : name === "Settings" || name === "Sliders" ? (
          <>
            <path d="M4 7h16M4 17h16" {...common} />
            <circle cx="9" cy="7" r="2" fill="currentColor" stroke="none" />
            <circle cx="15" cy="17" r="2" fill="currentColor" stroke="none" />
          </>
        ) : name === "FileText" ? (
          <>
            <path d="M6 3h8l4 4v14H6z" {...common} />
            <path d="M14 3v5h5M9 13h6M9 17h6" {...common} />
          </>
        ) : name === "HeartPulse" ? (
          <path d="M20 8c0 6-8 11-8 11S4 14 4 8a4 4 0 017-3 4 4 0 017 3zM8 12h2l1-3 2 6 1-3h2" {...common} />
        ) : name === "Droplets" ? (
          <path d="M12 3s6 7 6 11a6 6 0 01-12 0c0-4 6-11 6-11z" {...common} />
        ) : name === "Utensils" ? (
          <>
            <path d="M7 3v8M4 3v8M10 3v8M4 11h6M7 11v10" {...common} />
            <path d="M16 3v18M16 3c3 2 4 5 4 8h-4" {...common} />
          </>
        ) : name === "Home" ? (
          <>
            <path d="M3 11l9-8 9 8" {...common} />
            <path d="M5 10v10h14V10" {...common} />
          </>
        ) : name === "Apple" ? (
          <>
            <path d="M12 7c-3-2-7 .5-7 5 0 4 3 8 5 8 1 0 1.4-.7 2-.7s1 .7 2 .7c2 0 5-4 5-8 0-4.5-4-7-7-5z" {...common} />
            <path d="M12 6c0-2 1-3 3-4" {...common} />
          </>
        ) : name === "Sparkles" ? (
          <>
            <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" {...common} />
            <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" {...common} />
          </>
        ) : name === "Target" ? (
          <>
            <circle cx="12" cy="12" r="8" {...common} />
            <circle cx="12" cy="12" r="4" {...common} />
            <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          </>
        ) : name === "Clock" ? (
          <>
            <circle cx="12" cy="12" r="9" {...common} />
            <path d="M12 7v6l4 2" {...common} />
          </>
        ) : name === "GitCompare" ? (
          <>
            <path d="M7 4v12a3 3 0 003 3h1" {...common} />
            <path d="M17 20V8a3 3 0 00-3-3h-1" {...common} />
            <path d="M5 6l2-2 2 2M15 18l2 2 2-2" {...common} />
          </>
        ) : name === "RefreshCw" ? (
          <>
            <path d="M20 6v6h-6" {...common} />
            <path d="M4 18v-6h6" {...common} />
            <path d="M6 9a7 7 0 0111-3l3 3M18 15a7 7 0 01-11 3l-3-3" {...common} />
          </>
        ) : name === "Filter" ? (
          <path d="M4 5h16l-6 7v5l-4 2v-7z" {...common} />
        ) : name === "AlertCircle" ? (
          <>
            <circle cx="12" cy="12" r="9" {...common} />
            <path d="M12 8v5M12 17h.01" {...common} />
          </>
        ) : (
          <>
            <circle cx="12" cy="12" r="8" {...common} />
            <path d="M12 8v8M8 12h8" {...common} />
          </>
        )}
      </svg>
    );
  };
}

export const Activity = makeIcon("Activity");
export const AlertCircle = makeIcon("AlertCircle");
export const Download = makeIcon("Download");
export const HeartPulse = makeIcon("HeartPulse");
export const Calendar = makeIcon("Calendar");
export const Play = makeIcon("Play");
export const RefreshCw = makeIcon("RefreshCw");
export const GitCompare = makeIcon("GitCompare");
export const TrendingUp = makeIcon("TrendingUp");
export const Sparkles = makeIcon("Sparkles");
export const Sliders = makeIcon("Sliders");
export const Filter = makeIcon("Filter");
export const FileText = makeIcon("FileText");
export const Utensils = makeIcon("Utensils");
export const Clock = makeIcon("Clock");
export const Home = makeIcon("Home");
export const BarChart2 = makeIcon("BarChart2");
export const Bell = makeIcon("Bell");
export const Settings = makeIcon("Settings");
export const X = makeIcon("X");
export const Apple = makeIcon("Apple");
export const Droplets = makeIcon("Droplets");
export const Users = makeIcon("Users");
export const CheckSquare = makeIcon("CheckSquare");
export const Target = makeIcon("Target");
