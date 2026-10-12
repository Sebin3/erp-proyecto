import { useState, useEffect, useRef } from "react";
import {
  Package,
  Search,
  X,
  Eye,
  Plus,
  Check,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from "lucide-react";
import { useErp } from "./store";
import { Modal, ModalDismissButton } from "./modal";
import { money, type Product, type Line } from "./model";
import {
  defaultProductFilters,
  queryProducts,
  productRestriction,
  productStock,
  type ProductContext,
} from "./product-query";

export function ProductDetails({
  product,
  warehouseId,
  context = "OV",
}: {
  product: Product;
  warehouseId: string;
  context?: ProductContext;
}) {
  const { state } = useErp();
  const fields = [
    ["Código interno", product.id],
    ["SKU", product.sku],
    ["Código de barras", product.barcode],
    ["Categoría", product.category],
    ["Unidad de medida", product.unit],
    ["Precio unitario", money(context === "OC" ? product.cost : product.price)],
    [
      "Stock disponible",
      `${productStock(state, product.id, warehouseId)} ${product.unit}`,
    ],
    [
      "Stock mínimo",
      product.minimum === undefined
        ? "No registrado"
        : `${product.minimum} ${product.unit}`,
    ],
    ["Estado", product.active ? "Activo" : "Inactivo"],
    ["Almacén", state.warehouses.find((w) => w.id === warehouseId)?.name],
  ];
  return (
    <div className="pd-details">
      <div className="pd-identity">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <div className="pd-avatar">
            <Package size={28} />
          </div>
        )}
        <div>
          <small>FICHA DEL PRODUCTO {product.demo && "· DEMO"}</small>
          <h2>{product.name}</h2>
          <p>
            {product.id} · {product.category}
          </p>
        </div>
      </div>
      <div className="pd-fields">
        {fields.map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value || "No registrado"}</strong>
          </div>
        ))}
      </div>
      <section className="pd-description">
        <small>Descripción</small>
        <p>{product.description || "No registrado"}</p>
      </section>
    </div>
  );
}

export function ProductSelectorModal({
  context,
  warehouseId,
  lines,
  onSelect,
  onClose,
}: {
  context: ProductContext;
  warehouseId: string;
  lines: Line[];
  onSelect: (ids: string[]) => void;
  onClose: () => void;
}) {
  const { state } = useErp();
  const [filters, setFilters] = useState({ ...defaultProductFilters });
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [detailId, setDetailId] = useState("");
  const [error, setError] = useState("");
  const view = useRef<HTMLDivElement>(null);
  const detailOrigin = useRef<HTMLButtonElement | null>(null);
  const showDetails = (id: string, origin: HTMLButtonElement) => {
    detailOrigin.current = origin;
    setDetailId(id);
  };
  useEffect(() => {
    if (detailId)
      view.current
        ?.querySelector<HTMLButtonElement>(".ps-detail-view button")
        ?.focus();
    else if (detailOrigin.current?.isConnected) detailOrigin.current.focus();
  }, [detailId]);
  const filtered = queryProducts(state, warehouseId, filters, context);
  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages - 1);
  const categories = [
    ...new Set([...state.categories, ...state.products.map((p) => p.category)]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "es"));
  const product = state.products.find((p) => p.id === detailId);
  const change = (key: keyof typeof filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(0);
  };
  const toggle = (p: Product) => {
    if (productRestriction(state, p, warehouseId, context, lines)) return;
    setSelected((ids) =>
      ids.includes(p.id) ? ids.filter((id) => id !== p.id) : [...ids, p.id],
    );
    setError("");
  };
  const confirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    try {
      onSelect(selected);
    } catch (err) {
      e.preventDefault();
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo agregar los productos.",
      );
    }
  };
  return (
    <Modal
      title="Seleccionar productos"
      subtitle="Busca y agrega productos a tu documento"
      onClose={onClose}
      wide
      className="product-selector-modal"
    >
      <div className="ps-workflow" ref={view}>
        <div className="ps-list" hidden={Boolean(product)}>
          <div className="ps-filter-panel">
            <div className="ps-intro">
              <Package size={18} />
              <span>{state.products.length} productos disponibles</span>
              <span>
                {state.warehouses.find((w) => w.id === warehouseId)?.name}
              </span>
            </div>
            <div className="ps-search">
              <Search size={18} />
              <input
                data-autofocus
                aria-label="Buscar productos"
                placeholder="Nombre, código, SKU, código de barras o descripción…"
                value={filters.query}
                onChange={(e) => change("query", e.target.value)}
              />
              {filters.query && (
                <button
                  type="button"
                  aria-label="Limpiar búsqueda"
                  onClick={() => change("query", "")}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="ps-filters">
              <label>
                Categoría
                <select
                  aria-label="Categoría"
                  value={filters.category}
                  onChange={(e) => change("category", e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Estado
                <select
                  aria-label="Estado"
                  value={filters.status}
                  onChange={(e) => change("status", e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                </select>
              </label>
              <label>
                Disponibilidad
                <select
                  aria-label="Disponibilidad"
                  value={filters.availability}
                  onChange={(e) => change("availability", e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="stock">Con stock</option>
                  <option value="empty">Sin stock</option>
                  <option value="low">Stock bajo</option>
                </select>
              </label>
              <label>
                Ordenamiento
                <select
                  aria-label="Ordenamiento"
                  value={filters.sort}
                  onChange={(e) => change("sort", e.target.value)}
                >
                  {[
                    ["name", "Nombre A-Z"],
                    ["name-desc", "Nombre Z-A"],
                    ["code", "Código"],
                    ["price", "Precio menor a mayor"],
                    ["price-desc", "Precio mayor a menor"],
                    ["stock", "Stock disponible"],
                  ].map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setFilters({ ...defaultProductFilters });
                  setPage(0);
                }}
              >
                <SlidersHorizontal size={14} />
                Limpiar filtros
              </button>
            </div>
          </div>
          <div className="ps-result" role="status">
            {filtered.length} productos encontrados{" "}
            <span>
              {context === "OC"
                ? "Las compras permiten reponer productos sin stock."
                : context === "OV"
                  ? "Disponibilidad del almacén seleccionado."
                  : "Cotizar no reserva ni descuenta existencias."}
            </span>
          </div>
          <div className="ps-table-scroll">
            <table className="ps-table">
              <colgroup>
                <col className="ps-col-check" />
                <col className="ps-col-code" />
                <col className="ps-col-product" />
                <col className="ps-col-category" />
                <col className="ps-col-price" />
                <col className="ps-col-stock" />
                <col className="ps-col-state" />
                <col className="ps-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <span className="ps-sr-only">Selección</span>
                    <Check size={14} aria-hidden="true" />
                  </th>
                  <th>Código</th>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio unitario</th>
                  <th>Stock disponible</th>
                  <th>Estado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice(current * size, (current + 1) * size)
                  .map((p) => {
                    const reason = productRestriction(
                      state,
                      p,
                      warehouseId,
                      context,
                      lines,
                    );
                    const chosen = selected.includes(p.id);
                    return (
                      <tr key={p.id} className={chosen ? "ps-selected" : ""}>
                        <td className="ps-check-cell">
                          <label
                            className="ps-checkbox"
                            title={reason || `Seleccionar ${p.name}`}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Seleccionar ${p.name}`}
                              checked={chosen}
                              disabled={Boolean(reason)}
                              onChange={() => toggle(p)}
                            />
                            <span>
                              <Check
                                size={12}
                                strokeWidth={3}
                                aria-hidden="true"
                              />
                            </span>
                          </label>
                        </td>
                        <td className="ps-code">{p.id}</td>
                        <td>
                          <button
                            type="button"
                            className="ps-name"
                            onClick={(e) => showDetails(p.id, e.currentTarget)}
                          >
                            {p.name}
                          </button>
                          {p.description && (
                            <small
                              className="ps-secondary"
                              title={p.description}
                            >
                              {p.description}
                            </small>
                          )}
                          {p.demo && <small className="ps-demo">DEMO</small>}
                        </td>
                        <td>
                          <span className="ps-badge" title={p.category}>
                            {p.category}
                          </span>
                        </td>
                        <td className="ps-number">
                          {money(context === "OC" ? p.cost : p.price)}
                        </td>
                        <td className="ps-number">
                          {productStock(state, p.id, warehouseId)}{" "}
                          <small>{p.unit}</small>
                        </td>
                        <td>
                          <span className="ps-badge">
                            {p.active ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td>
                          <div className="ps-actions">
                            <button
                              type="button"
                              className="ps-eye"
                              aria-label={`Ver detalles de ${p.name}`}
                              onClick={(e) =>
                                showDetails(p.id, e.currentTarget)
                              }
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              type="button"
                              className="secondary-btn"
                              aria-pressed={chosen}
                              disabled={Boolean(reason)}
                              title={
                                reason ||
                                (lines.some((l) => l.productId === p.id)
                                  ? "Aumentar la cantidad existente en una unidad"
                                  : "Agregar al documento")
                              }
                              onClick={() => toggle(p)}
                            >
                              {chosen ? (
                                <Check size={14} />
                              ) : (
                                <Plus size={14} />
                              )}
                              {chosen ? "Seleccionado" : "Agregar"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
            {!filtered.length && (
              <div className="ps-empty">
                <Search size={28} />
                <strong>No encontramos productos</strong>
                <p>Prueba otra búsqueda o ajusta los filtros.</p>
              </div>
            )}
          </div>
        </div>
        <div className="ps-pagination" hidden={Boolean(product)}>
          <label>
            Por página
            <select
              aria-label="Productos por página"
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value));
                setPage(0);
              }}
            >
              {[10, 20, 50].map((n) => (
                <option key={n}>{n}</option>
              ))}
            </select>
          </label>
          <span>
            {filtered.length ? current * size + 1 : 0}–
            {Math.min((current + 1) * size, filtered.length)} de{" "}
            {filtered.length}
          </span>
          <button
            type="button"
            className="ps-eye"
            aria-label="Página anterior"
            disabled={!current}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeft size={17} />
          </button>
          <span>
            Página {current + 1} de {pages}
          </span>
          <button
            type="button"
            className="ps-eye"
            aria-label="Página siguiente"
            disabled={current + 1 >= pages}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRight size={17} />
          </button>
        </div>
        {product && (
          <div className="ps-detail-view">
            <button
              type="button"
              className="secondary-btn"
              data-autofocus
              onClick={() => setDetailId("")}
            >
              <ArrowLeft size={15} />
              Volver a productos
            </button>
            <ProductDetails
              product={product}
              warehouseId={warehouseId}
              context={context}
            />
            <button
              type="button"
              className="secondary-btn"
              disabled={Boolean(
                productRestriction(state, product, warehouseId, context, lines),
              )}
              onClick={() => toggle(product)}
            >
              {selected.includes(product.id) ? (
                <Check size={16} />
              ) : (
                <Plus size={16} />
              )}
              {selected.includes(product.id)
                ? "Producto seleccionado"
                : "Agregar producto"}
            </button>
            <p className="ps-secondary">
              {productRestriction(state, product, warehouseId, context, lines)}
            </p>
          </div>
        )}
        <footer className="ps-footer">
          <div
            className="ps-selection-summary"
            role="status"
            aria-live="polite"
          >
            <span className="ps-selection-icon" aria-hidden="true">
              <Check size={18} />
            </span>
            <div>
              <strong>{selected.length} seleccionados</strong>
              <small>
                Los productos existentes aumentarán su cantidad en 1.
              </small>
              {error && <p role="alert">{error}</p>}
            </div>
          </div>
          <ModalDismissButton className="secondary-btn">
            Cancelar
          </ModalDismissButton>
          <ModalDismissButton
            className="btn"
            disabled={!selected.length}
            onClick={confirm}
          >
            <Plus size={15} />
            Agregar seleccionados
          </ModalDismissButton>
        </footer>
      </div>
    </Modal>
  );
}

export function ProductDetailsTrigger({
  id,
  warehouseId,
  context = "OV",
}: {
  id: string;
  warehouseId: string;
  context?: ProductContext;
}) {
  const { state } = useErp();
  const [open, setOpen] = useState(false);
  const product = state.products.find((p) => p.id === id);
  if (!product) return <span>{id}</span>;
  return (
    <>
      <button type="button" className="ps-name" onClick={() => setOpen(true)}>
        {product.name}
      </button>
      {open && (
        <Modal title="Ficha del producto" onClose={() => setOpen(false)} wide>
          <ProductDetails
            product={product}
            warehouseId={warehouseId}
            context={context}
          />
        </Modal>
      )}
    </>
  );
}
