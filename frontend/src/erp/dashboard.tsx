import { useState, useEffect, useRef, useId } from "react";
import {
  ShoppingCart,
  TrendingUp,
  PackageX as PackageWarning,
  ChartNoAxesCombined,
  ArrowUpRight,
  Wallet,
  ReceiptText,
  Ellipsis,
  Eye,
  ArrowRight,
  CircleAlert,
} from "lucide-react";
import { useErp } from "./store";
import {
  dashboardData,
  chartBuckets,
  dailyChartBuckets,
  type ChartPeriod,
} from "./dashboard-data";
import { money, dateLabel, today } from "./model";
import { ExportMenu, Records, Tag, DocDetail } from "./ui";
import { ProductDetailsTrigger } from "./products";

function OrderActions({
  id,
  number,
  onDetails,
}: {
  id: string;
  number: string;
  onDetails: () => void;
}) {
  const menu = useRef<HTMLDivElement>(null);
  const close = () => menu.current?.hidePopover();
  return (
    <>
      <button
        className="ed-order-actions"
        aria-label={`Acciones de ${number}`}
        aria-haspopup="menu"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const node = menu.current!;
          node.style.left = `${Math.max(12, Math.min(innerWidth - 170, rect.right - 155))}px`;
          node.style.top = `${rect.bottom + 90 > innerHeight ? rect.top - 85 : rect.bottom + 5}px`;
          node.togglePopover();
        }}
      >
        <Ellipsis size={17} />
      </button>
      <div
        ref={menu}
        id={`order-actions-${id}`}
        className="ed-native-menu"
        popover="auto"
      >
        <button
          onClick={() => {
            close();
            onDetails();
          }}
        >
          <Eye size={14} />
          Ver detalle
        </button>
        <a href="/orden-venta" onClick={close}>
          Ir a ventas <ArrowUpRight size={13} />
        </a>
      </div>
    </>
  );
}
// Monotone cubic interpolation keeps curves inside adjacent values.
function chartCurve(points: {x: number; y: number}[]) {
  if (!points.length) return "";
  const slopes = points.slice(1).map((p, i) => (p.y - points[i].y) / (p.x - points[i].x));
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0] ?? 0;
    if (i === points.length - 1) return slopes.at(-1) ?? 0;
    const a = slopes[i - 1], b = slopes[i];
    return a * b <= 0 ? 0 : Math.sign(a) * Math.min(Math.abs((a + b) / 2), 2 * Math.abs(a), 2 * Math.abs(b));
  });
  return `M ${points[0].x} ${points[0].y}` + points.slice(1).map((p, i) => {
    const before = points[i], dx = (p.x - before.x) / 3;
    return ` C ${before.x + dx} ${before.y + dx * tangents[i]}, ${p.x - dx} ${p.y - dx * tangents[i + 1]}, ${p.x} ${p.y}`;
  }).join("");
}
function ExecutiveChart({ period }: { period: ChartPeriod }) {
  const { state } = useErp();
  const data = chartBuckets(state, period);
  const gradient = useId();
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(900);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  const max = Math.max(1, ...data.flatMap((d) => [d.sales, d.buys]));
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const ceiling = Math.ceil(max / magnitude) * magnitude;
  const left = 54, right = 20, top = 18, height = 265, bottom = 42;
  const plotHeight = height - top - bottom, baseline = top + plotHeight;
  const step = (width - left - right) / Math.max(1, data.length - 1);
  const points = (key: "sales" | "buys") => data.map((d, i) => ({x: data.length === 1 ? (left + width - right) / 2 : left + i * step, y: baseline - d[key] / ceiling * plotHeight}));
  const sales = points("sales"), buys = points("buys");
  const selected = active === null ? null : data[active];
  const compact = (n: number) => new Intl.NumberFormat("es-PE", {notation: "compact", maximumFractionDigits: 1}).format(n);
  return <div className="ed-chart ed-line-chart" ref={root}>
    <div className="ed-legend"><span><i />Ventas</span><span><i />Compras</span><small>Importes con IGV · {dateLabel(data[0].start)} – {dateLabel(data.at(-1)!.end)}</small></div>
    <svg className="enterprise-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Ventas y compras agrupadas por ${period.toLowerCase()} hasta ${dateLabel(data.at(-1)!.end)}`}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--ed-chart-sales)" stopOpacity=".16" /><stop offset="100%" stopColor="var(--ed-chart-sales)" stopOpacity="0" /></linearGradient></defs>
      {[0, 1, 2, 3, 4].map((i) => <g key={i}><line x1={left} x2={width - right} y1={top + plotHeight * i / 4} y2={top + plotHeight * i / 4} stroke="var(--line)" strokeDasharray="3 4" /><text x={left - 10} y={top + plotHeight * i / 4 + 4} textAnchor="end" fill="var(--mute)" fontSize="10">{compact(ceiling * (4 - i) / 4)}</text></g>)}
      <path className="ed-sales-area" d={`${chartCurve(sales)} L ${sales.at(-1)!.x} ${baseline} L ${sales[0].x} ${baseline} Z`} fill={`url(#${gradient})`} />
      <path className="ed-purchases-line" d={chartCurve(buys)} fill="none" stroke="var(--ed-chart-purchases)" strokeWidth="2" strokeDasharray="4 4" />
      <path className="ed-sales-line" d={chartCurve(sales)} fill="none" stroke="var(--ed-chart-sales)" strokeWidth="2.5" />
      {data.length === 1 && <g><circle cx={sales[0].x} cy={sales[0].y} r="4" fill="var(--ed-chart-sales)" /><circle cx={buys[0].x} cy={buys[0].y} r="3" fill="var(--ed-chart-purchases)" /></g>}
      {active !== null && <g pointerEvents="none"><line x1={sales[active].x} x2={sales[active].x} y1={top} y2={baseline} stroke="var(--border-strong)" strokeDasharray="3 4" /><circle cx={sales[active].x} cy={sales[active].y} r="4" fill="var(--ed-chart-sales)" stroke="var(--panel)" strokeWidth="2" /><circle cx={buys[active].x} cy={buys[active].y} r="4" fill="var(--ed-chart-purchases)" stroke="var(--panel)" strokeWidth="2" /></g>}
      {data.map((d, i) => {
        const x = data.length === 1 ? (left + width - right) / 2 : left + step * i, start = Math.max(left, x - step / 2), end = Math.min(width - right, x + step / 2);
        return <g key={d.start} className="chart-period-point">{(i === 0 || i === data.length - 1 || i % Math.max(1, Math.ceil(data.length / (width < 450 ? 4 : 8))) === 0 && i < data.length - 2) && <text x={x} y={height - 15} textAnchor="middle" fontSize={width < 450 ? "9" : "11"} fill="var(--mute)">{d.label}</text>}<rect tabIndex={0} role="button" aria-label={`${dateLabel(d.start)} al ${dateLabel(d.end)}: ventas ${money(d.sales)}, compras ${money(d.buys)}`} x={start} y={top} width={end - start} height={plotHeight} fill="transparent" onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(i)} onBlur={() => setActive(null)} onClick={() => setActive(i)} onKeyDown={(e) => {if (e.key === "Escape") setActive(null); if (e.key === "Enter" || e.key === " ") {e.preventDefault(); setActive(i);} }} /></g>;
      })}
    </svg>
    {selected && <div className="ed-tooltip chart-tooltip" role="status"><strong>{dateLabel(selected.start)} – {dateLabel(selected.end)}</strong><span>Ventas <b>{money(selected.sales)}</b></span><span>Compras <b>{money(selected.buys)}</b></span></div>}
    {data.every((d) => !d.sales && !d.buys) && <p className="ed-chart-empty">Sin operaciones en este período.</p>}
    <div className="ed-chart-summary"><span>Total ventas<strong>{money(data.reduce((sum, d) => sum + d.sales, 0))}</strong></span><span>Total compras<strong>{money(data.reduce((sum, d) => sum + d.buys, 0))}</strong></span></div>
  </div>;
}
export function Dashboard() {
  const { state } = useErp();
  const raw = dashboardData(state);
  const data = {...raw, alerts: raw.receivables.filter((r) => r.overdue !== null && r.overdue >= -7).sort((a, b) => (b.overdue ?? 0) - (a.overdue ?? 0)).slice(0, 5).map((r) => ({...r, balance: r.doc.balance, type: "Cobrar"}))};
  const [detail, setDetail] = useState("");
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("Diario");
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const labels = ["Vigente", "1–30 días", "31–60 días", "Más de 60 días"];
  const dashboardExportData = {
    name: "panel-ejecutivo",
    title: "Resumen ejecutivo",
    profile: "dashboard" as const,
    company: { name: state.settings.company },
    subtitle: "Indicadores acumulados, cartera e inventario del negocio.",
    summary: [
      { label: "Ventas totales", value: data.salesTotal },
      { label: "Compras totales", value: data.purchasesTotal },
      {
        label: "Utilidad bruta",
        value: data.profit ?? "Sin datos suficientes",
      },
      { label: "Cuentas por cobrar", value: data.debt },
    ],
    sections: [
      {
        title: "Actividad comercial",
        description:
          "Acumulado de documentos válidos registrados en el período.",
        items: [
          {
            label: "Ventas facturadas",
            value: money(data.salesTotal),
            detail: `${data.sales.length} comprobantes válidos`,
          },
          {
            label: "Compras registradas",
            value: money(data.purchasesTotal),
            detail: `${data.purchases.length} órdenes válidas`,
          },
          {
            label: "Utilidad bruta estimada",
            value:
              data.profit === null
                ? "Sin datos suficientes"
                : money(data.profit),
            detail:
              data.margin === null
                ? "Requiere costos de salida completos"
                : `Margen estimado ${data.margin.toFixed(1)}%`,
          },
        ],
      },
      {
        title: "Cartera y obligaciones",
        description: "Saldos pendientes que requieren seguimiento financiero.",
        items: [
          {
            label: "Cuentas por cobrar",
            value: money(data.debt),
            detail: `${data.receivables.length} documentos con saldo · ${data.overdue} vencidos`,
          },
        ],
      },
      {
        title: "Inventario y pedidos",
        description:
          "Existencias críticas y pedidos pendientes de facturación.",
        items: [
          {
            label: "Productos con stock crítico",
            value: data.criticalProducts,
            detail: "Productos únicos en mínimo o por debajo del mínimo",
          },
          {
            label: "Pedidos por facturar",
            value: data.pendingInvoices.length,
            detail: `Importe pendiente de facturación: ${money(data.pendingInvoiceTotal)}`,
          },
        ],
      },
      {
        title: "Alertas de seguimiento",
        description: "Documentos próximos a vencer o ya vencidos.",
        items: data.alerts.length
          ? data.alerts.slice(0, 5).map((alert) => ({
              label: `${alert.type} · ${alert.doc.number}`,
              value: money(alert.balance),
              detail:
                (alert.overdue ?? 0) > 0
                  ? `${alert.overdue ?? 0} días vencidos`
                  : "Próximo a vencer",
            }))
          : [
              {
                label: "Sin alertas activas",
                value: "—",
                detail: "No hay vencimientos próximos registrados",
              },
            ],
      },
    ],
    charts: [
      {
        type: "donut" as const,
        title: "Distribución comercial",
        data: [
          { label: "Ventas", value: data.salesTotal },
          { label: "Compras", value: data.purchasesTotal },
        ],
      },
      {
        type: "bars" as const,
        title: "Saldos pendientes",
        data: [
          { label: "Por cobrar", value: data.debt },
        ],
      },
      {
        type: "bars" as const,
        title: "Inventario crítico",
        data: [
          { label: "Críticos", value: data.criticalProducts },
          {
            label: "Sin alerta",
            value: Math.max(
              0,
              state.products.filter((product) => product.active).length -
                data.criticalProducts,
            ),
          },
        ],
      },
    ],
    headers: [
      "Sección",
      "Indicador / documento",
      "Importe / valor",
      "Fecha / período",
      "Origen",
    ],
    rows: [
      [
        "Indicadores",
        "Ventas totales",
        data.salesTotal,
        "Acumulado",
        "CP válidos",
      ],
      [
        "Indicadores",
        "Compras totales",
        data.purchasesTotal,
        "Acumulado",
        "OC válidas",
      ],
      [
        "Indicadores",
        "Utilidad bruta estimada",
        data.profit ?? "Sin datos suficientes",
        "Acumulado",
        "Kardex, IGV 18%",
      ],
      [
        "Indicadores",
        "Productos con stock crítico",
        data.criticalProducts,
        "Actual",
        "Productos únicos por almacén",
      ],
      ["Finanzas", "Cuentas por cobrar", data.debt, "Saldo actual", "CP"],
      [
        "Ventas",
        "Pedidos por facturar",
        data.pendingInvoices.length,
        money(data.pendingInvoiceTotal),
        "Pedidos pendientes hasta hoy",
      ],
      ...data.receivables.map((r) => [
        "Cuentas por cobrar",
        r.doc.number,
        r.doc.balance,
        r.due ?? "Sin vencimiento",
        "Registrado",
      ]),
      ...(state.inventoryValuations ?? []).map((v) => [
        "Inventario",
        "Valoración registrada",
        v.value,
        v.date,
        "Registrado",
      ]),
      ...dailyChartBuckets(state).flatMap((d) => [
        ["Gráfico", "Ventas", d.sales, `${d.start} / ${d.end}`, "Diario"],
        ["Gráfico", "Compras", d.buys, `${d.start} / ${d.end}`, "Diario"],
      ]),
      ...data.orders.map((d) => [
        "Órdenes de venta",
        d.number,
        d.total,
        d.date,
        d.status,
      ]),
    ],
  };
  const kpis = [
    {
      label: "Ventas totales",
      value: money(data.salesTotal),
      description: `${data.sales.length} comprobantes válidos · IGV incluido`,
      icon: TrendingUp,
      tone: "blue",
    },
    {
      label: "Compras totales",
      value: money(data.purchasesTotal),
      description: `${data.purchases.length} órdenes válidas · IGV incluido`,
      icon: ShoppingCart,
      tone: "teal",
    },
    {
      label: "Utilidad bruta",
      value:
        data.profit === null ? "Sin datos suficientes" : money(data.profit),
      description:
        data.margin === null
          ? "Requiere costos de salida vinculados"
          : `Margen ${data.margin.toFixed(1)}% · Estimada sin IGV (18%)`,
      icon: ChartNoAxesCombined,
      tone: "violet",
    },
    {
      label: "Productos con stock crítico",
      value: String(data.criticalProducts),
      description: "Productos únicos al mínimo o por debajo",
      icon: PackageWarning,
      tone: "amber",
      href: "/stock-productos",
    },
  ];
  return (
    <div className="executive-dashboard">
      <header className="ed-header">
        <div>
          <div className="ed-eyebrow">PANEL DE CONTROL · RESUMEN EJECUTIVO</div>
          <h1>{greeting}, Administrador</h1>
          <p>Resumen general de las operaciones de EnterpriseCloud</p>
        </div>
        <ExportMenu data={dashboardExportData} />
      </header>
      <section className="ed-kpis" aria-label="Indicadores principales">
        {kpis.map((k) => (
          <article className="ed-kpi" key={k.label}>
            <div className="ed-kpi-label">
              <span>{k.label}</span>
              <span className={`ed-icon ${k.tone}`}>
                <k.icon size={18} />
              </span>
            </div>
            <strong
              className={
                k.value === "Sin datos suficientes" ? "ed-unavailable" : ""
              }
            >
              {k.value}
            </strong>
            <div className="ed-kpi-bottom">
              <small>{k.description}</small>
              {k.href && (
                <a href={k.href} aria-label="Consultar inventario crítico">
                  <ArrowUpRight size={17} />
                </a>
              )}
            </div>
          </article>
        ))}
      </section>
      <section className="ed-finance">
        <article className="ed-card">
          <div className="ed-card-title">
            <span className="ed-icon blue">
              <Wallet size={18} />
            </span>
            <h2>Cuentas por cobrar</h2>
            <a href="/estado-cuenta">
              Ver detalle <ArrowUpRight size={13} />
            </a>
          </div>
          <strong className="ed-finance-value">{money(data.debt)}</strong>
          <p className="ed-muted">
            {data.receivables.length} cuentas pendientes{" "}
            <span>· {data.overdue} vencidas</span>
          </p>
          <div className="ed-aging" aria-label="Antigüedad por saldo pendiente">
            {data.aging.map((amount, i) => (
              <span
                key={i}
                className={`age-${i}`}
                style={{ flex: amount || 0 }}
                title={`${labels[i]}: ${money(amount)}`}
              />
            ))}
          </div>
          <div className="ed-aging-labels">
            {labels.map((label, i) => (
              <div key={label}>
                <i className={`age-${i}`} />
                <span>
                  {label}
                  <b>{money(data.aging[i])}</b>
                </span>
              </div>
            ))}
          </div>
          {data.unknownDue > 0 && (
            <small className="ed-muted">
              {data.unknownDue} cuentas sin plazo de vencimiento registrado.
            </small>
          )}
        </article>
        <article className="ed-card">
          <div className="ed-card-title">
            <span className="ed-icon violet"><ReceiptText size={18} /></span>
            <h2>Pedidos por facturar</h2>
          </div>
          <strong className="ed-finance-value">{data.pendingInvoices.length} {data.pendingInvoices.length === 1 ? "pedido pendiente" : "pedidos pendientes"}</strong>
          <p className="ed-muted">Importe por facturar: <b>{money(data.pendingInvoiceTotal)}</b></p>
          <p className="ed-muted">{data.pendingInvoices.length ? "Emite los comprobantes de estos pedidos para continuar con el cobro." : "Estás al día. No hay pedidos pendientes de facturación."}</p>
          <a className="ed-text-link" href="/facturacion">Ir a facturación <ArrowRight size={14} /></a>
        </article>
      </section>
      <section className="ed-card ed-main-chart">
        <div className="ed-section-head">
          <div>
            <h2>Ventas vs. compras</h2>
            <p>Comparativa de operaciones hasta hoy {dateLabel(today())}</p>
          </div>
          <div className="seg ed-chart-periods" role="group" aria-label="Período del gráfico">
            {(["Diario", "Semanal", "Mensual", "Trimestral"] as ChartPeriod[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={chartPeriod === option}
                onClick={() => setChartPeriod(option)}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <ExecutiveChart period={chartPeriod} />
      </section>
      <section className="ed-alerts">
        <article className="ed-card">
          <div className="ed-section-head">
            <div>
              <h2>Stock crítico</h2>
              <p>Prioridad por déficit respecto al mínimo</p>
            </div>
            <a href="/stock-productos">
              Ver inventario <ArrowUpRight size={14} />
            </a>
          </div>
          {data.low.slice(0, 5).map((r) => (
            <div className="ed-alert-row" key={r.p.id + r.w.id}>
              <span
                className={`ed-alert-mark ${r.quantity <= 0 ? "danger" : "warning"}`}
              >
                <PackageWarning size={16} />
              </span>
              <div className="ed-alert-identity">
                <ProductDetailsTrigger id={r.p.id} warehouseId={r.w.id} />
                <small>{r.w.name}</small>
              </div>
              <div className="ed-alert-number">
                <strong>
                  {r.quantity} {r.p.unit}
                </strong>
                <small>Mínimo {r.p.minimum}</small>
              </div>
            </div>
          ))}
          {!data.low.length && (
            <p className="ed-empty">No hay productos con stock crítico.</p>
          )}
        </article>
        <article className="ed-card">
          <div className="ed-section-head">
            <div>
              <h2>Cuentas por vencer</h2>
              <p>Vencidas y próximas a vencer en 7 días</p>
            </div>
            <a href="/estado-cuenta">
              Ver cuentas <ArrowUpRight size={14} />
            </a>
          </div>
          {data.alerts.map((r) => (
            <button
              className="ed-alert-row ed-account"
              key={r.doc.id}
              onClick={() => setDetail(r.doc.id)}
            >
              <span
                className={`ed-alert-mark ${r.overdue! > 0 ? "danger" : "warning"}`}
              >
                <CircleAlert size={16} />
              </span>
              <div className="ed-alert-identity">
                <strong>
                  {[...state.customers, ...state.suppliers].find(
                    (c) => c.id === r.doc.partyId,
                  )?.name ?? r.doc.partyId}
                </strong>
                <small>
                  {r.doc.number} · {dateLabel(r.due!)} · Por{" "}
                  {r.type.toLowerCase()}
                </small>
              </div>
              <div className="ed-alert-number">
                <strong>{money(r.balance)}</strong>
                <small className={r.overdue! > 0 ? "ed-danger" : "ed-warning"}>
                  {r.overdue! > 0 ? "Vencida" : "Próxima a vencer"}
                </small>
              </div>
            </button>
          ))}
          {!data.alerts.length && (
            <p className="ed-empty">
              No hay cuentas vencidas ni próximas a vencer.
            </p>
          )}
        </article>
      </section>
      <section className="ed-card ed-orders">
        <div className="ed-section-head">
          <div>
            <h2>Órdenes de venta recientes</h2>
            <p>Órdenes registradas hoy, {dateLabel(today())}</p>
          </div>
          <a href="/orden-venta">
            Ver todas <ArrowUpRight size={14} />
          </a>
        </div>
        <Records
          initialPageSize={5}
          pageSizes={[5, 10, 20]}
          sortable
          searchText="Buscar orden o cliente…"
          headers={[
            "Número de orden",
            "Cliente",
            "Fecha",
            "Importe total",
            "Estado",
            "Acciones",
          ]}
          rows={data.orders.map((d) => {
            const name =
              state.customers.find((c) => c.id === d.partyId)?.name ??
              d.partyId;
            return {
              id: d.id,
              search: `${d.number} ${name}`,
              sortValues: [d.number, name, d.date, d.total, d.status],
              cells: [
                <button
                  className="ed-order-number"
                  onClick={() => setDetail(d.id)}
                >
                  {d.number}
                </button>,
                name,
                dateLabel(d.date),
                money(d.total),
                <Tag value={d.status} />,
                <OrderActions
                  id={d.id}
                  number={d.number}
                  onDetails={() => setDetail(d.id)}
                />,
              ],
            };
          })}
        />
      </section>
      {detail && state.documents.find((d) => d.id === detail) && (
        <DocDetail
          doc={state.documents.find((d) => d.id === detail)!}
          onClose={() => setDetail("")}
        />
      )}
    </div>
  );
}
