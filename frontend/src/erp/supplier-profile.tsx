import { supplierPurchaseRanking } from "./supplier-purchase-chart";
import { useId, useRef, useState } from "react";
import {
  Building2,
  Layers3,
  MapPin,
  UserRound,
  BriefcaseBusiness,
  Phone,
  Mail,
  ClipboardList,
  ChartNoAxesCombined,
  CalendarDays,
  Banknote,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useErp } from "./store";
import { money, dateLabel, type Party, type Document } from "./model";
import {
  saveSupplier,
  supplierActivity,
  supplierErrors,
} from "./catalog-logic";
import { toast } from "./toast";
import { ModalDismissButton } from "./modal";
const display = (value?: string | number) =>
  value === undefined || value === "" ? "No registrado" : value;
function ProfileField({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  return (
    <div className="pp-field">
      <label>{label}</label>
      <strong
        className={value === undefined || value === "" ? "pp-missing" : ""}
      >
        {display(value)}
      </strong>
    </div>
  );
}
export function SupplierHeader({ supplier }: { supplier: Party }) {
  return (
    <>
      <div className="pp-head">
        <div>
          <div className="pp-eyebrow">
            <Building2 />
            Ficha empresarial
          </div>
          <div className="pp-breadcrumb">
            Mantenimientos / Proveedores / {supplier.id}
          </div>
        </div>
        <div className="pp-head-actions">
          <span className={`pp-status ${supplier.active ? "" : "pp-inactive"}`}>
            <span />
            {supplier.active ? "Activo" : "Inactivo"}
          </span>
          <ModalDismissButton className="pp-close" aria-label="Cerrar">
            <X />
          </ModalDismissButton>
        </div>
      </div>
      <hr className="pp-rule" />
      <div className="pp-identity">
        <div className="pp-avatar">
          {supplier.logoUrl ? (
            <ProfileLogo
              url={supplier.logoUrl}
              fallback={supplier.name
                .split(" ")
                .slice(0, 2)
                .map((w) => w[0])
                .join("")}
            />
          ) : (
            supplier.name
              .split(" ")
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
          )}
        </div>
        <div>
          <h1>{supplier.name}</h1>
          <div className="pp-small pp-muted">
            RUC {supplier.taxId} · {supplier.id}
          </div>
          <div className="pp-chips">
            <span className="pp-chip">{display(supplier.category)}</span>
            <span className="pp-chip">{display(supplier.supplierType)}</span>
          </div>
        </div>
      </div>
    </>
  );
}
function ProfileLogo({ url, fallback }: { url: string; fallback: string }) {
  const [error, setError] = useState(false);
  return error ? (
    <>{fallback}</>
  ) : (
    <img src={url} alt="" onError={() => setError(true)} />
  );
}
export function SupplierStats({ supplier }: { supplier: Party }) {
  const { state } = useErp();
  const activity = supplierActivity(state, supplier.id);
  return (
    <>
      <div className="pp-stats">
        {[
          [<ClipboardList />, "Órdenes", activity.orders.length],
          [<Banknote />, "Compras totales", money(activity.total)],
          [
            <CalendarDays />,
            "Última compra",
            activity.last ? dateLabel(activity.last) : "Sin compras",
          ],
        ].map(([icon, label, value]) => (
          <div className="pp-stat" key={String(label)}>
            <div className="pp-stat-label">
              {icon}
              {label}
            </div>
            <div className="pp-stat-value">{value}</div>
          </div>
        ))}
      </div>
    </>
  );
}
export function SupplierGeneralTab({ supplier }: { supplier: Party }) {
  return (
    <>
      <div className="pp-section-title">
        <Building2 />
        Información empresarial
      </div>
      <div className="pp-fields">
        {[
          ["Razón social", supplier.name],
          ["Nombre comercial", supplier.tradeName],
          ["RUC", supplier.taxId],
          ["Código interno", supplier.id],
          ["Categoría", supplier.category],
          [
            "Fecha de registro",
            supplier.registeredAt
              ? dateLabel(supplier.registeredAt)
              : undefined,
          ],
          ["Tipo de proveedor", supplier.supplierType],
          ["Estado", supplier.active ? "Activo" : "Inactivo"],
        ].map(([label, value]) => (
          <ProfileField key={label} label={label!} value={value} />
        ))}
      </div>
      <hr className="pp-rule" />
      <div className="pp-section-title">
        <MapPin />
        Ubicación y dirección fiscal
      </div>
      <div className="pp-address">
        <strong>{display(supplier.address)}</strong>
        <div className="pp-fields">
          <ProfileField label="Distrito" value={supplier.district} />
          <ProfileField label="Provincia" value={supplier.province} />
          <ProfileField label="Departamento" value={supplier.department} />
        </div>
      </div>
    </>
  );
}
export function SupplierContactTab({ supplier }: { supplier: Party }) {
  const { state, transact } = useErp();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(supplier);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const form = useRef<HTMLFormElement>(null);
  const fields = [
    ["contact", "Persona de contacto", UserRound],
    ["contactRole", "Cargo", BriefcaseBusiness],
    ["phone", "Teléfono principal", Phone],
    ["email", "Correo empresarial", Mail],
    ["alternatePhone", "Teléfono alternativo", Phone],
  ] as const;
  return (
    <>
      <div className="pp-head">
        <div className="pp-section-title pp-no-margin">
          <UserRound />
          Información de contacto
        </div>
        <button
          type="button"
          className="pp-btn"
          onClick={() => {
            setDraft(supplier);
            setErrors({});
            setEditing(!editing);
            requestAnimationFrame(() =>
              form.current?.querySelector("input")?.focus(),
            );
          }}
        >
          <Pencil />
          {editing ? "Cancelar" : "Editar"}
        </button>
      </div>
      {editing ? (
        <form
          ref={form}
          className="pp-contact-edit"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const validation = supplierErrors(state, draft, supplier.id);
            setErrors(validation);
            if (Object.keys(validation).length) return;
            try {
              transact((s) => saveSupplier(s, draft, supplier.id));
              setEditing(false);
              toast.success("Información de contacto actualizada.");
            } catch (error) {
              setErrors({
                form:
                  error instanceof Error
                    ? error.message
                    : "No se pudo guardar.",
              });
            }
          }}
        >
          <div className="pp-edit-grid">
            {fields.map(([key, label]) => (
              <label key={key}>
                {label} <span className="pp-muted">(opcional)</span>
                <input
                  aria-label={label}
                  type={key === "email" ? "email" : "text"}
                  value={String(draft[key] ?? "")}
                  onChange={(e) =>
                    setDraft({ ...draft, [key]: e.target.value })
                  }
                  aria-invalid={!!errors[key]}
                />
                {errors[key] && (
                  <span className="field-error">{errors[key]}</span>
                )}
              </label>
            ))}
          </div>
          {Object.keys(errors).some(
            (key) => !fields.some(([field]) => field === key),
          ) && (
            <p role="alert" className="error">
              {Object.entries(errors)
                .filter(([key]) => !fields.some(([field]) => field === key))
                .map(([, message]) => message)
                .join(" ")}
            </p>
          )}
          <button className="pp-btn pp-primary" type="submit">
            <Check />
            Guardar cambios
          </button>
        </form>
      ) : (
        <div className="pp-contact-view">
          {fields.map(([key, label, Icon]) => (
            <div className="pp-contact-row" key={key}>
              <div className="pp-contact-icon">
                <Icon />
              </div>
              <div>
                <label>{label}</label>
                <strong>{display(supplier[key])}</strong>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
export function SupplierCommercialTab({ supplier }: { supplier: Party }) {
  return (
    <>
      <div className="pp-section-title">
        <ClipboardList />
        Condiciones comerciales
      </div>
      {[
        ["Condición de pago", supplier.paymentTerms],
        [
          "Moneda habitual",
          supplier.currency === "PEN" ? "PEN — Soles" : supplier.currency,
        ],
        [
          "Plazo de entrega",
          supplier.estimatedDeliveryDays !== undefined
            ? `${supplier.estimatedDeliveryDays} días`
            : undefined,
        ],
        ["Categoría de suministro", supplier.suppliedCategories?.join(", ")],
        ["Estado comercial", supplier.commercialStatus],
      ].map(([label, value]) => (
        <div className="pp-commercial-row" key={label}>
          <span>{label}</span>
          <strong>{display(value)}</strong>
        </div>
      ))}
      <div className="pp-address pp-commercial-note">
        <ProfileField
          label="Observaciones comerciales"
          value={supplier.commercialNotes}
        />
      </div>
    </>
  );
}
function PurchaseEvolution({ orders, total }: { orders: Document[]; total: number }) {
  const [page, setPage] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const sorted = supplierPurchaseRanking(orders);
  const pages = Math.max(1, Math.ceil(sorted.length / 5));
  const current = Math.min(page, pages - 1);
  const visible = sorted.slice(current * 5, (current + 1) * 5);
  const maximum = Math.max(1, sorted[0]?.total ?? 0);
  const compact = (value: number) => new Intl.NumberFormat("es-PE", {notation: "compact", maximumFractionDigits: 1}).format(value);
  return <>
    <div className="pp-purchase-summary"><span>Compras acumuladas<strong>{money(total)}</strong></span><small>Órdenes por importe · IGV incluido</small></div>
    {!orders.length ? <div className="pp-chart-empty"><ChartNoAxesCombined /><strong>Sin compras registradas</strong><span>Las órdenes de este proveedor aparecerán aquí al registrarlas.</span></div> : <>
      <div className="pp-horizontal-chart" role="group" aria-label="Importes de órdenes de compra del proveedor">
        <div className="pp-horizontal-columns"><span>Orden de compra</span><span>Importe en soles</span></div>
        {visible.map((order) => <div className="pp-horizontal-item" key={order.id}>
          <button type="button" className="pp-horizontal-row" data-purchase-order={order.id} data-value={order.total} aria-label={`${order.number}, ${dateLabel(order.date)}, ${money(order.total)}`} onMouseEnter={() => setActive(order.id)} onPointerMove={() => setActive(order.id)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(order.id)} onBlur={() => setActive(null)} onClick={() => setActive(order.id)} onKeyDown={(event) => {if (event.key === "Escape") {event.stopPropagation(); setActive(null);}}}>
            <span className="pp-horizontal-label" title={order.number}>{order.number}</span>
            <span className="pp-horizontal-track"><span className="pp-horizontal-bar" style={{width: `${order.total / maximum * 100}%`}} /></span>
            <strong>{money(order.total)}</strong>
          </button>
          {active === order.id && <div className="pp-horizontal-tooltip" role="status"><strong>{order.number}</strong><span>{dateLabel(order.date)}</span><b>{money(order.total)}</b></div>}
        </div>)}
        <div className="pp-horizontal-scale" aria-hidden="true">{[0, 1, 2, 3, 4].map((tick) => <span key={tick}>S/ {compact(maximum * tick / 4)}</span>)}</div>
      </div>
      <div className="pp-purchase-pagination"><span>{current * 5 + 1}–{Math.min((current + 1) * 5, sorted.length)} de {sorted.length} órdenes · Mayor a menor importe</span>{pages > 1 && <div><button type="button" className="pp-page-button" aria-label="Órdenes anteriores" disabled={current === 0} onClick={() => {setPage(current - 1); setActive(null);}}>Anterior</button><button type="button" className="pp-page-button" aria-label="Órdenes siguientes" disabled={current >= pages - 1} onClick={() => {setPage(current + 1); setActive(null);}}>Siguiente</button></div>}</div>
    </>}
  </>;
}
export function SupplierHistoryTab({ supplier }: { supplier: Party }) {
  const { state } = useErp();
  const activity = supplierActivity(state, supplier.id);
  return (
    <>
      <div className="pp-head pp-history-head">
        <div className="pp-section-title pp-no-margin">
          <ChartNoAxesCombined />
          Compras por orden
        </div>
      </div>
      <PurchaseEvolution orders={activity.orders} total={activity.total} />
      <div className="pp-section-title">Últimas órdenes de compra</div>
      <div className="pp-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Orden</th>
              <th>Fecha</th>
              <th>Importe</th>
            </tr>
          </thead>
          <tbody>
            {activity.orders.slice(0, 10).map((order) => (
              <tr key={order.id}>
                <td>
                  {order.number}
                </td>
                <td>{dateLabel(order.date)}</td>
                <td>{money(order.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!activity.orders.length && (
          <p className="pp-note">
            No hay órdenes de compra relacionadas con este proveedor.
          </p>
        )}
      </div>
      {activity.products.length > 0 && (
        <>
          <div className="pp-section-title pp-products-title">
            <Layers3 />
            Productos más adquiridos
          </div>
          <div className="pp-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad ordenada</th>
                  <th>Importe de líneas</th>
                </tr>
              </thead>
              <tbody>
                {activity.products.slice(0, 5).map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>
                      {product.quantity} {product.unit}
                    </td>
                    <td>{money(product.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <p className="pp-note">
        Importes calculados desde las órdenes registradas. Los importes de
        productos no incluyen descuentos ni flete de la orden.
      </p>
      {supplier.internalNotes && (
        <div className="pp-address">
          <ProfileField label="Notas internas" value={supplier.internalNotes} />
        </div>
      )}
    </>
  );
}
export function SupplierProfile({ supplier }: { supplier: Party }) {
  const [tab, setTab] = useState(0);
  const id = useId();
  const tabs = [
    ["General", Building2],
    ["Contacto", UserRound],
    ["Comercial", ClipboardList],
    ["Historial", ChartNoAxesCombined],
  ] as const;
  return (
    <div className="pp-profile">
      <div className="pp-top">
        <SupplierHeader supplier={supplier} />
        <SupplierStats supplier={supplier} />
      </div>
      <nav
        className="pp-tabs"
        role="tablist"
        aria-label="Secciones del proveedor"
      >
        {tabs.map(([label, Icon], i) => (
          <button
            type="button"
            className={`pp-tab ${tab === i ? "active" : ""}`}
            role="tab"
            key={label}
            id={`${id}-tab-${i}`}
            aria-selected={tab === i}
            aria-controls={`${id}-panel`}
            tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const next =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? 3
                      : (i + (e.key === "ArrowRight" ? 1 : -1) + 4) % 4;
                setTab(next);
                document.getElementById(`${id}-tab-${next}`)?.focus();
              }
            }}
          >
            <Icon />
            {label}
          </button>
        ))}
      </nav>
      <div
        className="pp-content"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${tab}`}
      >
        {tab === 0 ? (
          <SupplierGeneralTab supplier={supplier} />
        ) : tab === 1 ? (
          <SupplierContactTab supplier={supplier} />
        ) : tab === 2 ? (
          <SupplierCommercialTab supplier={supplier} />
        ) : (
          <SupplierHistoryTab supplier={supplier} />
        )}
      </div>
    </div>
  );
}
