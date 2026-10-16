import type { Supplier } from "./catalog-logic";
import { SupplierProfile } from "./supplier-profile";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  Building2,
  Search,
  MapPin,
  Phone,
  Mail,
  UserRound,
  ArrowLeft,
  Check,
  ChevronRight,
  SlidersHorizontal,
  ClipboardList,
  CircleAlert,
} from "lucide-react";
import { Modal, ModalDismissButton } from "./modal";
import { useErp } from "./store";
import { ExportMenu, type ExportData } from "./exports";

export type { Supplier } from "./catalog-logic";
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const matchesSupplier = (supplier: Supplier, query: string) =>
  normalize(
    [supplier.name, supplier.tradeName, supplier.taxId, supplier.id]
      .filter(Boolean)
      .join(" "),
  ).includes(normalize(query));
const missing = "No registrado";
function Avatar({ supplier }: { supplier: Supplier }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="supplier-avatar">
      {supplier.logoUrl && !failed ? (
        <img src={supplier.logoUrl} alt="" onError={() => setFailed(true)} />
      ) : (
        supplier.name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase() || <Building2 />
      )}
    </span>
  );
}
export function SupplierStatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`supplier-status ${active ? "" : "inactive"}`}>
      <span />
      {active ? "Activo" : "Inactivo"}
    </span>
  );
}
export function SupplierCard({
  supplier,
  selected,
  onDetails,
  onEdit,
}: {
  supplier: Supplier;
  selected?: boolean;
  onDetails: () => void;
  onEdit?: () => void;
}) {
  return (
    <article className={`supplier-card ${selected ? "is-selected" : ""}`}>
      <button
        type="button"
        className="supplier-card-main"
        onClick={onDetails}
        aria-label={`Ver proveedor ${supplier.name}`}
      >
        <div className="supplier-card-head">
          <Avatar supplier={supplier} />
          <div className="supplier-card-identity">
            <strong>{supplier.name}</strong>
            <span>
              RUC {supplier.taxId || "sin registrar"} <i>·</i> {supplier.id}
            </span>
          </div>
          <SupplierStatusBadge active={supplier.active} />
        </div>
        <span className="supplier-category">
          {supplier.category || "Categoría no registrada"}
        </span>
        <div className="supplier-card-info">
          <span>
            <UserRound />
            {supplier.contact || "Contacto no registrado"}
          </span>
          <span>
            <MapPin />
            {supplier.address || "Dirección no registrada"}
          </span>
          <span>
            {supplier.phone ? <Phone /> : <Mail />}
            {supplier.phone || supplier.email || "Contacto no registrado"}
          </span>
          <span>
            <ClipboardList />
            {supplier.paymentTerms || "Condiciones de pago no registradas"}
          </span>
        </div>
      </button>
      <div className="supplier-card-footer">
        <button
          type="button"
          className="supplier-text-button"
          onClick={onDetails}
        >
          Ver detalles <ChevronRight />
        </button>
        {onEdit && (
          <button
            type="button"
            className="supplier-text-button"
            onClick={onEdit}
          >
            Editar
          </button>
        )}
        <span className="supplier-selection">
          {selected ? (
            <>
              <Check />
              Seleccionado
            </>
          ) : (
            <span className="supplier-selection-circle" />
          )}
        </span>
      </div>
    </article>
  );
}
export function SupplierListSkeleton() {
  return (
    <div
      className="supplier-grid"
      role="status"
      aria-label="Cargando proveedores"
    >
      {[0, 1, 2, 3].map((i) => (
        <div className="supplier-card supplier-skeleton" key={i}>
          <div className="skeleton" />
          <div className="skeleton" />
          <div className="skeleton" />
        </div>
      ))}
    </div>
  );
}
export function SupplierDirectory({
  selectedId,
  onDetails,
  onEdit,
  loading = false,
  error,
  onRetry,
  exportData,
}: {
  selectedId?: string;
  onDetails: (supplier: Supplier) => void;
  onEdit?: (supplier: Supplier) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  exportData?: (suppliers: Supplier[]) => ExportData;
}) {
  const { state } = useErp();
  const suppliers: Supplier[] = state.suppliers;
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const categories = [
    ...new Set(suppliers.map((s) => s.category || missing)),
  ].sort();
  const types = [
    ...new Set(suppliers.map((s) => s.supplierType || missing)),
  ].sort();
  const results = suppliers.filter(
    (s) =>
      matchesSupplier(s, query) &&
      (!category || (s.category || missing) === category) &&
      (!type || (s.supplierType || missing) === type) &&
      (!status || String(s.active) === status),
  );
  const clear = () => {
    setQuery("");
    setCategory("");
    setStatus("");
    setType("");
  };
  return (
    <div className="supplier-directory">
      <div className="supplier-search">
        <Search />
        <input
          data-autofocus
          aria-label="Buscar proveedores"
          placeholder="Buscar por razón social, RUC, código o nombre comercial…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            type="button"
            aria-label="Limpiar búsqueda"
            onClick={() => setQuery("")}
          >
            ×
          </button>
        )}
      </div>
      <div className="supplier-filters">
        <span>
          <SlidersHorizontal />
          Filtros
        </span>
        <label>
          <span className="sr-only">Categoría del proveedor</span>
          <select
            aria-label="Categoría del proveedor"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Estado del proveedor</span>
          <select
            aria-label="Estado del proveedor"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Tipo de proveedor</span>
          <select
            aria-label="Tipo de proveedor"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="">Todos los tipos</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        {(query || category || status || type) && (
          <button
            type="button"
            className="supplier-text-button"
            onClick={clear}
          >
            Restablecer
          </button>
        )}
      </div>
      <div className="supplier-results-count" role="status">
        {results.length}{" "}
        {results.length === 1
          ? "proveedor encontrado"
          : "proveedores encontrados"}
        {exportData ? (
          <ExportMenu data={exportData(results)} />
        ) : (
          <span>Revisa la ficha antes de seleccionar</span>
        )}
      </div>
      {loading ? (
        <SupplierListSkeleton />
      ) : error ? (
        <div className="supplier-empty" role="alert">
          <CircleAlert />
          <h3>No se pudieron cargar los proveedores</h3>
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="secondary-btn" onClick={onRetry}>
              Reintentar
            </button>
          )}
        </div>
      ) : !results.length ? (
        <div className="supplier-empty">
          <Building2 />
          <h3>
            {suppliers.length ? "Sin coincidencias" : "Aún no hay proveedores"}
          </h3>
          <p>
            {suppliers.length
              ? "Prueba otro término o ajusta los filtros."
              : "Registra proveedores desde Mantenimientos para utilizarlos aquí."}
          </p>
          {suppliers.length > 0 && (
            <button type="button" className="secondary-btn" onClick={clear}>
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div
          className="supplier-grid"
          onKeyDown={(e) => {
            if (
              !["ArrowDown", "ArrowUp"].includes(e.key) ||
              !(e.target instanceof HTMLElement) ||
              !e.target.matches(".supplier-card-main")
            )
              return;
            const buttons = [
              ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
                ".supplier-card-main",
              ),
            ];
            const index = buttons.indexOf(e.target as HTMLButtonElement);
            e.preventDefault();
            buttons[
              (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) %
                buttons.length
            ]?.focus();
          }}
        >
          {results.map((s) => (
            <SupplierCard
              key={s.id}
              supplier={s}
              selected={s.id === selectedId}
              onDetails={() => onDetails(s)}
              onEdit={onEdit ? () => onEdit(s) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export function SupplierDetails({ supplier }: { supplier: Supplier }) {
  return <SupplierProfile key={supplier.id} supplier={supplier} />;
}
export function SupplierSelectorModal({
  onClose,
  onSelect,
  selectedId,
  initialDetails,
  includeInactive = false,
}: {
  onClose: () => void;
  onSelect?: (id: string) => void;
  selectedId?: string;
  initialDetails?: string;
  includeInactive?: boolean;
}) {
  const { state } = useErp();
  const [detailId, setDetailId] = useState(initialDetails || "");
  const [resetView, setResetView] = useState(0);
  const viewRoot = useRef<HTMLDivElement>(null);
  const supplier: Supplier | undefined = state.suppliers.find(
    (s) => s.id === detailId,
  );
  const back = useRef<HTMLButtonElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (detailId)
      viewRoot.current?.querySelector<HTMLButtonElement>(".pp-close")?.focus();
    else origin.current?.isConnected && origin.current.focus();
  }, [detailId]);
  return (
    <Modal
      title={onSelect ? "Seleccionar proveedor" : "Ficha del proveedor"}
      subtitle={
        supplier
          ? "Consulta la información empresarial y comercial disponible."
          : "Encuentra la empresa y revisa su ficha antes de confirmar."
      }
      onClose={onClose}
      wide
      hideHeader={!!supplier}
      className={`supplier-modal ${supplier ? "premium-profile-modal" : ""}`}
    >
      <div className="supplier-workflow" ref={viewRoot}>
        <div hidden={!!detailId}>
          <SupplierDirectory
            selectedId={selectedId}
            onDetails={(s) => {
              origin.current = document.activeElement as HTMLElement;
              setDetailId(s.id);
            }}
          />
        </div>
        {detailId && (
          <div className="supplier-detail-view">
            {supplier ? (
              <SupplierDetails
                key={`${supplier.id}-${resetView}`}
                supplier={supplier}
              />
            ) : (
              <div className="supplier-empty" role="alert">
                <CircleAlert />
                <h3>Proveedor no disponible</h3>
                <p>El registro ya no está disponible en el catálogo.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="supplier-modal-footer">
        {onSelect && supplier && (
          <button
            ref={back}
            type="button"
            className="supplier-text-button"
            onClick={() => setDetailId("")}
          >
            <ArrowLeft />
            Volver a proveedores
          </button>
        )}
        <span>
          {supplier && !supplier.active && !includeInactive && onSelect
            ? "Los proveedores inactivos solo pueden consultarse."
            : supplier
              ? `Código ${supplier.id}`
              : "La selección conservará el vínculo con tus documentos."}
        </span>
        <ModalDismissButton className="secondary-btn">
          {onSelect ? "Cancelar" : "Cerrar ficha"}
        </ModalDismissButton>
        {supplier && (
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setResetView((value) => value + 1)}
          >
            Restablecer vista
          </button>
        )}
        {onSelect && supplier && (
          <ModalDismissButton
            className="btn"
            disabled={!supplier.active && !includeInactive}
            onClick={() => onSelect(supplier.id)}
          >
            <Check size={16} />
            Seleccionar proveedor
          </ModalDismissButton>
        )}
      </div>
    </Modal>
  );
}
export function SupplierDetailsTrigger({
  supplierId,
  children,
}: {
  supplierId: string;
  children?: ReactNode;
}) {
  const { state } = useErp();
  const [open, setOpen] = useState(false);
  const supplier = state.suppliers.find((s) => s.id === supplierId);
  if (!supplier) return <>{children}</>;
  return (
    <>
      <button
        type="button"
        className="supplier-text-button supplier-inline"
        title="Consultar ficha del proveedor"
        onClick={() => setOpen(true)}
      >
        {children || supplier.name}
      </button>
      {open && (
        <SupplierSelectorModal
          initialDetails={supplierId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
export function SupplierSelector({
  value,
  onChange,
  label = "Proveedor",
  includeInactive = false,
  allowClear = false,
  compact = false,
}: {
  value: string;
  onChange: (id: string) => void;
  label?: string;
  includeInactive?: boolean;
  allowClear?: boolean;
  compact?: boolean;
}) {
  const { state } = useErp();
  const [open, setOpen] = useState(false);
  const [initial, setInitial] = useState("");
  const supplier = state.suppliers.find((s) => s.id === value);
  const id = useId();
  return (
    <div
      className={`supplier-field ${compact ? "supplier-field-compact" : ""}`}
    >
      <span className="supplier-field-label" id={id}>
        {label}
      </span>
      {supplier ? (
        <div className="selected-supplier-summary">
          <div className="selected-supplier-identity">
            <Avatar supplier={supplier} />
            <div>
              <strong>{supplier.name}</strong>
              <span>
                RUC {supplier.taxId} · {supplier.id}
              </span>
            </div>
            <Check className="supplier-summary-check" size={16} />
          </div>
          <div className="selected-supplier-actions">
            <button
              type="button"
              className="supplier-text-button"
              onClick={() => {
                setInitial(value);
                setOpen(true);
              }}
            >
              Ver detalles
            </button>
            <button
              type="button"
              className="supplier-text-button"
              onClick={() => {
                setInitial("");
                setOpen(true);
              }}
            >
              Cambiar proveedor
            </button>
            {allowClear && (
              <button
                type="button"
                className="supplier-text-button"
                onClick={() => onChange("")}
              >
                Quitar filtro
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          aria-labelledby={id}
          aria-haspopup="dialog"
          className="supplier-selector-trigger"
          onClick={() => {
            setInitial("");
            setOpen(true);
          }}
        >
          <Building2 size={19} />
          <span>
            {allowClear
              ? "Todos los proveedores"
              : value
                ? "Proveedor no disponible · cambiar"
                : "Seleccionar proveedor"}
          </span>
          <ChevronRight size={16} />
        </button>
      )}
      {open && (
        <SupplierSelectorModal
          selectedId={value}
          initialDetails={initial}
          includeInactive={includeInactive}
          onSelect={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
