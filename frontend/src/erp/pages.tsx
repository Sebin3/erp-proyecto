import { SupplierDetailsTrigger } from "./suppliers";
import { ProductDetailsTrigger } from "./products";
import { PayablesPanel } from "./payables";
import { ReceivingPage, ReceiptModal } from "./receiving";
import { useState, type ReactNode } from "react";
import { Icon } from "./icons";
import { useErp } from "./store";
import {
  changeQuote,
  createDocument,
  dateLabel,
  invoice,
  isCredit,
  money,
  pay,
  paymentMethods,
  receive,
  saveQuote,
  stockOf,
  today,
  vouchers,
  type Document,
  type Quote,
} from "./model";
import {
  DocDetail,
  exportCsv,
  Metrics,
  Modal,
  OrderEditor,
  Records,
  Tag,
} from "./ui";
export const routes = [
  {
    group: "Inicio",
    name: "Panel de control",
    path: "/dashboard",
    icon: "dashboard",
  },
  {
    group: "Compras",
    name: "Orden de compra",
    path: "/orden-compra",
    icon: "purchase",
  },
  {
    group: "Compras",
    name: "Ingreso al Kardex",
    path: "/ingreso-kardex",
    icon: "receive",
  },
  { group: "Ventas", name: "Cotización", path: "/cotizacion", icon: "quote" },
  {
    group: "Ventas",
    name: "Orden de venta",
    path: "/orden-venta",
    icon: "sale",
  },
  {
    group: "Ventas",
    name: "Facturación",
    path: "/facturacion",
    icon: "invoice",
  },
  {
    group: "Ventas",
    name: "Estado de cuenta",
    path: "/estado-cuenta",
    icon: "wallet",
  },
  {
    group: "Inventarios",
    name: "Movimiento de Kardex",
    path: "/movimiento-kardex",
    icon: "movement",
  },
  {
    group: "Inventarios",
    name: "Stock de productos",
    path: "/stock-productos",
    icon: "stock",
  },
  {
    group: "Administración",
    name: "Reportes",
    path: "/reportes",
    icon: "report",
  },
  {
    group: "Administración",
    name: "Mantenimientos",
    path: "/mantenimientos",
    icon: "settings",
  },
];
const descriptions: Record<string, string> = {
  "orden-compra":
    "Emite órdenes a proveedores y recibe mercadería por almacén.",
  "ingreso-kardex":
    "Confirma recepciones completas o parciales y genera entradas de inventario.",
  "orden-venta":
    "Registra pedidos de clientes con productos, almacén y forma de pago.",
  facturacion:
    "Emite comprobantes de venta y descuenta existencias automáticamente.",
  "estado-cuenta": "Consulta la deuda de tus clientes y registra cobranzas.",
  "movimiento-kardex":
    "Historial de entradas y salidas conectado con compras y ventas.",
  "stock-productos":
    "Existencias y valorización actual por producto y almacén.",
};
function Head({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="hd page-head">
      <div>
        <h1>{title}</h1>
        <p className="sub no-margin">{description}</p>
      </div>
      <div className="header-actions">{actions}</div>
    </div>
  );
}
export function Operations({ view }: { view: string }) {
  const { state, transact } = useErp();
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("Todos");
  const [warehouse, setWarehouse] = useState("Todos");
  const [editor, setEditor] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [action, setAction] = useState<Document | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  if (view === "ingreso-kardex") return <ReceivingPage />;
  const name = routes.find((r) => r.path === `/${view}`)?.name ?? view;
  const partyName = (id: string) =>
    [...state.customers, ...state.suppliers].find((p) => p.id === id)?.name ??
    id;
  const warehouseName = (id: string) =>
    state.warehouses.find((w) => w.id === id)?.name ?? id;
  const productName = (id: string) =>
    state.products.find((p) => p.id === id)?.name ?? id;
  const oc = state.documents.filter((d) => d.kind === "OC"),
    ov = state.documents.filter((d) => d.kind === "OV"),
    cp = state.documents.filter((d) => d.kind === "CP");
  const pending = oc.filter((d) =>
    ["Pendiente", "Recibida parcial"].includes(d.status),
  );
  const awaiting = ov.filter((d) => d.status === "Pendiente");
  let metrics: [string, string | number][] = [];
  let headers: string[] = [];
  let csv: (string | number)[][] = [];
  let rows: { id: string; cells: ReactNode[]; search: string }[] = [];
  let filterOptions: string[] = [];
  if (view === "movimiento-kardex") {
    filterOptions = ["Entrada", "Salida"];
    const all = state.movements;
    const data = all.filter(
      (m) =>
        (!date || m.date === date) &&
        (status === "Todos" || m.type === status) &&
        (warehouse === "Todos" || m.warehouseId === warehouse),
    );
    metrics = [
      ["Movimientos del historial", all.length],
      [
        "Unidades ingresadas",
        all
          .filter((m) => m.type === "Entrada")
          .reduce((s, m) => s + m.quantity, 0),
      ],
      [
        "Unidades salidas",
        all
          .filter((m) => m.type === "Salida")
          .reduce((s, m) => s + m.quantity, 0),
      ],
      ["Productos movidos", new Set(all.map((m) => m.productId)).size],
    ];
    headers = [
      "Fecha",
      "Documento",
      "Operación",
      "Producto",
      "Almacén",
      "Tercero",
      "Cantidad",
      "Saldo",
      "Acciones",
    ];
    csv = data.map((m) => [
      dateLabel(m.date),
      state.documents.find((d) => d.id === m.documentId)?.number ?? "",
      m.type,
      productName(m.productId),
      warehouseName(m.warehouseId),
      partyName(m.partyId),
      m.quantity,
      m.balance,
    ]);
    rows = data.map((m, i) => ({
      id: m.id,
      search: `${m.productId} ${csv[i].join(" ")}`,
      cells: [
        dateLabel(m.date),
        csv[i][1],
        <Tag value={m.type === "Entrada" ? "Compra" : "Venta"} />,
        <>
          <ProductDetailsTrigger
            id={m.productId}
            warehouseId={m.warehouseId}
            context={m.type === "Entrada" ? "OC" : "OV"}
          />
          <small>{m.productId}</small>
        </>,
        warehouseName(m.warehouseId),
        <SupplierDetailsTrigger supplierId={m.partyId}>
          {partyName(m.partyId)}
        </SupplierDetailsTrigger>,
        <span className={m.type === "Entrada" ? "positive" : "negative"}>
          {m.type === "Entrada" ? "+" : "−"}
          {m.quantity}
        </span>,
        `${m.balance} ${state.products.find((p) => p.id === m.productId)?.unit ?? ""}`,
        <button
          className="secondary-btn"
          onClick={() => setDetail(m.documentId)}
        >
          <Icon name="eye" size={13} />
          Ver documento
        </button>,
      ],
    }));
  } else if (view === "stock-productos") {
    filterOptions = ["Disponible", "Stock bajo", "Sin stock"];
    const shownWarehouses = state.warehouses.filter(
      (w) => warehouse === "Todos" || w.id === warehouse,
    );
    const data = state.products
      .map((p) => {
        const quantities = shownWarehouses.map((w) =>
          stockOf(state, p.id, w.id),
        );
        const quantity =
          warehouse === "Todos"
            ? quantities.reduce((s, n) => s + n, 0)
            : stockOf(state, p.id, warehouse);
        return {
          p,
          quantities,
          quantity,
          status:
            quantity === 0
              ? "Sin stock"
              : quantity < p.minimum
                ? "Stock bajo"
                : "Disponible",
        };
      })
      .filter((r) => status === "Todos" || r.status === status);
    metrics = [
      ["Productos", data.length],
      ["Unidades", data.reduce((s, r) => s + r.quantity, 0)],
      ["Bajo el mínimo", data.filter((r) => r.quantity < r.p.minimum).length],
      [
        "Valor al costo",
        money(data.reduce((s, r) => s + r.quantity * r.p.cost, 0)),
      ],
    ];
    headers = [
      "Código",
      "Producto",
      ...shownWarehouses.map((w) => w.name),
      "Total",
      "Mínimo",
      "Valor al costo",
      "Estado",
    ];
    csv = data.map((r) => [
      r.p.id,
      r.p.name,
      ...r.quantities,
      r.quantities.reduce((s, n) => s + n, 0),
      r.p.minimum,
      r.quantities.reduce((s, n) => s + n, 0) * r.p.cost,
      r.status,
    ]);
    rows = data.map((r) => ({
      id: r.p.id,
      search: `${r.p.id} ${r.p.name} ${r.p.category}`,
      cells: [
        r.p.id,
        <>
          <ProductDetailsTrigger
            id={r.p.id}
            warehouseId={
              warehouse === "Todos" ? (shownWarehouses[0]?.id ?? "") : warehouse
            }
          />
          <small>
            {r.p.category} · {r.p.unit}
          </small>
        </>,
        ...r.quantities,
        r.quantities.reduce((s, n) => s + n, 0),
        r.p.minimum,
        money(r.quantities.reduce((s, n) => s + n, 0) * r.p.cost),
        <Tag value={r.status} />,
      ],
    }));
  } else {
    const kind =
      view === "orden-compra"
        ? "OC"
        : view === "ingreso-kardex"
          ? "NI"
          : view === "orden-venta"
            ? "OV"
            : "CP";
    let data = state.documents.filter(
      (d) =>
        d.kind === kind && (view !== "estado-cuenta" || isCredit(d.method)),
    );
    filterOptions = [...new Set(data.map((d) => d.status))];
    data = data.filter(
      (d) =>
        (!date || d.date === date) &&
        (status === "Todos" || d.status === status) &&
        (warehouse === "Todos" || d.warehouseId === warehouse),
    );
    metrics =
      view === "orden-compra"
        ? [
            ["Órdenes", oc.length],
            ["Por recibir", pending.length],
            ["Recibidas", oc.filter((d) => d.status === "Recibida").length],
            ["Total ordenado", money(oc.reduce((s, d) => s + d.total, 0))],
          ]
        : view === "ingreso-kardex"
          ? [
              [
                "Notas de ingreso",
                state.documents.filter((d) => d.kind === "NI").length,
              ],
              ["Órdenes por recibir", pending.length],
              [
                "Unidades ingresadas",
                state.movements
                  .filter((m) => m.type === "Entrada")
                  .reduce((s, m) => s + m.quantity, 0),
              ],
              ["Almacenes", state.warehouses.length],
            ]
          : view === "orden-venta"
            ? [
                ["Órdenes", ov.length],
                ["Por facturar", awaiting.length],
                [
                  "Facturadas",
                  ov.filter((d) => d.status === "Facturada").length,
                ],
                ["Total pedidos", money(ov.reduce((s, d) => s + d.total, 0))],
              ]
            : view === "facturacion"
              ? [
                  ["Comprobantes", cp.length],
                  ["Órdenes por facturar", awaiting.length],
                  [
                    "Total facturado",
                    money(cp.reduce((s, d) => s + d.total, 0)),
                  ],
                  [
                    "Saldo por cobrar",
                    money(cp.reduce((s, d) => s + d.balance, 0)),
                  ],
                ]
              : [
                  ["Por cobrar", money(cp.reduce((s, d) => s + d.balance, 0))],
                  ["Con saldo", cp.filter((d) => d.balance > 0).length],
                  [
                    "Clientes con deuda",
                    new Set(
                      cp.filter((d) => d.balance > 0).map((d) => d.partyId),
                    ).size,
                  ],
                  [
                    "Cobrado",
                    money(
                      cp.reduce(
                        (s, d) =>
                          s + d.payments.reduce((n, p) => n + p.amount, 0),
                        0,
                      ),
                    ),
                  ],
                ];
    headers = [
      "Documento",
      "Fecha",
      kind === "OC" || kind === "NI" ? "Proveedor" : "Cliente",
      "Almacén",
      "Forma de pago",
      "Importe",
      ...(view === "estado-cuenta" ? ["Pagado", "Saldo"] : []),
      "Estado",
      "Acciones",
    ];
    csv = data.map((d) => [
      d.number,
      dateLabel(d.date),
      partyName(d.partyId),
      warehouseName(d.warehouseId),
      d.method,
      d.total,
      ...(view === "estado-cuenta" ? [d.total - d.balance, d.balance] : []),
      d.status,
    ]);
    rows = data.map((d) => ({
      id: d.id,
      search: `${d.number} ${partyName(d.partyId)} ${[...state.customers, ...state.suppliers].find((p) => p.id === d.partyId)?.taxId} ${state.documents.find((x) => x.id === d.sourceId)?.number ?? ""}`,
      cells: [
        <>
          <b>{d.number}</b>
          {d.demo && <small>DEMO · operación simulada</small>}
          {d.sourceId && (
            <small>
              Ref. {state.documents.find((x) => x.id === d.sourceId)?.number}
            </small>
          )}
        </>,
        dateLabel(d.date),
        <SupplierDetailsTrigger supplierId={d.partyId}>
          {partyName(d.partyId)}
        </SupplierDetailsTrigger>,
        warehouseName(d.warehouseId),
        d.method,
        money(d.total),
        ...(view === "estado-cuenta"
          ? [
              money(d.total - d.balance),
              <b className="negative">{money(d.balance)}</b>,
            ]
          : []),
        <Tag value={d.status} />,
        <div className="row-actions">
          <button className="secondary-btn" onClick={() => setDetail(d.id)}>
            Ver
          </button>
          {d.kind === "OC" &&
            ["Pendiente", "Recibida parcial"].includes(d.status) && (
              <button className="btn" onClick={() => setAction(d)}>
                Recibir
              </button>
            )}
          {d.kind === "OV" && d.status === "Pendiente" && (
            <button className="btn" onClick={() => setAction(d)}>
              Facturar
            </button>
          )}
          {view === "estado-cuenta" && d.balance > 0 && (
            <button className="btn" onClick={() => setAction(d)}>
              Cobrar
            </button>
          )}
        </div>,
      ],
    }));
  }
  const actualFilters = (
    <>
      {view !== "stock-productos" && (
        <label className="filter-field">
          Fecha
          <input
            aria-label="Filtrar por fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
      )}
      <select
        aria-label="Filtrar estado"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
      >
        <option>Todos</option>
        {filterOptions.map((s) => (
          <option key={s}>{s}</option>
        ))}
      </select>
      <select
        aria-label="Filtrar almacén"
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
      <button
        className="secondary-btn"
        onClick={() => {
          setDate("");
          setStatus("Todos");
          setWarehouse("Todos");
        }}
      >
        Limpiar
      </button>
    </>
  );

  return (
    <>
      <Head
        title={name}
        description={descriptions[view]}
        actions={
          <>
            <button
              className="secondary-btn"
              onClick={() =>
                exportCsv(
                  view,
                  headers.filter((h) => h !== "Acciones"),
                  csv,
                )
              }
            >
              <Icon name="download" size={15} />
              Exportar CSV
            </button>
            {["orden-compra", "orden-venta"].includes(view) && (
              <button
                className="btn"
                aria-label="+ Nueva orden"
                onClick={() => setEditor(true)}
              >
                <Icon name="plus" size={15} />
                Nueva orden
              </button>
            )}
          </>
        }
      />
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Metrics items={metrics} />
      {view === "ingreso-kardex" && pending.length > 0 && (
        <section className="card pending-card">
          <h2>Compras pendientes de recepción</h2>
          {pending.map((d) => (
            <div key={d.id}>
              <span>
                <b>{d.number}</b> · {partyName(d.partyId)} ·{" "}
                <Tag value={d.status} />
              </span>
              <button className="btn" onClick={() => setAction(d)}>
                Registrar ingreso
              </button>
            </div>
          ))}
        </section>
      )}
      {view === "facturacion" && awaiting.length > 0 && (
        <section className="card pending-card">
          <h2>Ventas pendientes de facturación</h2>
          {awaiting.map((d) => (
            <div key={d.id}>
              <span>
                <b>{d.number}</b> · {partyName(d.partyId)} · {money(d.total)}
              </span>
              <button className="btn" onClick={() => setAction(d)}>
                Emitir comprobante
              </button>
            </div>
          ))}
        </section>
      )}
      <div className="operational-layout">
        <div>
          <Records
            headers={headers}
            rows={rows}
            filters={actualFilters}
            searchText="Buscar documento, producto, cliente o proveedor…"
          />
        </div>
        <aside className="card summary-panel">
          <h2>Resumen financiero</h2>
          <small>Total órdenes de compra</small>
          <b>{money(oc.reduce((s, d) => s + d.total, 0))}</b>
          <small>Total ventas facturadas</small>
          <b>{money(cp.reduce((s, d) => s + d.total, 0))}</b>
          <small>Saldo por cobrar</small>
          <b>{money(cp.reduce((s, d) => s + d.balance, 0))}</b>
          <hr />
          <h2>Operación integrada</h2>
          <p className="muted">
            Recibir compras genera entradas. Facturar ventas genera salidas.
            Cobrar actualiza la deuda del cliente.
          </p>
          <small>
            Los indicadores financieros muestran todo el historial. La tabla y
            su exportación respetan fecha, estado y almacén.
          </small>
        </aside>
      </div>
      {editor && (
        <OrderEditor
          kind={view === "orden-compra" ? "OC" : "OV"}
          onClose={() => setEditor(false)}
          onSave={(draft) => {
            transact((s) => {
              createDocument(s, draft);
            });
            setEditor(false);
            setNotice("Orden creada correctamente.");
          }}
        />
      )}
      {action && action.kind === "OC" ? (
        <ReceiptModal
          doc={state.documents.find((d) => d.id === action.id)!}
          onClose={() => setAction(null)}
          onComplete={() => {
            setAction(null);
            setNotice("Ingreso registrado. Stock y Kardex actualizados.");
          }}
        />
      ) : (
        action && (
          <ActionModal
            doc={state.documents.find((d) => d.id === action.id)!}
            onClose={() => setAction(null)}
            onComplete={() => {
              setAction(null);
              setNotice(
                "Operación registrada. Inventario y documentos actualizados.",
              );
            }}
          />
        )
      )}
      {view === "estado-cuenta" && <PayablesPanel />}
      {detail && state.documents.find((d) => d.id === detail) && (
        <DocDetail
          doc={state.documents.find((d) => d.id === detail)!}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
function ActionModal({
  doc,
  onClose,
  onComplete,
}: {
  doc: Document;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { state, transact } = useErp();
  const [date, setDate] = useState(today());
  const [warehouse, setWarehouse] = useState(doc.warehouseId);
  const [voucher, setVoucher] = useState(doc.voucher || vouchers[0]);
  const [amount, setAmount] = useState(doc.balance);
  const [method, setMethod] = useState(paymentMethods[0]);
  const [reference, setReference] = useState("");
  const [error, setError] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      doc.lines.map((l) => [
        l.productId,
        l.quantity - (doc.received?.[l.productId] ?? 0),
      ]),
    ),
  );
  const title =
    doc.kind === "OC"
      ? "Recibir compra"
      : doc.kind === "OV"
        ? "Facturar venta"
        : "Registrar cobro";
  return (
    <Modal title={`${title} · ${doc.number}`} onClose={onClose} wide>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            transact((s) => {
              if (doc.kind === "OC")
                receive(s, doc.id, quantities, warehouse, date);
              else if (doc.kind === "OV") invoice(s, doc.id, voucher, date);
              else pay(s, doc.id, { date, amount, method, reference });
            });
            onComplete();
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Error al registrar.",
            );
          }
        }}
      >
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-grid">
          <label>
            Fecha
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          {doc.kind === "OC" ? (
            <label>
              Almacén de recepción
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              >
                {state.warehouses
                  .filter((w) => w.active)
                  .map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
              </select>
            </label>
          ) : doc.kind === "OV" ? (
            <label>
              Comprobante
              <select
                value={voucher}
                onChange={(e) => setVoucher(e.target.value)}
              >
                {vouchers.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <label>
                Importe a cobrar
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={doc.balance}
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </label>
              <label>
                Medio de pago
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                >
                  {paymentMethods.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
              <label>
                Referencia de operación
                <input
                  required
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
        {doc.kind === "OC" && (
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Ordenado</th>
                  <th>Recibido</th>
                  <th>Recibir ahora</th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((l) => (
                  <tr key={l.productId}>
                    <td>
                      {state.products.find((p) => p.id === l.productId)?.name}
                    </td>
                    <td>{l.quantity}</td>
                    <td>{doc.received?.[l.productId] ?? 0}</td>
                    <td>
                      <input
                        type="number"
                        aria-label={`Recibir ${l.productId}`}
                        min="0"
                        step="0.001"
                        max={l.quantity - (doc.received?.[l.productId] ?? 0)}
                        value={quantities[l.productId]}
                        onChange={(e) =>
                          setQuantities((q) => ({
                            ...q,
                            [l.productId]: Number(e.target.value),
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="muted">
          {doc.kind === "OC"
            ? "Se generará una nota de ingreso y aumentará el stock del almacén seleccionado. Puedes completar el remanente en otra recepción."
            : doc.kind === "OV"
              ? `Se emitirá el comprobante por ${money(doc.total)} y se descontará el stock. ${isCredit(doc.method) ? "La venta quedará pendiente de cobro." : "El pago al contado quedará registrado."}`
              : `Saldo actual: ${money(doc.balance)}. El cobro actualizará la deuda del cliente.`}
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn">Confirmar {title.toLowerCase()}</button>
        </div>
      </form>
    </Modal>
  );
}
export function Quotes() {
  const { state, transact } = useErp();
  const [status, setStatus] = useState("Todas");
  const [editor, setEditor] = useState<Quote | true | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirm, setConfirm] = useState<{
    quote: Quote;
    action: "send" | "reject" | "accept";
  } | null>(null);
  const data = state.quotes.filter(
    (q) => status === "Todas" || q.status === status,
  );
  const party = (id: string) =>
    state.customers.find((c) => c.id === id)?.name ?? id;
  return (
    <>
      <Head
        title="Cotización"
        description="Prepara propuestas, registra la aceptación y convierte cada cotización en una venta."
        actions={
          <button
            className="btn"
            aria-label="+ Nueva cotización"
            onClick={() => setEditor(true)}
          >
            <Icon name="plus" size={15} />
            Nueva cotización
          </button>
        }
      />
      <div className="process-flow">
        {[
          "Cotización",
          "Aceptación del cliente",
          "Orden de venta",
          "Facturación",
          "Estado de cuenta",
        ].map((step, i) => (
          <span key={step}>
            <b>{i + 1}</b>
            {step}
          </span>
        ))}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <Metrics
        items={(["Borrador", "Enviada", "Aceptada", "Procesada"] as const).map(
          (s) => [s, state.quotes.filter((q) => q.status === s).length],
        )}
      />
      <Records
        headers={[
          "Número",
          "Fecha",
          "Cliente",
          "Vigencia",
          "Total",
          "Estado",
          "Vínculo",
          "Acciones",
        ]}
        filters={
          <select
            aria-label="Estado de cotización"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {["Todas", "Borrador", "Enviada", "Aceptada", "Procesada"].map(
              (s) => (
                <option key={s}>{s}</option>
              ),
            )}
          </select>
        }
        rows={data.map((q) => ({
          id: q.id,
          search: `${q.number} ${party(q.partyId)}`,
          cells: [
            q.number,
            dateLabel(q.date),
            party(q.partyId),
            `${q.validity} días`,
            money(q.total),
            <Tag value={q.status} />,
            q.orderId ? (
              <button
                className="secondary-btn"
                onClick={() => setDetail(q.orderId!)}
              >
                {state.documents.find((d) => d.id === q.orderId)?.number}
              </button>
            ) : (
              "—"
            ),
            <div className="row-actions">
              {["Borrador", "Enviada"].includes(q.status) && (
                <button className="secondary-btn" onClick={() => setEditor(q)}>
                  Editar
                </button>
              )}
              {q.status === "Borrador" && (
                <button
                  className="btn"
                  onClick={() => setConfirm({ quote: q, action: "send" })}
                >
                  Enviar
                </button>
              )}
              {q.status === "Enviada" && (
                <>
                  <button
                    className="btn"
                    onClick={() => setConfirm({ quote: q, action: "accept" })}
                  >
                    Aceptó
                  </button>
                  <button
                    className="secondary-btn"
                    onClick={() => setConfirm({ quote: q, action: "reject" })}
                  >
                    No aceptó
                  </button>
                </>
              )}
              {q.orderId && (
                <a className="secondary-btn" href="/facturacion">
                  Ir a facturación
                </a>
              )}
            </div>,
          ],
        }))}
        onExport={() =>
          exportCsv(
            "cotizaciones",
            ["Número", "Fecha", "Cliente", "Vigencia", "Total", "Estado"],
            data.map((q) => [
              q.number,
              q.date,
              party(q.partyId),
              q.validity,
              q.total,
              q.status,
            ]),
          )
        }
      />
      {editor && (
        <OrderEditor
          kind="COT"
          quote={editor === true ? undefined : editor}
          onClose={() => setEditor(null)}
          onSave={(draft, validity) => {
            transact((s) => {
              saveQuote(
                s,
                { ...draft, validity },
                editor === true ? undefined : editor.id,
              );
            });
            setEditor(null);
            setNotice("Cotización guardada.");
          }}
        />
      )}
      {confirm && (
        <Modal
          title={
            confirm.action === "accept"
              ? "Confirmar aceptación"
              : confirm.action === "reject"
                ? "Registrar rechazo"
                : "Enviar cotización"
          }
          onClose={() => setConfirm(null)}
        >
          <p>
            {confirm.quote.number} · {party(confirm.quote.partyId)} ·{" "}
            {money(confirm.quote.total)}
          </p>
          <p>
            {confirm.action === "accept"
              ? "Se creará una orden de venta vinculada. El stock se descontará al facturar."
              : confirm.action === "reject"
                ? "La cotización volverá a borrador para editarla o reenviarla."
                : "La cotización se marcará como enviada. Este botón registra el estado; no envía un correo."}
          </p>
          <div className="modal-actions">
            <button className="secondary-btn" onClick={() => setConfirm(null)}>
              Cancelar
            </button>
            <button
              className="btn"
              onClick={() => {
                try {
                  transact((s) =>
                    changeQuote(s, confirm.quote.id, confirm.action),
                  );
                  setNotice("Cotización actualizada.");
                  setError("");
                  setConfirm(null);
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "No se pudo actualizar.",
                  );
                  setConfirm(null);
                }
              }}
            >
              Confirmar
            </button>
          </div>
        </Modal>
      )}
      {detail && state.documents.find((d) => d.id === detail) && (
        <DocDetail
          doc={state.documents.find((d) => d.id === detail)!}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
