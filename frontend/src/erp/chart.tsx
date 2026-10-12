import { useEffect, useId, useRef, useState } from "react";
import { dateLabel, money } from "./model";
import { Icon } from "./icons";
type Datum = [string, { sales: number; buys: number }];
export function BusinessChart({ data }: { data: Datum[] }) {
  const id = useId().replaceAll(":", "");
  const [mode, setMode] = useState<"line" | "bars">(
    data.length > 1 ? "line" : "bars",
  );
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(720);
  const plotRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!plotRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured) setWidth(Math.max(280, Math.round(measured)));
    });
    observer.observe(plotRef.current);
    return () => observer.disconnect();
  }, [data.length]);
  const height = 280,
    left = 52,
    right = 18,
    top = 24,
    bottom = 42;
  const maximum = Math.max(1, ...data.flatMap(([, v]) => [v.sales, v.buys]));
  const ceiling = Math.ceil(maximum / 4) * 4;
  const plotHeight = height - top - bottom,
    plotWidth = width - left - right;
  const dates = data.map(([date]) => Date.parse(`${date}T12:00:00Z`));
  const elapsed = Math.max(1, (dates.at(-1) ?? 0) - (dates[0] ?? 0));
  const x = (i: number) =>
    data.length === 1
      ? left + plotWidth / 2
      : left +
        plotWidth * 0.06 +
        ((dates[i] - dates[0]) * (plotWidth * 0.88)) / elapsed;
  const y = (v: number) => top + plotHeight - (v / ceiling) * plotHeight;
  // Each curve stays between consecutive values; it introduces no additional data points.
  const line = (key: "sales" | "buys") =>
    data
      .map(([, v], i) =>
        i === 0
          ? `M ${x(i)} ${y(v[key])}`
          : `C ${(x(i - 1) + x(i)) / 2} ${y(data[i - 1][1][key])}, ${(x(i - 1) + x(i)) / 2} ${y(v[key])}, ${x(i)} ${y(v[key])}`,
      )
      .join(" ");
  const minimumStep =
    data.length > 1
      ? Math.min(...data.slice(1).map((_, i) => x(i + 1) - x(i)))
      : Infinity;
  const barWidth = Math.min(
    34,
    plotWidth / Math.max(1, data.length) / 4,
    minimumStep / 3,
  );
  const compact = (n: number) =>
    new Intl.NumberFormat("es-PE", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  if (!data.length)
    return (
      <div className="chart-empty">
        <span className="empty-icon">
          <Icon name="line" size={24} />
        </span>
        <h3>Sin actividad en este período</h3>
        <p>Las compras y ventas aparecerán aquí cuando se registren.</p>
      </div>
    );
  const selected = active === null ? null : data[active];
  return (
    <div className="chart-component">
      <div className="chart-toolbar">
        <div className="chart-legend">
          <span>
            <i className="legend-dot sales" />
            Ventas facturadas
          </span>
          <span>
            <i className="legend-dot buys" />
            Compras ordenadas
          </span>
        </div>
        <div className="chart-switch" role="group" aria-label="Tipo de gráfico">
          <button
            aria-label="Gráfico de líneas"
            aria-pressed={mode === "line"}
            onClick={() => setMode("line")}
          >
            <Icon name="line" size={15} />
          </button>
          <button
            aria-label="Gráfico de barras"
            aria-pressed={mode === "bars"}
            onClick={() => setMode("bars")}
          >
            <Icon name="report" size={15} />
          </button>
        </div>
      </div>
      <div
        ref={plotRef}
        className="chart-plot"
        onMouseLeave={() => setActive(null)}
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label="Ventas facturadas y compras ordenadas por fecha"
          className="enterprise-chart"
        >
          <defs>
            <linearGradient id={`chart-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--chart-sales)"
                stopOpacity=".1"
              />
              <stop
                offset="100%"
                stopColor="var(--chart-sales)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1={left}
                x2={width - right}
                y1={y((ceiling * i) / 4)}
                y2={y((ceiling * i) / 4)}
                className="chart-grid"
              />
              <text
                x={left - 12}
                y={y((ceiling * i) / 4) + 4}
                textAnchor="end"
                className="chart-label"
              >
                {compact((ceiling * i) / 4)}
              </text>
            </g>
          ))}
          <text x={left - 12} y={12} textAnchor="end" className="chart-unit">
            PEN
          </text>
          {mode === "line" ? (
            <>
              <path
                d={`${line("sales")} L ${x(data.length - 1)} ${y(0)} L ${x(0)} ${y(0)} Z`}
                fill={`url(#chart-fill-${id})`}
              />
              <path d={line("buys")} className="chart-line purchases-line" />
              <path d={line("sales")} className="chart-line sales-line" />
              {data.map(([, v], i) => (
                <g key={i}>
                  <circle
                    cx={x(i)}
                    cy={y(v.buys)}
                    r={active === i ? 4.5 : 3}
                    className="chart-point purchases-point"
                  />
                  <circle
                    cx={x(i)}
                    cy={y(v.sales)}
                    r={active === i ? 4.5 : 3}
                    className="chart-point sales-point"
                  />
                </g>
              ))}
            </>
          ) : (
            data.map(([, v], i) => (
              <g key={i} className="chart-bar-pair">
                <rect
                  x={x(i) - barWidth - 3}
                  y={y(v.sales)}
                  width={barWidth}
                  height={Math.max(0, y(0) - y(v.sales))}
                  rx={4}
                  className="sales-bar"
                />
                <rect
                  x={x(i) + 3}
                  y={y(v.buys)}
                  width={barWidth}
                  height={Math.max(0, y(0) - y(v.buys))}
                  rx={4}
                  className="purchases-bar"
                />
              </g>
            ))
          )}
          {active !== null && (
            <line
              x1={x(active)}
              x2={x(active)}
              y1={top}
              y2={y(0)}
              className="chart-guide"
            />
          )}
          {data.map(([date, v], i) => (
            <g key={date}>
              {(data.length <= 8 ||
                i === 0 ||
                i === data.length - 1 ||
                i % Math.ceil(data.length / 6) === 0) && (
                <text
                  x={x(i)}
                  y={height - 14}
                  textAnchor="middle"
                  className="chart-label"
                >
                  {dateLabel(date).slice(0, 5)}
                </text>
              )}
              <rect
                x={x(i) - Math.min(32, plotWidth / data.length / 2)}
                y={top}
                width={Math.min(64, plotWidth / data.length)}
                height={plotHeight}
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${dateLabel(date)}: ventas ${money(v.sales)}, compras ${money(v.buys)}`}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setActive(null);
                }}
              />
            </g>
          ))}
        </svg>
        {selected && (
          <div
            className="chart-tooltip"
            role="status"
            style={{
              left: `${Math.max(25, Math.min(75, (x(active!) / width) * 100))}%`,
            }}
          >
            <strong>{dateLabel(selected[0])}</strong>
            <span>
              <i className="legend-dot sales" />
              Ventas<b>{money(selected[1].sales)}</b>
            </span>
            <span>
              <i className="legend-dot buys" />
              Compras<b>{money(selected[1].buys)}</b>
            </span>
          </div>
        )}
      </div>
      {data.length === 1 && (
        <p className="chart-caption">
          Un día con actividad en el período seleccionado.
        </p>
      )}
    </div>
  );
}
export function DashboardSkeleton() {
  return (
    <div
      className="dashboard-skeleton"
      role="status"
      aria-label="Cargando panel de control"
    >
      <div className="skeleton skeleton-title" />
      <div className="skeleton-grid">
        {[0, 1, 2, 3].map((i) => (
          <div className="card skeleton-card" key={i}>
            <div className="skeleton skeleton-label" />
            <div className="skeleton skeleton-value" />
          </div>
        ))}
      </div>
      <div className="card skeleton skeleton-chart" />
      <span className="sr-only">Cargando estadísticas…</span>
    </div>
  );
}
