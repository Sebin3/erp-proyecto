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
import { money, dateLabel, type Party } from "./model";
import {
  saveSupplier,
  supplierActivity,
  supplierErrors,
} from "./catalog-logic";
import { toast } from "./toast";
import { ModalDismissButton } from "./modal";
const display = (value?: string | number) =>
  value === undefined || value === "" ? "No registrado" : value;
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("es-PE", { month: "short", year: "2-digit" }).format(
    new Date(month + "-01T12:00:00"),
  );
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
function PurchaseEvolution({ data }: { data: [string, number][] }) {
  const id = useId().replaceAll(":", "");
  const [active, setActive] = useState<number | null>(null);
  if (!data.length)
    return (
      <div className="pp-chart-empty">
        <ChartNoAxesCombined />
        <strong>Sin compras registradas</strong>
        <span>La evolución aparecerá al registrar órdenes de compra.</span>
      </div>
    );
  const max = Math.max(1, ...data.map(([, value]) => value));
  const x = (i: number) =>
    data.length === 1 ? 300 : 18 + (i * 562) / (data.length - 1);
  const y = (value: number) => 140 - (value / max) * 111;
  const points = data.map(([, value], i) => `${x(i)},${y(value)}`).join(" ");
  return (
    <>
      <div className="pp-chart">
        <svg
          viewBox="0 0 600 160"
          preserveAspectRatio="none"
          role="img"
          aria-label="Evolución mensual de importes de órdenes de compra"
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#647d9c" stopOpacity=".18" />
              <stop offset="1" stopColor="#647d9c" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="#e9edf2" strokeWidth="1">
            <path d="M10 24H590 M10 65H590 M10 106H590 M10 140H590" />
          </g>
          {data.length > 1 && (
            <>
              <polygon
                points={`${x(0)},140 ${points} ${x(data.length - 1)},140`}
                fill={`url(#${id})`}
              />
              <polyline
                points={points}
                fill="none"
                stroke="#4c6686"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
          {data.map(([month, value], i) => (
            <circle
              key={month}
              cx={x(i)}
              cy={y(value)}
              r={active === i ? 6 : 4}
              fill="#4c6686"
              stroke="white"
              strokeWidth="2"
              tabIndex={0}
              role="button"
              aria-label={`${monthLabel(month)}: ${money(value)}`}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  e.stopPropagation();
                  setActive(null);
                }
              }}
            >
              <title>
                {monthLabel(month)}: {money(value)}
              </title>
            </circle>
          ))}
        </svg>
        {active !== null && (
          <div className="pp-chart-tooltip" role="status">
            {monthLabel(data[active][0])}
            <strong>{money(data[active][1])}</strong>
          </div>
        )}
      </div>
      <div className="pp-chart-labels">
        {data.map(([month]) => (
          <span key={month}>{monthLabel(month)}</span>
        ))}
      </div>
    </>
  );
}
export function SupplierHistoryTab({ supplier }: { supplier: Party }) {
  const { state } = useErp();
  const activity = supplierActivity(state, supplier.id);
  return (
    <>
      <div className="pp-head pp-history-head">
        <div className="pp-section-title pp-no-margin">
          <ChartNoAxesCombined />
          Evolución de compras
        </div>
      </div>
      <PurchaseEvolution data={activity.months} />
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
