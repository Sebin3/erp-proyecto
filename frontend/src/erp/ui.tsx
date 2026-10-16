import { Modal } from "./modal";
import { SalesDocumentDetailsModal } from "./sales-documents";
import { QuoteEditor } from "./quote-editor";
export { Modal } from "./modal";
import { SupplierSelector, SupplierDetailsTrigger } from "./suppliers";
import { ProductSelectorModal, ProductDetailsTrigger } from "./products";
import { appendProducts } from "./product-query";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { useErp } from "./store";
import { Icon, type IconName } from "./icons";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "./toast";
import { ExportMenu, type ExportData } from "./exports";
export { ExportMenu } from "./exports";
export type { ExportData } from "./exports";
import {
  dateLabel,
  money,
  total,
  methods,
  vouchers,
  today,
  type Draft,
  type Line,
  type Document,
  type Quote,
} from "./model";
export function Tag({ value }: { value: string }) {
  const tone =
    /Pagada|Recibida$|Registrado|Facturada|Procesada|Disponible|Activo/.test(
      value,
    )
      ? "ok"
      : /Sin stock|Inactivo|Vencid/.test(value)
        ? "bad"
        : "warn";
  return (
    <span className={`tag ${tone}`}>
      <span className="status-dot" />
      {value}
    </span>
  );
}
export function Metrics({ items }: { items: [string, string | number][] }) {
  const metricIcon = (label: string): IconName =>
    /compra|ordenad/i.test(label)
      ? "purchase"
      : /venta|factur|vendid/i.test(label)
        ? "sale"
        : /cobr|saldo|crédito|pagad/i.test(label)
          ? "wallet"
          : /almac/i.test(label)
            ? "building"
            : /entrada|ingres|recibid/i.test(label)
              ? "receive"
              : /salida|movimiento/i.test(label)
                ? "movement"
                : /producto|unidad|stock|mínimo/i.test(label)
                  ? "stock"
                  : /pendiente|atención/i.test(label)
                    ? "clock"
                    : "report";
  return (
    <div
      className="integrated-metrics"
      style={
        { "--metric-count": Math.min(4, items.length) } as React.CSSProperties
      }
    >
      {items.map(([label, value]) => (
        <section className="card metric" key={label}>
          <div className="metric-header">
            <small>{label}</small>
            <span className="metric-icon">
              <Icon name={metricIcon(label)} size={17} />
            </span>
          </div>
          <b>{value}</b>
          <span className="metric-caption">
            {label.includes("historial")
              ? "Historial de operaciones"
              : /mes|trimestre|año/i.test(label)
                ? "Período seleccionado"
                : "Datos de tu operación"}
          </span>
        </section>
      ))}
    </div>
  );
}
export function DragScroll({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef({
    active: false,
    moved: false,
    suppressClick: false,
    startX: 0,
    startScrollLeft: 0,
  });

  const stopDragging = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    drag.current.suppressClick = drag.current.moved;
    event.currentTarget.classList.remove("is-dragging");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={root}
      className="tw"
      onPointerDown={(event) => {
        drag.current.suppressClick = false;
        if (event.pointerType === "mouse" && event.button !== 0) return;
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(
            "button, a, input, select, textarea, label, [role='button']",
          )
        ) {
          return;
        }
        if (
          event.currentTarget.scrollWidth <= event.currentTarget.clientWidth
        ) {
          return;
        }
        drag.current = {
          active: true,
          moved: false,
          suppressClick: false,
          startX: event.clientX,
          startScrollLeft: event.currentTarget.scrollLeft,
        };
        event.currentTarget.classList.add("is-dragging");
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!drag.current.active) return;
        const distance = event.clientX - drag.current.startX;
        if (Math.abs(distance) > 4) drag.current.moved = true;
        if (drag.current.moved) {
          event.preventDefault();
          event.currentTarget.scrollLeft =
            drag.current.startScrollLeft - distance;
        }
      }}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onClickCapture={(event) => {
        if (!drag.current.suppressClick) return;
        event.preventDefault();
        event.stopPropagation();
        drag.current.suppressClick = false;
      }}
    >
      {children}
    </div>
  );
}
export function Records({
  headers,
  rows,
  searchText,
  filters,
  exportData,
  empty = "No hay registros que coincidan con los filtros.",
  sortable = false,
  loading = false,
  initialPageSize = 10,
  pageSizes = [10, 25, 50],
}: {
  headers: string[];
  rows: {
    id: string;
    cells: ReactNode[];
    search: string;
    sortValues?: (string | number)[];
  }[];
  searchText?: string;
  filters?: ReactNode;
  exportData?: ExportData;
  empty?: string;
  sortable?: boolean;
  loading?: boolean;
  initialPageSize?: number;
  pageSizes?: number[];
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(initialPageSize);
  const [sort, setSort] = useState<{
    index: number;
    descending: boolean;
  } | null>(null);
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = rows.filter((r) => norm(r.search).includes(norm(query)));
  if (sortable && sort)
    filtered.sort((a, b) => {
      const first =
        a.sortValues?.[sort.index] ??
        (typeof a.cells[sort.index] === "string" ||
        typeof a.cells[sort.index] === "number"
          ? (a.cells[sort.index] as string | number)
          : "");
      const second =
        b.sortValues?.[sort.index] ??
        (typeof b.cells[sort.index] === "string" ||
        typeof b.cells[sort.index] === "number"
          ? (b.cells[sort.index] as string | number)
          : "");
      const comparison =
        typeof first === "number" && typeof second === "number"
          ? first - second
          : String(first).localeCompare(String(second), "es", {
              numeric: true,
              sensitivity: "base",
            });
      return sort.descending ? -comparison : comparison;
    });
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages - 1);
  return (
    <section className="card records">
      <div className="table-tools">
        <div className="record-search">
          <Icon name="search" size={16} />
          <input
            aria-label="Buscar registros"
            placeholder={searchText ?? "Buscar…"}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </div>
        {filters}
        {query && (
          <button
            type="button"
            className="secondary-btn records-clear-search"
            onClick={() => {
              setQuery("");
              setPage(0);
            }}
          >
            Limpiar búsqueda
          </button>
        )}
        <span>{filtered.length} registros</span>
        {exportData && <ExportMenu data={exportData} />}
      </div>
      <DragScroll>
        <table>
          <thead>
            <tr>
              {headers.map((h, index) => (
                <th
                  key={h}
                  aria-sort={
                    sortable && h !== "Acciones"
                      ? sort?.index === index
                        ? sort.descending
                          ? "descending"
                          : "ascending"
                        : "none"
                      : undefined
                  }
                  className={
                    /importe|total|saldo|pagado|precio|costo|monto|cantidad|mínimo|^valor|^crédito|^unidades|^almacén (principal|secundario|arequipa)/i.test(
                      h,
                    )
                      ? "numeric-cell"
                      : undefined
                  }
                >
                  {sortable && h !== "Acciones" ? (
                    <button
                      type="button"
                      className="column-sort"
                      onClick={() => {
                        setSort({
                          index,
                          descending:
                            sort?.index === index ? !sort.descending : false,
                        });
                        setPage(0);
                      }}
                    >
                      {h}
                      {sort?.index === index ? (
                        sort.descending ? (
                          <ArrowDown />
                        ) : (
                          <ArrowUp />
                        )
                      ) : (
                        <ArrowUpDown />
                      )}
                    </button>
                  ) : (
                    h
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(loading ? [] : filtered)
              .slice(current * size, (current + 1) * size)
              .map((r) => (
                <tr key={r.id}>
                  {r.cells.map((c, i) => (
                    <td
                      key={i}
                      data-label={headers[i]}
                      className={
                        /importe|total|saldo|pagado|precio|costo|monto|cantidad|mínimo|^valor|^crédito|^unidades|^almacén (principal|secundario|arequipa)/i.test(
                          headers[i],
                        )
                          ? "numeric-cell"
                          : /fecha/i.test(headers[i])
                            ? "date-cell"
                            : undefined
                      }
                    >
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </DragScroll>
      {loading && (
        <div
          role="status"
          aria-label="Cargando registros"
          className="supplier-skeleton"
        >
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      )}
      {!loading && !filtered.length && (
        <div className="empty-filter">
          <span className="empty-icon">
            <Icon name="empty" size={24} />
          </span>
          <h3>Sin resultados</h3>
          <p>{empty}</p>
        </div>
      )}
      <div className="pagination">
        <span>
          {filtered.length ? current * size + 1 : 0}–
          {Math.min((current + 1) * size, filtered.length)} de {filtered.length}
        </span>
        <label>
          Filas{" "}
          <select
            aria-label="Filas por página"
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {pageSizes.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <div>
          <button
            className="secondary-btn"
            aria-label="Página anterior"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            <Icon name="chevron" className="rotate-180" size={15} />
          </button>{" "}
          {current + 1} / {pages}{" "}
          <button
            className="secondary-btn"
            aria-label="Página siguiente"
            disabled={current === pages - 1}
            onClick={() => setPage(current + 1)}
          >
            <Icon name="chevron" size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}
export function DocDetail({
  doc,
  onClose,
}: {
  doc: Document;
  onClose: () => void;
}) {
  return doc.kind === "OV" || doc.kind === "CP" ? (
    <SalesDocumentDetailsModal doc={doc} onClose={onClose} />
  ) : (
    <LegacyDocDetail doc={doc} onClose={onClose} />
  );
}
function LegacyDocDetail({
  doc,
  onClose,
}: {
  doc: Document;
  onClose: () => void;
}) {
  const { state } = useErp();
  const party = [...state.customers, ...state.suppliers].find(
    (p) => p.id === doc.partyId,
  );
  const source = state.documents.find((d) => d.id === doc.sourceId);
  return (
    <Modal
      title={doc.number}
      onClose={onClose}
      wide
      className={doc.kind === "NI" ? "receipt-detail-modal" : ""}
    >
      <div className="detail-meta">
        <div>
          <small>{doc.kind === "NI" ? "Proveedor" : "Tercero"}</small>
          <b>
            {doc.kind === "OC" || doc.kind === "NI" ? (
              <SupplierDetailsTrigger supplierId={doc.partyId}>
                {party?.name}
              </SupplierDetailsTrigger>
            ) : (
              party?.name
            )}
          </b>
          <span>RUC {party?.taxId}</span>
        </div>
        <div>
          <small>Fecha y almacén</small>
          <b>{dateLabel(doc.date)}</b>
          <span>
            {state.warehouses.find((w) => w.id === doc.warehouseId)?.name}
          </span>
        </div>
        <div>
          <small>Forma de pago</small>
          <b>{doc.method}</b>
          <Tag value={doc.status} />
        </div>
      </div>
      {source && <p className="muted">Documento de origen: {source.number}</p>}
      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>
                {doc.kind === "NI" ? "Costo unitario" : "Precio unitario"}
              </th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.productId}>
                <td>
                  <ProductDetailsTrigger
                    id={l.productId}
                    warehouseId={doc.warehouseId}
                    context={
                      doc.kind === "OC" || doc.kind === "NI" ? "OC" : "OV"
                    }
                  />
                </td>
                <td>{l.quantity}</td>
                <td>{money(l.price)}</td>
                <td>{money(l.quantity * l.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="totals">
        <span>Descuento {money(doc.discount)}</span>
        <span>Flete {money(doc.freight)}</span>
        <b>Total {money(doc.total)}</b>
        {doc.kind === "CP" && <b>Saldo pendiente {money(doc.balance)}</b>}
      </div>
      {doc.notes && <p>{doc.notes}</p>}
      {doc.payments.length > 0 && (
        <>
          <h3>Pagos registrados</h3>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Medio</th>
                  <th>Referencia</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {doc.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{dateLabel(p.date)}</td>
                    <td>{p.method}</td>
                    <td>{p.reference}</td>
                    <td>{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <div className="modal-actions">
        <ExportMenu
          data={{
            name: doc.number,
            title:
              doc.kind === "CP"
                ? `Detalle de ${doc.voucher}`
                : doc.kind === "OC"
                  ? "Detalle de orden de compra"
                  : doc.kind === "OV"
                    ? "Detalle de pedido de venta"
                    : "Detalle de nota de ingreso",
            profile: "document",
            subtitle: "Detalle de documento y líneas registradas.",
            company: { name: state.settings.company },
            documentType:
              doc.kind === "CP"
                ? `DETALLE DE ${doc.voucher.toUpperCase()}`
                : doc.kind === "OC"
                  ? "DETALLE DE ORDEN DE COMPRA"
                  : doc.kind === "OV"
                    ? "DETALLE DE PEDIDO DE VENTA"
                    : "DETALLE DE NOTA DE INGRESO",
            documentNumber: doc.number,
            meta: [
              { label: "Documento", value: doc.number },
              { label: "Tercero", value: party?.name ?? doc.partyId },
              { label: "Fecha", value: dateLabel(doc.date) },
              {
                label: "Almacén",
                value:
                  state.warehouses.find((w) => w.id === doc.warehouseId)
                    ?.name ?? doc.warehouseId,
              },
              { label: "Forma de pago", value: doc.method },
              { label: "Estado", value: doc.status },
            ],
            summary: [
              {
                label: "Subtotal",
                value: doc.lines.reduce(
                  (sum, line) => sum + line.quantity * line.price,
                  0,
                ),
              },
              { label: "Descuento", value: doc.discount },
              { label: "Flete", value: doc.freight },
              { label: "Total", value: doc.total },
            ],
            terms: doc.method,
            notes: doc.notes,
            headers: ["Producto", "Cantidad", "Precio", "Total"],
            rows: doc.lines.map((l) => [
              state.products.find((p) => p.id === l.productId)?.name ??
                l.productId,
              l.quantity,
              l.price,
              l.quantity * l.price,
            ]),
          }}
        />
        <button className="btn" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
export function OrderEditor(props: {
  kind: "OC" | "OV" | "COT";
  quote?: Quote;
  onClose: () => void;
  onSave: (draft: Draft, validity: number) => void;
}) {
  return props.kind !== "OC" ? (
    <QuoteEditor {...props} kind={props.kind} />
  ) : (
    <LegacyOrderEditor {...props} />
  );
}
function LegacyOrderEditor({
  kind,
  quote,
  onClose,
  onSave,
}: {
  kind: "OC" | "OV" | "COT";
  quote?: Quote;
  onClose: () => void;
  onSave: (draft: Draft, validity: number) => void;
}) {
  const { state } = useErp();
  const [draft, setDraft] = useState<Draft>(() =>
    quote
      ? { ...quote, kind: "OV" }
      : {
          kind: kind === "OC" ? "OC" : "OV",
          date: today(),
          partyId: "",
          warehouseId: state.warehouses.find((w) => w.active)?.id ?? "",
          method: "Contado",
          voucher: "Factura electrónica",
          lines: [],
          discount: 0,
          freight: 0,
          notes: "",
        },
  );
  const [validity, setValidity] = useState(quote?.validity ?? 15);
  const [selectingProducts, setSelectingProducts] = useState(false);
  const [error, setError] = useState("");
  const parties = kind === "OC" ? state.suppliers : state.customers;
  const update = (key: keyof Draft, value: unknown) =>
    setDraft((d) => ({ ...d, [key]: value }));
  const updateLine = (id: string, key: keyof Line, n: number) =>
    update(
      "lines",
      draft.lines.map((l) => (l.productId === id ? { ...l, [key]: n } : l)),
    );
  return (
    <Modal
      title={
        quote
          ? `Editar ${quote.number}`
          : kind === "COT"
            ? "Nueva cotización"
            : kind === "OC"
              ? "Nueva orden de compra"
              : "Nueva orden de venta"
      }
      onClose={onClose}
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            onSave(draft, validity);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "No se pudo guardar.",
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
          {kind === "OC" ? (
            <SupplierSelector
              value={draft.partyId}
              onChange={(id) => update("partyId", id)}
            />
          ) : (
            <label>
              Cliente
              <select
                required
                value={draft.partyId}
                onChange={(e) => update("partyId", e.target.value)}
              >
                <option value="">Selecciona…</option>
                {parties
                  .filter((p) => p.active)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.taxId}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <label>
            Fecha
            <input
              type="date"
              required
              value={draft.date}
              onChange={(e) => update("date", e.target.value)}
            />
          </label>
          <label>
            Almacén / sucursal
            <select
              value={draft.warehouseId}
              onChange={(e) => update("warehouseId", e.target.value)}
            >
              {state.warehouses
                .filter((w) => w.active)
                .map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} · {w.branch}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Forma de pago
            <select
              value={draft.method}
              onChange={(e) => update("method", e.target.value)}
            >
              {methods.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          {kind !== "OC" && (
            <label>
              Comprobante
              <select
                value={draft.voucher}
                onChange={(e) => update("voucher", e.target.value)}
              >
                {vouchers.map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
          {kind === "COT" && (
            <label>
              Vigencia (días)
              <input
                type="number"
                min="1"
                max="365"
                required
                value={validity}
                onChange={(e) => setValidity(Number(e.target.value))}
              />
            </label>
          )}
        </div>
        <h3>Productos</h3>
        <div className="product-picker-premium">
          <small>Busca en todo el catálogo y agrega varios productos.</small>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setSelectingProducts(true)}
          >
            <Icon name="plus" size={15} />
            Seleccionar productos
          </button>
        </div>
        {selectingProducts && (
          <ProductSelectorModal
            context={kind}
            warehouseId={draft.warehouseId}
            lines={draft.lines}
            onClose={() => setSelectingProducts(false)}
            onSelect={(ids) => {
              const next = appendProducts(
                state,
                draft.lines,
                ids,
                draft.warehouseId,
                kind,
              );
              update("lines", next);
              toast.info(ids.length + " producto(s) agregados al documento.");
            }}
          />
        )}
        <div className="tw">
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Precio unitario (IGV incluido)</th>
                <th>Total</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((l) => (
                <tr key={l.productId}>
                  <td>
                    <ProductDetailsTrigger
                      id={l.productId}
                      warehouseId={draft.warehouseId}
                      context={kind}
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Cantidad ${l.productId}`}
                      type="number"
                      min="0.001"
                      step="0.001"
                      required
                      value={l.quantity}
                      onChange={(e) =>
                        updateLine(
                          l.productId,
                          "quantity",
                          Number(e.target.value),
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      aria-label={`Precio ${l.productId}`}
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      value={l.price}
                      onChange={(e) =>
                        updateLine(l.productId, "price", Number(e.target.value))
                      }
                    />
                  </td>
                  <td>{money(l.quantity * l.price)}</td>
                  <td>
                    <button
                      type="button"
                      className="danger-action"
                      onClick={() =>
                        update(
                          "lines",
                          draft.lines.filter(
                            (x) => x.productId !== l.productId,
                          ),
                        )
                      }
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!draft.lines.length && (
          <p className="empty-filter">
            Agrega productos del catálogo para continuar.
          </p>
        )}
        <div className="form-grid">
          <label>
            Descuento global
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.discount}
              onChange={(e) => update("discount", Number(e.target.value))}
            />
          </label>
          <label>
            Flete
            <input
              type="number"
              step="0.01"
              min="0"
              value={draft.freight}
              onChange={(e) => update("freight", Number(e.target.value))}
            />
          </label>
          <label className="span-two">
            Observaciones
            <textarea
              value={draft.notes}
              onChange={(e) => update("notes", e.target.value)}
            />
          </label>
        </div>
        <div className="totals">
          <span>
            Subtotal{" "}
            {money(
              draft.lines.reduce((sum, l) => sum + l.quantity * l.price, 0),
            )}
          </span>
          <b>
            Total {money(total(draft.lines, draft.discount, draft.freight))}
          </b>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" disabled={!draft.lines.length}>
            Guardar {kind === "COT" ? "cotización" : "orden"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
