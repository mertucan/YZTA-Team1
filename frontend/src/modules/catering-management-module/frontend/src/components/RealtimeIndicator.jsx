const CONFIG = {
  connecting: {
    label: "Ba\u011Flan\u0131yor...",
    color: "rgba(234, 179, 8, 0.15)",
    dotColor: "#eab308",
    pulse: true
  },
  live: {
    label: "Canl\u0131 Ba\u011Flant\u0131",
    color: "rgba(16, 185, 129, 0.12)",
    dotColor: "#10b981",
    pulse: true
  },
  closed: {
    label: "Ba\u011Flant\u0131 Yok",
    color: "rgba(148, 163, 184, 0.1)",
    dotColor: "#94a3b8",
    pulse: false
  },
  error: {
    label: "Realtime Kapal\u0131",
    color: "rgba(148, 163, 184, 0.1)",
    dotColor: "#94a3b8",
    pulse: false
  }
};
function RealtimeIndicator({ status }) {
  const cfg = CONFIG[status];
  return <div
    id="realtime-indicator"
    title={`Supabase Realtime: ${cfg.label}`}
    style={{
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "8px 12px",
      borderRadius: "10px",
      background: cfg.color,
      border: `1px solid ${cfg.dotColor}33`,
      fontSize: "12px",
      fontWeight: 600,
      color: cfg.dotColor,
      transition: "all 0.4s ease",
      userSelect: "none"
    }}
  ><span
    style={{
      position: "relative",
      width: "8px",
      height: "8px",
      flexShrink: 0
    }}
  ><span
    style={{
      position: "absolute",
      inset: 0,
      borderRadius: "50%",
      background: cfg.dotColor,
      opacity: cfg.pulse ? 1 : 0.5
    }}
  />{cfg.pulse && <span
    style={{
      position: "absolute",
      inset: "-3px",
      borderRadius: "50%",
      background: cfg.dotColor,
      opacity: 0.3,
      animation: "rt-ping 1.4s cubic-bezier(0,0,0.2,1) infinite"
    }}
  />}</span>{cfg.label}<style>{`
        @keyframes rt-ping {
          0%   { transform: scale(1);   opacity: 0.3; }
          60%  { transform: scale(1.8); opacity: 0; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style></div>;
}
export {
  RealtimeIndicator
};
