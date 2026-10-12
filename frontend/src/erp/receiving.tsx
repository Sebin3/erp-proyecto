import { useRef, useState } from "react";
import {
  ArrowDownToLine,
  Check,
  ClipboardList,
  Download,
  Eye,
  Package,
  Warehouse,
  X,
} from "lucide-react";
import { useErp } from "./store";
import {
  dateLabel,
  money,
  quantityRound,
  receive,
  today,
  type Document,
} from "./model";
import { DocDetail, exportCsv, Records } from "./ui";
import { Modal } from "./modal";
import "./receiving.css";

const pendingLines = (doc: Document) =>
  doc.lines
    .map((line) => ({
      ...line,
      pending: quantityRound(
        line.quantity - (doc.received?.[line.productId] ?? 0),
      ),
    }))
    .filter((line) => line.pending > 0);
const quantity = (value: number) =>
  new Intl.NumberFormat("es-PE", { maximumFractionDigits: 3 }).format(value);

export function ReceivingPage() {
  const { state } = useErp();
  const [date, setDate] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [status, setStatus] = useState("");
  const [pendingPage, setPendingPage] = useState(0);
  const [actionId, setActionId] = useState("");
  const [detailId, setDetailId] = useState("");
  const [notice, setNotice] = useState("");
  const notes = state.documents.filter((d) => d.kind === "NI");
  const pending = state.documents.filter(
    (d) =>
      d.kind === "OC" &&
      ["Pendiente", "Recibida parcial"].includes(d.status) &&
      pendingLines(d).length > 0,
  );
  const supplier = (id: string) =>
    state.suppliers.find((p) => p.id === id)?.name ?? id;
  const warehouseName = (id: string) =>
    state.warehouses.find((w) => w.id === id)?.name ?? id;
  const productName = (id: string) =>
    state.products.find((p) => p.id === id)?.name ?? id;
  const sourceNumber = (doc: Document) =>
    state.documents.find((d) => d.id === doc.sourceId)?.number ??
    "Sin referencia";
  const data = notes.filter(
    (d) =>
      (!date || d.date === date) &&
      (!warehouse || d.warehouseId === warehouse) &&
      (!status || d.status === status),
  );
  const entryIds = new Set(notes.map((d) => d.id));
  const entries = state.movements.filter(
    (m) => m.type === "Entrada" && entryIds.has(m.documentId),
  );
  const pendingPages = Math.max(1, Math.ceil(pending.length / 5));
  const current = Math.min(pendingPage, pendingPages - 1);
  const metrics = [
    {
      label: "Notas de ingreso",
      value: notes.length,
      caption: "Recepciones registradas",
      icon: ClipboardList,
    },
    {
      label: "Órdenes por recibir",
      value: pending.length,
      caption: `${pending.filter((d) => d.status === "Recibida parcial").length} con recepción parcial`,
      icon: Package,
    },
    {
      label: "Unidades ingresadas",
      value: quantity(
        quantityRound(entries.reduce((sum, m) => sum + m.quantity, 0)),
      ),
      caption: "Suma de cantidades del Kardex",
      icon: ArrowDownToLine,
    },
    {
      label: "Almacenes",
      value: new Set(notes.map((d) => d.warehouseId)).size,
      caption: "Con ingresos registrados",
      icon: Warehouse,
    },
  ];
  const headers = [
    "Nota de ingreso",
    "Fecha",
    "Proveedor",
    "Almacén",
    "Productos",
    "Valor al costo",
    "Estado",
    "Acciones",
  ];
  const csv = data.map((d) => [
    d.number,
    dateLabel(d.date),
    supplier(d.partyId),
    warehouseName(d.warehouseId),
    d.lines.length,
    d.total,
    d.status,
    sourceNumber(d),
  ]);
  const rows = data.map((d) => ({
    id: d.id,
    search: `${d.number} ${supplier(d.partyId)} ${sourceNumber(d)} ${warehouseName(d.warehouseId)} ${d.lines.map((l) => `${l.productId} ${productName(l.productId)}`).join(" ")}`,
    sortValues: [
      d.number,
      d.date,
      supplier(d.partyId),
      warehouseName(d.warehouseId),
      d.lines.length,
      d.total,
      d.status,
    ],
    cells: [
      <div className="rc-document">
        <strong>{d.number}</strong>
        <small>
          {sourceNumber(d)}
          {d.demo ? " · DEMO" : ""}
        </small>
      </div>,
      dateLabel(d.date),
      <span className="rc-party" title={supplier(d.partyId)}>
        {supplier(d.partyId)}
      </span>,
      warehouseName(d.warehouseId),
      d.lines.length,
      money(d.total),
      <span className="rc-status">
        <Check size={12} aria-hidden="true" />
        {d.status}
      </span>,
      <button
        className="secondary-btn"
        aria-label={`Ver nota ${d.number}`}
        onClick={() => setDetailId(d.id)}
      >
        <Eye size={14} />
        Ver
      </button>,
    ],
  }));
  const detail = state.documents.find((d) => d.id === detailId);
  const action = state.documents.find((d) => d.id === actionId);
  return (
    <div className="receiving-module">
      <div className="hd page-head">
        <div>
          <h1>Ingreso al Kardex</h1>
          <p className="sub no-margin">
            Registra recepciones parciales o completas y actualiza las
            existencias por almacén.
          </p>
        </div>
        <button
          className="secondary-btn"
          onClick={() =>
            exportCsv(
              "ingreso-kardex",
              [...headers.slice(0, -1), "Orden de compra"],
              csv,
            )
          }
        >
          <Download size={15} />
          Exportar CSV
        </button>
      </div>
      {notice && (
        <p className="rc-notice" role="status">
          <Check size={16} />
          {notice}
        </p>
      )}
      <div className="integrated-metrics rc-metrics">
        {metrics.map(({ label, value, caption, icon: MetricIcon }) => (
          <section className="card metric" key={label}>
            <div className="metric-header">
              <small>{label}</small>
              <span className="metric-icon">
                <MetricIcon size={18} strokeWidth={1.7} />
              </span>
            </div>
            <b>{value}</b>
            <span className="metric-caption">{caption}</span>
          </section>
        ))}
      </div>
      <section className="card rc-pending">
        <div className="rc-section-head">
          <div>
            <h2>Compras pendientes de recepción</h2>
            <p>
              Revisa el remanente de cada orden antes de registrar el ingreso.
            </p>
          </div>
          <span className="rc-count">{pending.length} órdenes</span>
        </div>
        {pending.slice(current * 5, (current + 1) * 5).map((doc) => (
          <article className="rc-order" key={doc.id}>
            <div className="rc-order-identity">
              <button
                className="rc-order-link"
                onClick={() => setDetailId(doc.id)}
              >
                {doc.number}
                <Eye size={13} />
              </button>
              <strong title={supplier(doc.partyId)}>
                {supplier(doc.partyId)}
              </strong>
              <small>
                {dateLabel(doc.date)} · {warehouseName(doc.warehouseId)}
              </small>
              <span className="rc-status">{doc.status}</span>
            </div>
            <div className="rc-order-products">
              <small className="rc-overline">
                {pendingLines(doc).length} productos pendientes
              </small>
              {pendingLines(doc).map((line) => (
                <div key={line.productId}>
                  <span title={productName(line.productId)}>
                    {productName(line.productId)}
                  </span>
                  <strong>
                    {quantity(line.pending)}{" "}
                    <small>
                      {
                        state.products.find((p) => p.id === line.productId)
                          ?.unit
                      }
                    </small>
                  </strong>
                </div>
              ))}
            </div>
            <button className="btn" onClick={() => setActionId(doc.id)}>
              <ArrowDownToLine size={15} />
              Registrar ingreso
            </button>
          </article>
        ))}
        {!pending.length && (
          <div className="rc-empty">
            <Check size={20} />
            <strong>No hay compras pendientes de recepción</strong>
            <p>
              Las órdenes completamente recibidas permanecen disponibles en
              Compras.
            </p>
          </div>
        )}
        {pendingPages > 1 && (
          <div className="rc-pending-pages">
            <span>
              Página {current + 1} de {pendingPages}
            </span>
            <button
              className="secondary-btn"
              disabled={!current}
              onClick={() => setPendingPage(current - 1)}
            >
              Anterior
            </button>
            <button
              className="secondary-btn"
              disabled={current + 1 >= pendingPages}
              onClick={() => setPendingPage(current + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
      <div className="rc-notes-head">
        <div>
          <h2>Notas de ingreso</h2>
          <p>
            Recepciones vinculadas a órdenes de compra y movimientos de
            inventario.
          </p>
        </div>
      </div>
      <Records
        headers={headers}
        rows={rows}
        sortable
        searchText="Buscar nota, orden, proveedor o producto…"
        empty="No hay notas de ingreso para esta búsqueda. Revisa los filtros o registra una recepción."
        filters={
          <>
            <label className="filter-field">
              Fecha
              <input
                type="date"
                aria-label="Filtrar por fecha"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="filter-field">
              Estado
              <select
                aria-label="Filtrar estado"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Todos los estados</option>
                {[...new Set(notes.map((d) => d.status))].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              Almacén
              <select
                aria-label="Filtrar almacén"
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
              >
                <option value="">Todos los almacenes</option>
                {state.warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary-btn"
              onClick={() => {
                setDate("");
                setStatus("");
                setWarehouse("");
              }}
            >
              <X size={14} />
              Limpiar
            </button>
          </>
        }
      />
      {action && (
        <ReceiptModal
          doc={action}
          onClose={() => setActionId("")}
          onComplete={(note) => {
            setActionId("");
            setNotice(
              `${note.number} registrada. Stock del almacén y movimientos de Kardex actualizados.`,
            );
          }}
        />
      )}
      {detail && <DocDetail doc={detail} onClose={() => setDetailId("")} />}
    </div>
  );
}

export function ReceiptModal({
  doc,
  onClose,
  onComplete,
}: {
  doc: Document;
  onClose: () => void;
  onComplete: (note: Document) => void;
}) {
  const { state, transact } = useErp();
  const [date, setDate] = useState(today());
  const [warehouse, setWarehouse] = useState(doc.warehouseId);
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      doc.lines.map((l) => [
        l.productId,
        quantityRound(l.quantity - (doc.received?.[l.productId] ?? 0)),
      ]),
    ),
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitted = useRef(false);
  const [requestId] = useState(() => crypto.randomUUID());
  const valid = doc.lines.every(
    (l) =>
      Number.isFinite(quantities[l.productId]) &&
      quantities[l.productId] >= 0 &&
      quantities[l.productId] <=
        quantityRound(l.quantity - (doc.received?.[l.productId] ?? 0)) &&
      Math.abs(
        quantities[l.productId] - quantityRound(quantities[l.productId]),
      ) < 1e-9,
  );
  const hasQuantity = Object.values(quantities).some((q) => q > 0);
  const complete = doc.lines.every(
    (l) =>
      quantities[l.productId] ===
      quantityRound(l.quantity - (doc.received?.[l.productId] ?? 0)),
  );
  const value = doc.lines.reduce(
    (sum, l) => sum + (quantities[l.productId] || 0) * l.price,
    0,
  );
  return (
    <Modal
      title={`Recibir compra · ${doc.number}`}
      subtitle="Confirma las cantidades efectivamente recibidas en el almacén."
      className="receipt-modal"
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (submitted.current) return;
          submitted.current = true;
          setSubmitting(true);
          setError("");
          try {
            let note: Document | undefined;
            transact((draft) => {
              note = receive(
                draft,
                doc.id,
                quantities,
                warehouse,
                date,
                requestId,
              );
            });
            onComplete(note!);
          } catch (err) {
            submitted.current = false;
            setSubmitting(false);
            setError(
              err instanceof Error
                ? err.message
                : "No se pudo registrar el ingreso.",
            );
          }
        }}
      >
        <div className="rc-receipt-context">
          <Package size={20} />
          <div>
            <strong>
              {state.suppliers.find((p) => p.id === doc.partyId)?.name ??
                doc.partyId}
            </strong>
            <small>
              Orden {doc.number} · {dateLabel(doc.date)}
            </small>
          </div>
          <span className="rc-status">{doc.status}</span>
        </div>
        {error && (
          <p className="rc-error" role="alert">
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
          <label>
            Almacén de recepción
            <select
              required
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
            >
              <option value="" disabled>
                Selecciona un almacén
              </option>
              {state.warehouses
                .filter((w) => w.active)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div className="rc-receipt-toolbar">
          <div>
            <h3>Productos por recibir</h3>
            <p>Usa 0 para dejar un producto pendiente.</p>
          </div>
          <button
            type="button"
            className="secondary-btn"
            onClick={() =>
              setQuantities(
                Object.fromEntries(
                  doc.lines.map((l) => [
                    l.productId,
                    quantityRound(
                      l.quantity - (doc.received?.[l.productId] ?? 0),
                    ),
                  ]),
                ),
              )
            }
          >
            Completar pendientes
          </button>
        </div>
        <div className="tw rc-receipt-table">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Pendiente</th>
                <th>Costo unitario</th>
                <th>Recibir ahora</th>
                <th>Restante</th>
              </tr>
            </thead>
            <tbody>
              {doc.lines.map((l) => {
                const product = state.products.find(
                  (p) => p.id === l.productId,
                );
                const pending = quantityRound(
                  l.quantity - (doc.received?.[l.productId] ?? 0),
                );
                const invalid =
                  !Number.isFinite(quantities[l.productId]) ||
                  quantities[l.productId] < 0 ||
                  quantities[l.productId] > pending;
                return (
                  <tr key={l.productId}>
                    <td>
                      <strong>{product?.name ?? l.productId}</strong>
                      <small>
                        {l.productId} · Ordenado: {quantity(l.quantity)} ·
                        Recibido: {quantity(doc.received?.[l.productId] ?? 0)}
                      </small>
                    </td>
                    <td>
                      {quantity(pending)} <small>{product?.unit}</small>
                    </td>
                    <td>{money(l.price)}</td>
                    <td>
                      <input
                        type="number"
                        aria-label={`Recibir ${l.productId}`}
                        aria-invalid={invalid}
                        required
                        min="0"
                        step="0.001"
                        max={pending}
                        disabled={!pending}
                        value={
                          Number.isNaN(quantities[l.productId])
                            ? ""
                            : quantities[l.productId]
                        }
                        onChange={(e) =>
                          setQuantities((q) => ({
                            ...q,
                            [l.productId]:
                              e.target.value === ""
                                ? NaN
                                : Number(e.target.value),
                          }))
                        }
                      />
                    </td>
                    <td>
                      {invalid
                        ? "Revisa cantidad"
                        : quantity(
                            quantityRound(pending - quantities[l.productId]),
                          )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="rc-receipt-summary">
          <div>
            <span className="rc-status">
              {!hasQuantity
                ? "Sin cantidades"
                : valid
                  ? complete
                    ? "Recepción completa"
                    : "Recepción parcial"
                  : "Revisar cantidades"}
            </span>
            <p>
              Se generará una nota y una entrada de Kardex por producto. El
              remanente quedará pendiente en la orden.
            </p>
          </div>
          <div>
            <small>Valor al costo</small>
            <strong>{money(value)}</strong>
          </div>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn"
            disabled={
              submitting ||
              !valid ||
              !hasQuantity ||
              !state.warehouses.some((w) => w.id === warehouse && w.active)
            }
          >
            <ArrowDownToLine size={15} />
            {submitting ? "Registrando ingreso…" : "Confirmar recibir compra"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
