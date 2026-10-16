import { SupplierSelector } from "./suppliers";
import { useState } from "react";
import { useErp } from "./store";
import { dateLabel, money, stockOf, today } from "./model";
import { ExportMenu, Metrics, Records, Tag } from "./ui";
import type { ExportChart } from "./exports";
import { useDailyDateFilter } from "./daily-filter";
const names = [
  "Ventas por período",
  "Compras por proveedor",
  "Stock valorizado",
  "Movimientos de Kardex",
  "Cuentas por cobrar",
  "Comprobantes emitidos",
];
export function Reports() {
  const { state } = useErp();
  const [report, setReport] = useState(names[0]);
  const [from, setFrom] = useDailyDateFilter();
  const [to, setTo] = useDailyDateFilter();
  const [warehouse, setWarehouse] = useState("Todos");
  const [party, setParty] = useState("Todos");
  const [error, setError] = useState("");
  const warehouseName = (id: string) =>
    state.warehouses.find((w) => w.id === id)?.name ?? id;
  const partyName = (id: string) =>
    [...state.customers, ...state.suppliers].find((p) => p.id === id)?.name ??
    id;
  const period = (d: string) => (!from || d >= from) && (!to || d <= to);
  let headers: string[] = [];
  let rows: (string | number)[][] = [];
  let value = 0;
  let charts: ExportChart[] = [];
  if (report === "Stock valorizado") {
    headers = ["Código", "Producto", "Almacén", "Cantidad", "Costo", "Valor"];
    state.products.forEach((p) =>
      state.warehouses
        .filter((w) => warehouse === "Todos" || w.id === warehouse)
        .forEach((w) => {
          const quantity = stockOf(state, p.id, w.id);
          rows.push([
            p.id,
            p.name,
            w.name,
            quantity,
            money(p.cost),
            money(quantity * p.cost),
          ]);
          value += quantity * p.cost;
        }),
    );
  } else if (report === "Movimientos de Kardex") {
    headers = [
      "Fecha",
      "Documento",
      "Producto",
      "Almacén",
      "Tercero",
      "Tipo",
      "Cantidad",
      "Saldo",
    ];
    rows = state.movements
      .filter(
        (m) =>
          period(m.date) &&
          (warehouse === "Todos" || m.warehouseId === warehouse) &&
          (party === "Todos" || m.partyId === party),
      )
      .map((m) => [
        dateLabel(m.date),
        state.documents.find((d) => d.id === m.documentId)?.number ?? "",
        state.products.find((p) => p.id === m.productId)?.name ?? "",
        warehouseName(m.warehouseId),
        partyName(m.partyId),
        m.type,
        m.quantity,
        m.balance,
      ]);
  } else {
    const data = state.documents.filter(
      (d) =>
        d.kind === (report === "Compras por proveedor" ? "OC" : "CP") &&
        period(d.date) &&
        (warehouse === "Todos" || d.warehouseId === warehouse) &&
        (party === "Todos" || d.partyId === party) &&
        (report !== "Cuentas por cobrar" || d.balance > 0),
    );
    if (report === "Compras por proveedor") {
      headers = ["Proveedor", "Órdenes", "Total ordenado"];
      const grouped = new Map<string, { count: number; sum: number }>();
      data.forEach((d) => {
        const g = grouped.get(d.partyId) ?? { count: 0, sum: 0 };
        g.count++;
        g.sum += d.total;
        grouped.set(d.partyId, g);
      });
      rows = [...grouped].map(([id, g]) => [
        partyName(id),
        g.count,
        money(g.sum),
      ]);
      value = data.reduce((s, d) => s + d.total, 0);
    } else if (report === "Ventas por período") {
      headers = [
        "Fecha",
        "Comprobantes",
        "Total facturado",
        "Cobrado",
        "Saldo",
      ];
      const grouped = new Map<
        string,
        { count: number; total: number; balance: number }
      >();
      data.forEach((d) => {
        const g = grouped.get(d.date) ?? { count: 0, total: 0, balance: 0 };
        g.count++;
        g.total += d.total;
        g.balance += d.balance;
        grouped.set(d.date, g);
      });
      rows = [...grouped]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, g]) => [
          dateLabel(date),
          g.count,
          money(g.total),
          money(g.total - g.balance),
          money(g.balance),
        ]);
      value = data.reduce((s, d) => s + d.total, 0);
    } else {
      headers = [
        "Documento",
        "Fecha",
        "Cliente",
        "Almacén",
        "Forma de pago",
        "Total",
        "Pagado",
        "Saldo",
        "Estado",
      ];
      rows = data.map((d) => [
        d.number,
        dateLabel(d.date),
        partyName(d.partyId),
        warehouseName(d.warehouseId),
        d.method,
        money(d.total),
        money(d.total - d.balance),
        money(d.balance),
        d.status,
      ]);
      value = data.reduce(
        (s, d) => s + (report === "Cuentas por cobrar" ? d.balance : d.total),
        0,
      );
    }
  }
  if (report === "Ventas por período") {
    charts = [
      {
        type: "bars",
        title: "Comprobantes por fecha",
        data: rows
          .map((row) => ({ label: String(row[0]), value: Number(row[1]) }))
          .filter((item) => Number.isFinite(item.value))
          .slice(0, 8),
      },
    ];
  } else if (report === "Compras por proveedor") {
    charts = [
      {
        type: "bars",
        title: "Órdenes por proveedor",
        data: rows
          .map((row) => ({ label: String(row[0]), value: Number(row[1]) }))
          .filter((item) => Number.isFinite(item.value))
          .slice(0, 8),
      },
    ];
  } else if (report === "Stock valorizado") {
    charts = [
      {
        type: "bars",
        title: "Unidades por producto",
        data: rows
          .map((row) => ({ label: String(row[1]), value: Number(row[3]) }))
          .filter((item) => Number.isFinite(item.value))
          .slice(0, 8),
      },
    ];
  } else if (report === "Movimientos de Kardex") {
    const movementTotals = state.movements
      .filter(
        (movement) =>
          period(movement.date) &&
          (warehouse === "Todos" || movement.warehouseId === warehouse) &&
          (party === "Todos" || movement.partyId === party),
      )
      .reduce<Record<string, number>>((totals, movement) => {
        totals[movement.type] = (totals[movement.type] ?? 0) + movement.quantity;
        return totals;
      }, {});
    charts = [
      {
        type: "donut",
        title: "Entradas y salidas",
        data: Object.entries(movementTotals).map(([label, amount]) => ({
          label,
          value: amount,
        })),
      },
    ];
  } else if (report === "Cuentas por cobrar" || report === "Comprobantes emitidos") {
    const documents = state.documents.filter(
      (document) =>
        document.kind === "CP" &&
        period(document.date) &&
        (warehouse === "Todos" || document.warehouseId === warehouse) &&
        (party === "Todos" || document.partyId === party) &&
        (report !== "Cuentas por cobrar" || document.balance > 0),
    );
    const statuses = documents.reduce<Record<string, number>>((totals, document) => {
      totals[document.status] = (totals[document.status] ?? 0) + 1;
      return totals;
    }, {});
    charts = [
      {
        type: "donut",
        title: "Estado de comprobantes",
        data: Object.entries(statuses).map(([label, amount]) => ({
          label,
          value: amount,
        })),
      },
    ];
  }
  const valid = !from || !to || from <= to;
  return (
    <>
      <div className="hd page-head">
        <div>
          <h1>Analítica y reportes</h1>
          <p className="sub no-margin">
            Información calculada a partir de tus documentos e inventario.
          </p>
        </div>
        <ExportMenu
          data={{
            name: report,
            title: report,
            profile: "report",
            company: { name: state.settings.company },
            subtitle: `Reporte ${report.toLowerCase()} · ${
              from || to
                ? `${from || "inicio"} al ${to || "actualidad"}`
                : "sin rango de fechas"
            }${warehouse !== "Todos" ? ` · ${warehouseName(warehouse)}` : ""}`,
            summary: [
              { label: "Registros", value: valid ? rows.length : 0 },
              {
                label:
                  report === "Movimientos de Kardex"
                    ? "Unidades"
                    : "Importe analizado",
                value: report === "Movimientos de Kardex" ? rows.length : value,
              },
              { label: "Filtros", value: `${from || "—"} / ${to || "—"}` },
            ],
            headers,
            rows: valid ? rows : [],
            charts: valid ? charts : [],
          }}
        />
      </div>
      <div className="report-workspace">
        <div className="access-tabs" role="tablist" aria-label="Tipos de reporte">
          {names.map((n) => (
            <button
              key={n}
              id={`report-tab-${n.toLowerCase().replaceAll(" ", "-")}`}
              className="access-tab"
              role="tab"
              aria-selected={report === n}
              aria-controls="report-panel"
              onClick={() => {
                setReport(n);
                setParty("Todos");
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div id="report-panel" role="tabpanel" aria-labelledby={`report-tab-${report.toLowerCase().replaceAll(" ", "-")}`}>
          <section className="card report-filters">
            <h2>{report}</h2>
            <div className="table-tools">
              <div className="table-filter-controls">
                {report !== "Stock valorizado" && (
                  <>
                    <label>
                      Desde
                      <input
                        aria-label="Fecha inicial"
                        type="date"
                        value={from}
                        max={to || undefined}
                        onChange={(e) => setFrom(e.target.value)}
                      />
                    </label>
                    <label>
                      Hasta
                      <input
                        aria-label="Fecha final"
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={(e) => setTo(e.target.value)}
                      />
                    </label>
                  </>
                )}
                <select
                  aria-label="Almacén del reporte"
                  value={warehouse}
                  onChange={(e) => setWarehouse(e.target.value)}
                >
                  <option value="Todos">Todos los almacenes</option>
                  {state.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
                {report !== "Stock valorizado" &&
                  report !== "Compras por proveedor" && (
                    <select
                      aria-label="Tercero del reporte"
                      value={
                        state.customers.some((c) => c.id === party)
                          ? party
                          : "Todos"
                      }
                      onChange={(e) => setParty(e.target.value)}
                    >
                      <option value="Todos">Todos los clientes</option>
                      {state.customers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                {(report === "Compras por proveedor" ||
                  report === "Movimientos de Kardex") && (
                  <SupplierSelector
                    label="Proveedor del reporte"
                    value={
                      state.suppliers.some((s) => s.id === party) ? party : ""
                    }
                    onChange={(id) => setParty(id || "Todos")}
                    includeInactive
                    allowClear
                    compact
                  />
                )}
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setFrom("");
                    setTo("");
                    setWarehouse("Todos");
                    setParty("Todos");
                    setError("");
                  }}
                >
                  Limpiar filtros
                </button>
              </div>
            </div>
            {report === "Stock valorizado" && (
              <p className="muted">
                Stock actual al {dateLabel(today())}; valorizado al costo del
                catálogo.
              </p>
            )}
            {!valid && (
              <p className="error">
                La fecha inicial debe ser anterior a la final.
              </p>
            )}
            {error && <p className="error">{error}</p>}
          </section>
          <Metrics
            items={[
              [
                report === "Movimientos de Kardex"
                  ? "Movimientos"
                  : "Filas del reporte",
                valid ? rows.length : 0,
              ],
              ["Total del reporte", valid ? money(value) : "—"],
            ]}
          />
          <Records
            headers={headers}
            rows={(valid ? rows : []).map((r, i) => ({
              id: String(i),
              search: r.join(" "),
              cells: r,
            }))}
          />
          <div className="modal-actions">
            <button
              className="secondary-btn"
              onClick={() => {
                try {
                  window.print();
                  setError("");
                } catch {
                  setError("No se pudo abrir la impresión.");
                }
              }}
            >
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
export { Dashboard } from "./dashboard";
