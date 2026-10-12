import { SupplierSelector } from "./suppliers";
import { useState } from "react";
import { Icon } from "./icons";
import { useErp } from "./store";
import { dateLabel, money, stockOf, today } from "./model";
import { exportCsv, Metrics, Records, Tag } from "./ui";
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
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
  const valid = !from || !to || from <= to;
  return (
    <>
      <div className="hd page-head">
        <div>
          <h1>Reportes</h1>
          <p className="sub no-margin">
            Información calculada a partir de tus documentos e inventario.
          </p>
        </div>
        <button
          className="secondary-btn"
          disabled={!valid}
          onClick={() => exportCsv(report, headers, rows)}
        >
          <Icon name="download" size={15} />
          Exportar CSV
        </button>
      </div>
      <div className="report-workspace">
        <div className="report-menu">
          {names.map((n) => (
            <button
              key={n}
              className={report === n ? "btn" : "secondary-btn"}
              onClick={() => {
                setReport(n);
                setParty("Todos");
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <div>
          <section className="card report-filters">
            <h2>{report}</h2>
            <div className="table-tools">
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
