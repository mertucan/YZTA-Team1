import React from "react";

export function ResponsiveContainer({ children, width = "100%", height = 260 }) {
  return (
    <div style={{ width, height, minHeight: height, position: "relative" }}>
      {children}
    </div>
  );
}

function collectSeries(children) {
  const series = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (["Area", "Line", "Bar", "Scatter"].includes(child.type?.displayName)) {
      series.push(child.props);
    }
    if (child.props?.children) {
      series.push(...collectSeries(child.props.children));
    }
  });
  return series;
}

function getRows(chartData, item) {
  const rows = item?.data || chartData || [];
  return Array.isArray(rows) ? rows : [];
}

function getValue(row, key) {
  return Number(row?.[key] ?? 0);
}

function getDomain(rows, series, axisKey) {
  const values = rows.flatMap((row) =>
    series.map((item) => getValue(row, axisKey || item.dataKey))
  );
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  return { min, max, span: Math.max(1, max - min) };
}

function pointFor(row, index, rows, item, domain, width, height, padding) {
  const x = rows.length <= 1
    ? width / 2
    : padding.left + (index / (rows.length - 1)) * (width - padding.left - padding.right);
  const raw = getValue(row, item.dataKey);
  const y = height - padding.bottom - ((raw - domain.min) / domain.span) * (height - padding.top - padding.bottom);
  return { x, y, value: raw };
}

function ChartFrame({ data = [], children, type = "line" }) {
  const series = collectSeries(children);
  const firstRows = getRows(data, series[0]);
  const rows = firstRows.length ? firstRows : data;
  const padding = { top: 20, right: 24, bottom: 34, left: 42 };
  const width = 760;
  const height = 280;

  if (!series.length || !rows.length) {
    return (
      <div className="hra-chart-empty-state">
        <strong>Grafik verisi yok</strong>
        <span>Bu grafik için henüz gösterilecek kayıt bulunmuyor.</span>
      </div>
    );
  }

  const domain = getDomain(rows, series);
  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="hra-chart-svg-wrap">
      <svg className="hra-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img">
        <rect x="0" y="0" width={width} height={height} fill="transparent" />
        {gridLines.map((ratio) => {
          const y = padding.top + ratio * (height - padding.top - padding.bottom);
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e2e8f0" strokeDasharray="4 4" />
              <text x={10} y={y + 4} fill="#64748b" fontSize="11">
                {Math.round(domain.max - ratio * domain.span)}
              </text>
            </g>
          );
        })}

        {type === "bar" && series.map((item, itemIndex) => {
          const itemRows = getRows(data, item);
          const barGap = 6;
          const groupWidth = (width - padding.left - padding.right) / Math.max(1, itemRows.length);
          const barWidth = Math.max(8, (groupWidth - barGap) / Math.max(1, series.length));
          return itemRows.map((row, rowIndex) => {
            const value = getValue(row, item.dataKey);
            const barHeight = ((value - domain.min) / domain.span) * (height - padding.top - padding.bottom);
            const x = padding.left + rowIndex * groupWidth + itemIndex * barWidth + barGap / 2;
            const y = height - padding.bottom - barHeight;
            return (
              <rect
                key={`${item.dataKey}-${rowIndex}`}
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx="4"
                fill={item.fill || item.stroke || "#0d9488"}
                opacity="0.9"
              />
            );
          });
        })}

        {(type === "line" || type === "area") && series.map((item, itemIndex) => {
          const itemRows = getRows(data, item);
          const points = itemRows.map((row, index) => pointFor(row, index, itemRows, item, domain, width, height, padding));
          const path = points.map((p, index) => `${index === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
          const areaPath = `${path} L${points[points.length - 1].x},${height - padding.bottom} L${points[0].x},${height - padding.bottom} Z`;
          const color = item.stroke || item.fill || ["#0d9488", "#ef4444", "#f59e0b"][itemIndex % 3];
          return (
            <g key={item.dataKey}>
              {type === "area" && <path d={areaPath} fill={color} opacity="0.12" />}
              <path d={path} fill="none" stroke={color} strokeWidth={item.strokeWidth || 2.5} strokeLinecap="round" strokeLinejoin="round" />
              {points.map((p, index) => (
                <circle key={index} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={color} strokeWidth="2" />
              ))}
            </g>
          );
        })}

        {type === "scatter" && series.map((item) => {
          const itemRows = getRows(data, item);
          const xKey = "calories";
          const yKey = "iron";
          const xDomain = getDomain(itemRows, [{ dataKey: xKey }], xKey);
          const yDomain = getDomain(itemRows, [{ dataKey: yKey }], yKey);
          return itemRows.map((row, index) => {
            const x = padding.left + ((getValue(row, xKey) - xDomain.min) / xDomain.span) * (width - padding.left - padding.right);
            const y = height - padding.bottom - ((getValue(row, yKey) - yDomain.min) / yDomain.span) * (height - padding.top - padding.bottom);
            return <circle key={index} cx={x} cy={y} r="4" fill={item.fill || "#14b8a6"} opacity={item.fillOpacity || 0.8} />;
          });
        })}

        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="#cbd5e1" />
        <line x1={padding.left} x2={padding.left} y1={padding.top} y2={height - padding.bottom} stroke="#cbd5e1" />
        {rows.map((row, index) => {
          const x = rows.length <= 1
            ? width / 2
            : padding.left + (index / (rows.length - 1)) * (width - padding.left - padding.right);
          const label = row.name || row.period || "";
          return index % Math.ceil(rows.length / 6) === 0 ? (
            <text key={index} x={x} y={height - 10} textAnchor="middle" fill="#64748b" fontSize="11">
              {String(label).slice(0, 8)}
            </text>
          ) : null;
        })}
      </svg>
      <div className="hra-chart-legend">
        {series.map((item, index) => (
          <span key={`${item.dataKey}-${index}`}>
            <i style={{ background: item.stroke || item.fill || "#0d9488" }} />
            {item.name || item.dataKey}
          </span>
        ))}
      </div>
    </div>
  );
}

export function AreaChart(props) {
  return <ChartFrame {...props} type="area" />;
}

export function BarChart(props) {
  return <ChartFrame {...props} type="bar" />;
}

export function LineChart(props) {
  return <ChartFrame {...props} type="line" />;
}

export function ScatterChart({ children, ...props }) {
  return <ChartFrame {...props} type="scatter">{children}</ChartFrame>;
}

export function Area() { return null; }
Area.displayName = "Area";
export function Bar() { return null; }
Bar.displayName = "Bar";
export function Line() { return null; }
Line.displayName = "Line";
export function Scatter() { return null; }
Scatter.displayName = "Scatter";
export function CartesianGrid() { return null; }
export function Legend() { return null; }
export function Tooltip() { return null; }
export function XAxis() { return null; }
export function YAxis() { return null; }
export function ReferenceLine() { return null; }
export function Cell() { return null; }
