import { useState, useEffect, useRef } from "react";
import {
  ShoppingCart,
  TrendingUp,
  PackageX as PackageWarning,
  ChartNoAxesCombined,
  ArrowUpRight,
  Download,
  Wallet,
  Landmark,
  RefreshCw,
  Ellipsis,
  Eye,
  ArrowRight,
  CircleAlert,
} from "lucide-react";
import { useErp } from "./store";
import {
  dashboardData,
  chartBuckets,
  type ChartPeriod,
} from "./dashboard-data";
import { money, dateLabel, today } from "./model";
import { Records, Tag, DocDetail, exportCsv } from "./ui";
import { ProductDetailsTrigger } from "./products";
import { PayableDetails } from "./payables";

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
function ExecutiveChart({ period }: { period: ChartPeriod }) {
  const { state } = useErp();
  const data = chartBuckets(state, period);
  const [active, setActive] = useState<number | null>(null);
  const [width, setWidth] = useState(900);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(300, entry.contentRect.width)),
    );
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => setActive(null), [period]);
  const max = Math.max(1, ...data.flatMap((d) => [d.sales, d.buys]));
  const ceiling = Math.ceil(max / 4) * 4;
  const left = 54,
    right = 10,
    top = 18,
    bottom = 42,
    height = 265;
  const plotHeight = height - top - bottom,
    step = (width - left - right) / data.length;
  const barWidth = Math.min(24, step * 0.23);
  const selected = active === null ? null : data[active];
  const compact = (n: number) =>
    new Intl.NumberFormat("es-PE", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(n);
  return (
    <div className="ed-chart" ref={root}>
      <div className="ed-legend">
        <span>
          <i />
          Ventas facturadas
        </span>
        <span>
          <i />
          Órdenes de compra
        </span>
        <small>
          Importes con IGV ·{" "}
          {period === "Semanal"
            ? "Últimas 8 semanas"
            : period === "Mensual"
              ? "Últimos 6 meses"
              : "Últimos 4 trimestres"}
        </small>
      </div>
      <svg
        className="enterprise-chart"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Ventas y compras: agrupación ${period.toLowerCase()}`}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1={left}
              x2={width - right}
              y1={top + (plotHeight * i) / 4}
              y2={top + (plotHeight * i) / 4}
              stroke="#edf0f4"
            />
            <text
              x={left - 8}
              y={top + (plotHeight * i) / 4 + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="10"
            >
              S/ {compact((ceiling * (4 - i)) / 4)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = left + step * (i + 0.5);
          return (
            <g key={d.start} className="chart-bar-pair">
              <rect
                x={x - barWidth - 3}
                y={top + plotHeight - (d.sales / ceiling) * plotHeight}
                width={barWidth}
                height={(d.sales / ceiling) * plotHeight}
                rx="4"
                fill="#6587be"
                className="ed-bar"
              />
              <rect
                x={x + 3}
                y={top + plotHeight - (d.buys / ceiling) * plotHeight}
                width={barWidth}
                height={(d.buys / ceiling) * plotHeight}
                rx="4"
                fill="#6aa99b"
                className="ed-bar"
              />
              <text
                x={x}
                y={height - 15}
                textAnchor="middle"
                fontSize={width < 450 ? "9" : "11"}
                fill="#64748b"
              >
                {d.label}
              </text>
              <rect
                tabIndex={0}
                role="button"
                aria-label={`${dateLabel(d.start)} al ${dateLabel(d.end)}: ventas ${money(d.sales)}, compras ${money(d.buys)}`}
                x={x - step / 2 + 3}
                y={top}
                width={step - 6}
                height={plotHeight}
                fill="transparent"
                onMouseEnter={() => setActive(i)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setActive(null);
                }}
              />
            </g>
          );
        })}
      </svg>
      {selected && (
        <div className="ed-tooltip chart-tooltip" role="status">
          <strong>
            {dateLabel(selected.start)} – {dateLabel(selected.end)}
          </strong>
          <span>
            Ventas <b>{money(selected.sales)}</b>
          </span>
          <span>
            Compras <b>{money(selected.buys)}</b>
          </span>
        </div>
      )}
      {data.every((d) => !d.sales && !d.buys) && (
        <p className="ed-chart-empty">Sin operaciones en este período.</p>
      )}
    </div>
  );
}
export function Dashboard() {
  const { state } = useErp();
  const data = dashboardData(state);
  const [period, setPeriod] = useState<ChartPeriod>("Mensual");
  const [detail, setDetail] = useState("");
  const [payableDetail, setPayableDetail] = useState("");
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const labels = ["Vigente", "1–30 días", "31–60 días", "Más de 60 días"];
  const demoCount = [...data.sales, ...data.purchases].filter(
    (d) => d.demo,
  ).length;
  const exportDashboard = () =>
    exportCsv(
      "EnterpriseCloud-panel-" + today(),
      [
        "Sección",
        "Indicador / documento",
        "Importe / valor",
        "Fecha / período",
        "Origen",
      ],
      [
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
          "Finanzas",
          "Cuentas por pagar",
          data.hasPayableLedger ? data.payableDebt : "Sin datos suficientes",
          "Actual",
          "Registro de cuentas por pagar",
        ],
        [
          "Inventario",
          "Rotación",
          data.rotation?.value ?? "Sin datos suficientes",
          data.rotation
            ? `${data.rotation.start} / ${data.rotation.end}`
            : "Sin período comparable",
          "Sin inventario promedio histórico",
        ],
        ...data.receivables.map((r) => [
          "Cuentas por cobrar",
          r.doc.number,
          r.doc.balance,
          r.due ?? "Sin vencimiento",
          r.doc.demo ? "DEMO" : "Registrado",
        ]),
        ...data.payables.map((p) => [
          "Cuentas por pagar",
          `${p.account.id} · ${p.doc.number}`,
          p.balance,
          p.due,
          p.account.demo ? "DEMO" : "Registrado",
        ]),
        ...(state.inventoryValuations ?? []).map((v) => [
          "Inventario",
          "Valoración registrada",
          v.value,
          v.date,
          v.demo ? "DEMO" : "Registrado",
        ]),
        ...chartBuckets(state, period).flatMap((d) => [
          ["Gráfico", "Ventas", d.sales, `${d.start} / ${d.end}`, period],
          ["Gráfico", "Compras", d.buys, `${d.start} / ${d.end}`, period],
        ]),
        ...data.orders.map((d) => [
          "Órdenes de venta",
          d.number,
          d.total,
          d.date,
          d.demo ? "DEMO" : d.status,
        ]),
      ],
    );
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
        <button className="secondary-btn" onClick={exportDashboard}>
          <Download size={15} />
          Exportar CSV
        </button>
      </header>
      {demoCount > 0 && (
        <p className="ed-demo-note">
          Incluye {demoCount} operaciones DEMO, identificadas en los documentos.
          Indicadores acumulados al {dateLabel(today())}.
        </p>
      )}
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
            <span className="ed-icon teal">
              <Landmark size={18} />
            </span>
            <h2>Cuentas por pagar</h2>
            <a href="/estado-cuenta">
              Ver detalle <ArrowUpRight size={13} />
            </a>
          </div>
          <strong
            className={
              data.hasPayableLedger ? "ed-finance-value" : "ed-unavailable"
            }
          >
            {data.hasPayableLedger
              ? money(data.payableDebt)
              : "Sin datos suficientes"}
          </strong>
          <p className="ed-muted">
            {data.hasPayableLedger
              ? `${data.payables.length} cuentas pendientes · ${data.payableOverdue} vencidas${data.payables.some((p) => p.account.demo) ? " · Incluye DEMO" : ""}`
              : "No hay un registro de deuda y pagos a proveedores."}
          </p>
          <div className="ed-aging">
            {data.payableAging.map((amount, i) => (
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
                <span>
                  {label}
                  <b>
                    {data.hasPayableLedger ? money(data.payableAging[i]) : "—"}
                  </b>
                </span>
              </div>
            ))}
          </div>
        </article>
        <article className="ed-card">
          <div className="ed-card-title">
            <span className="ed-icon violet">
              <RefreshCw size={18} />
            </span>
            <h2>Rotación de inventario</h2>
          </div>
          <strong
            className={data.rotation ? "ed-finance-value" : "ed-unavailable"}
          >
            {data.rotation
              ? `${data.rotation.value.toFixed(3)} veces`
              : "Sin datos suficientes"}
          </strong>
          <p className="ed-muted">
            {data.rotation
              ? `${dateLabel(data.rotation.start)} – ${dateLabel(data.rotation.end)}${data.rotation.demo ? " · DEMO" : ""}. Costo de ventas ÷ inventario promedio ponderado en el tiempo.`
              : "Costo de ventas ÷ inventario promedio. Falta una valorización histórica comparable del inventario."}
          </p>
          <a className="ed-text-link" href="/movimiento-kardex">
            Consultar Kardex <ArrowRight size={14} />
          </a>
        </article>
      </section>
      <section className="ed-card ed-main-chart">
        <div className="ed-section-head">
          <div>
            <h2>Ventas vs. compras</h2>
            <p>Comprobantes facturados y órdenes de compra válidas</p>
          </div>
          <div className="seg" aria-label="Período del gráfico">
            {(["Semanal", "Mensual", "Trimestral"] as const).map((p) => (
              <button
                key={p}
                aria-pressed={p === period}
                onClick={() => setPeriod(p)}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <ExecutiveChart period={period} />
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
              onClick={() =>
                r.payableId
                  ? setPayableDetail(r.payableId)
                  : setDetail(r.doc.id)
              }
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
                  {r.type.toLowerCase()} {r.doc.demo && "· DEMO"}
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
            <p>Consulta todas las órdenes, empezando por las más recientes</p>
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
                  {d.demo && <small>DEMO</small>}
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
      {payableDetail && (
        <PayableDetails
          id={payableDetail}
          onClose={() => setPayableDetail("")}
        />
      )}
      {detail && state.documents.find((d) => d.id === detail) && (
        <DocDetail
          doc={state.documents.find((d) => d.id === detail)!}
          onClose={() => setDetail("")}
        />
      )}
    </div>
  );
}
