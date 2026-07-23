export default function LoadingSpinner({ label = "Yükleniyor", minHeight = 180, size = 42 }) {
  return (
    <div style={{ ...wrap, minHeight }} aria-label={label} role="status">
      <div
        style={{
          ...spinner,
          width: size,
          height: size,
          borderWidth: Math.max(3, Math.round(size / 12)),
        }}
      />
    </div>
  );
}

const wrap = {
  width: "100%",
  display: "grid",
  placeItems: "center",
};

const spinner = {
  borderRadius: "50%",
  borderStyle: "solid",
  borderColor: "var(--border)",
  borderTopColor: "var(--accent)",
  animation: "spin 1s linear infinite",
};
