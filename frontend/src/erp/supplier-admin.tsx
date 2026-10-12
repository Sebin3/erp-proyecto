import { useId, useState } from "react";
import {
  Building2,
  UserRound,
  MapPin,
  ClipboardList,
  Eye,
  Pencil,
  Trash2,
  Plus,
  CircleAlert,
  Check,
} from "lucide-react";
import { useErp } from "./store";
import { today, type Party } from "./model";
import {
  catalogHasLinks,
  deleteCatalogRecord,
  nextSupplierCode,
  saveSupplier,
  supplierErrors,
  type CatalogKind,
} from "./catalog-logic";
import { Modal, ModalDismissButton } from "./modal";
import { Records, exportCsv } from "./ui";
import { SupplierSelectorModal, SupplierStatusBadge } from "./suppliers";

export function CatalogDeleteDialog({
  kind,
  id,
  onClose,
  onDone,
}: {
  kind: CatalogKind;
  id: string;
  onClose: () => void;
  onDone: (deactivated: boolean) => void;
}) {
  const { state, transact } = useErp();
  const [error, setError] = useState("");
  const record = state[kind].find((r) => r.id === id);
  const linked = catalogHasLinks(state, kind, id);
  const entity =
    kind === "suppliers"
      ? "proveedor"
      : kind === "customers"
        ? "cliente"
        : kind === "products"
          ? "producto"
          : "almacén";
  return (
    <Modal
      title={`${linked ? "Desactivar" : "Eliminar"} ${entity}`}
      onClose={onClose}
    >
      <div className="catalog-delete-identity">
        <span className="empty-icon">
          <CircleAlert size={24} />
        </span>
        <h3>{record?.name ?? "Registro no disponible"}</h3>
        <p className="muted">Código {id}</p>
      </div>
      <p>
        {linked
          ? `Este ${entity} tiene documentos, movimientos o existencias relacionados. Se desactivará para impedir nuevas operaciones; sus datos y el historial se conservarán.`
          : `Este ${entity} no tiene documentos, movimientos ni existencias relacionados. La eliminación será definitiva y dejará de aparecer en el catálogo.`}
      </p>
      <p className="supplier-form-help">
        Confirma expresamente la acción para continuar.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="modal-actions">
        <ModalDismissButton className="secondary-btn">
          Cancelar
        </ModalDismissButton>
        <button
          type="button"
          className="btn"
          disabled={!record}
          onClick={() => {
            try {
              let result = false;
              transact((s) => {
                result = deleteCatalogRecord(s, kind, id) === "deactivated";
              });
              onDone(result);
            } catch (e) {
              setError(
                e instanceof Error
                  ? e.message
                  : "No se pudo completar la acción.",
              );
            }
          }}
        >
          <Trash2 size={15} />
          {linked ? "Desactivar" : "Eliminar"} {entity}
        </button>
      </div>
    </Modal>
  );
}
export function SupplierForm({
  supplier,
  onClose,
  onSaved,
}: {
  supplier?: Party;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { state, transact } = useErp();
  const id = useId();
  const [draft, setDraft] = useState<Party>(() =>
    supplier
      ? structuredClone(supplier)
      : {
          id: nextSupplierCode(state),
          name: "",
          taxId: "",
          contact: "",
          email: "",
          phone: "",
          address: "",
          credit: 0,
          active: true,
          registeredAt: today(),
        },
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const field = (
    key: keyof Party,
    label: string,
    required = false,
    type = "text",
  ) => (
    <label key={key} htmlFor={`${id}-${key}`}>
      {label}
      {!required && <span className="optional"> · opcional</span>}
      <input
        id={`${id}-${key}`}
        aria-label={label}
        type={type}
        value={String(draft[key] ?? "")}
        readOnly={key === "id" && !!supplier}
        required={required}
        min={type === "number" ? 0 : undefined}
        step={type === "number" ? 1 : undefined}
        aria-invalid={!!errors[key]}
        aria-describedby={errors[key] ? `${id}-${key}-error` : undefined}
        onChange={(e) =>
          setDraft({
            ...draft,
            [key]:
              type === "number"
                ? e.target.value === ""
                  ? undefined
                  : Number(e.target.value)
                : e.target.value,
          })
        }
      />
      {errors[key] && (
        <span id={`${id}-${key}-error`} className="field-error">
          {errors[key]}
        </span>
      )}
    </label>
  );
  const save = () => {
    const normalized = {
      ...draft,
      name: draft.name.trim(),
      taxId: draft.taxId.trim(),
      id: draft.id.trim(),
      email: draft.email.trim(),
    };
    const validation = supplierErrors(state, normalized, supplier?.id);
    setErrors(validation);
    if (Object.keys(validation).length) {
      requestAnimationFrame(() =>
        document.getElementById(`${id}-${Object.keys(validation)[0]}`)?.focus(),
      );
      return;
    }
    try {
      transact((s) => saveSupplier(s, normalized, supplier?.id));
      onSaved();
    } catch (e) {
      setErrors({
        form: e instanceof Error ? e.message : "No se pudo guardar.",
      });
    }
  };
  return (
    <Modal
      title={supplier ? "Editar proveedor" : "Nuevo proveedor"}
      onClose={onClose}
      wide
    >
      <form
        className="supplier-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          save();
        }}
      >
        <p className="supplier-form-help">
          {supplier
            ? "Los cambios se reflejarán en todos los módulos. El código mantiene los vínculos existentes."
            : "Los campos obligatorios no llevan la etiqueta «opcional»."}
        </p>
        {supplier?.demo && (
          <p className="notice">
            Registro DEMO ficticio. Sus datos no representan una empresa
            verificada.
          </p>
        )}
        {errors.form && (
          <p className="error" role="alert">
            {errors.form}
          </p>
        )}
        <section>
          <h3>
            <Building2 />
            Información empresarial
          </h3>
          <div className="form-grid">
            {field("name", "Razón social", true)}
            {field("tradeName", "Nombre comercial")}
            {field("taxId", "RUC", true)}
            {field("id", "Código interno", true)}
            {field("category", "Categoría del proveedor")}
            {field("supplierType", "Tipo de proveedor")}
            {field("registeredAt", "Fecha de registro", false, "date")}
            <label>
              Estado
              <select
                value={String(draft.active)}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.value === "true" })
                }
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </label>
          </div>
          <p className="supplier-form-help">
            Se valida el formato y dígito de control del RUC. Esta validación
            local no consulta el padrón de SUNAT.
          </p>
        </section>
        <section>
          <h3>
            <UserRound />
            Contacto
          </h3>
          <div className="form-grid">
            {field("contact", "Persona de contacto")}
            {field("contactRole", "Cargo")}
            {field("phone", "Teléfono principal", false, "tel")}
            {field("alternatePhone", "Teléfono alternativo", false, "tel")}
            {field("email", "Correo empresarial", false, "email")}
          </div>
        </section>
        <section>
          <h3>
            <MapPin />
            Ubicación
          </h3>
          <div className="form-grid">
            {field("address", "Dirección fiscal")}
            {field("district", "Distrito")}
            {field("province", "Provincia")}
            {field("department", "Departamento")}
          </div>
        </section>
        <section>
          <h3>
            <ClipboardList />
            Condiciones comerciales
          </h3>
          <div className="form-grid">
            {field("paymentTerms", "Condición de pago")}
            <label>
              Moneda habitual <span className="optional">· opcional</span>
              <select
                value={draft.currency ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, currency: e.target.value })
                }
              >
                <option value="">No registrado</option>
                {[
                  ...new Set([
                    "PEN",
                    "USD",
                    "EUR",
                    ...(draft.currency ? [draft.currency] : []),
                  ]),
                ].map((currency) => (
                  <option key={currency}>{currency}</option>
                ))}
              </select>
            </label>
            {field(
              "estimatedDeliveryDays",
              "Plazo estimado de entrega (días)",
              false,
              "number",
            )}
            {field("commercialStatus", "Estado comercial")}
            <label className="span-two">
              Categorías de productos suministrados{" "}
              <span className="optional">· opcional, separadas por comas</span>
              <input
                value={draft.suppliedCategories?.join(", ") ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    suppliedCategories: e.target.value
                      .split(",")
                      .map((c) => c.trim()),
                  })
                }
              />
            </label>
            <label className="span-two">
              Observaciones comerciales{" "}
              <span className="optional">· opcional</span>
              <textarea
                value={draft.commercialNotes ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, commercialNotes: e.target.value })
                }
              />
            </label>
            <label className="span-two">
              Notas internas <span className="optional">· opcional</span>
              <textarea
                value={draft.internalNotes ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, internalNotes: e.target.value })
                }
              />
            </label>
          </div>
        </section>
        <div className="modal-actions">
          <ModalDismissButton className="secondary-btn">
            Cancelar
          </ModalDismissButton>
          <button className="btn" type="submit">
            <Check size={16} />
            {supplier ? "Guardar cambios" : "Guardar proveedor"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function SupplierTable({
  onDetails,
  onEdit,
  onDelete,
}: {
  onDetails: (id: string) => void;
  onEdit: (supplier: Party) => void;
  onDelete: (id: string) => void;
}) {
  const { state } = useErp();
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const suppliers = state.suppliers.filter(
    (s) =>
      (!category || (s.category || "No registrado") === category) &&
      (!status || String(s.active) === status),
  );
  const headers = [
    "Código",
    "Razón social",
    "RUC",
    "Categoría",
    "Persona de contacto",
    "Condición de pago",
    "Estado",
    "Acciones",
  ];
  return (
    <Records
      sortable
      headers={headers}
      searchText="Buscar por razón social, RUC o código…"
      filters={
        <>
          <select
            aria-label="Categoría del proveedor"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {[
              ...new Set(
                state.suppliers.map((s) => s.category || "No registrado"),
              ),
            ]
              .sort()
              .map((c) => (
                <option key={c}>{c}</option>
              ))}
          </select>
          <select
            aria-label="Estado del proveedor"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
          {(category || status) && (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setCategory("");
                setStatus("");
              }}
            >
              Restablecer filtros
            </button>
          )}
        </>
      }
      rows={suppliers.map((s) => ({
        id: s.id,
        search: `${s.id} ${s.name} ${s.taxId} ${s.tradeName ?? ""}`,
        sortValues: [
          s.id,
          s.name,
          s.taxId,
          s.category ?? "",
          s.contact,
          s.paymentTerms ?? "",
          s.active ? "Activo" : "Inactivo",
        ],
        cells: [
          s.id,
          <>
            <button
              type="button"
              className="catalog-name-button"
              onClick={() => onDetails(s.id)}
            >
              {s.name}
            </button>
            <small>
              {s.supplierType || "Tipo no registrado"}
              {s.demo && " · DEMO"}
            </small>
          </>,
          s.taxId,
          s.category || "No registrado",
          s.contact || "No registrado",
          s.paymentTerms || "No registrado",
          <SupplierStatusBadge active={s.active} />,
          <div className="catalog-action-buttons">
            <button
              type="button"
              aria-label={`Ver detalles ${s.name}`}
              title="Ver detalles"
              onClick={() => onDetails(s.id)}
            >
              <Eye />
            </button>
            <button
              type="button"
              aria-label={`Editar ${s.name}`}
              title="Editar"
              onClick={() => onEdit(s)}
            >
              <Pencil />
            </button>
            <button
              type="button"
              aria-label={`Eliminar ${s.name}`}
              title="Eliminar o desactivar"
              onClick={() => onDelete(s.id)}
            >
              <Trash2 />
            </button>
          </div>,
        ],
      }))}
      onExport={() =>
        exportCsv(
          "proveedores",
          headers.slice(0, -1),
          suppliers.map((s) => [
            s.id,
            s.name,
            s.taxId,
            s.category ?? "",
            s.contact,
            s.paymentTerms ?? "",
            s.active ? "Activo" : "Inactivo",
          ]),
        )
      }
    />
  );
}
export function SupplierAdministration() {
  const [editing, setEditing] = useState<Party | null | undefined>(undefined);
  const [detail, setDetail] = useState("");
  const [deleting, setDeleting] = useState("");
  const [notice, setNotice] = useState("");
  const { state } = useErp();
  return (
    <>
      <div className="hd">
        <div>
          <h2>Proveedores</h2>
          <p className="muted no-margin">
            {state.suppliers.length} empresas · Fuente compartida con compras y
            recepción
          </p>
        </div>
        <button type="button" className="btn" onClick={() => setEditing(null)}>
          <Plus size={15} />
          Nuevo proveedor
        </button>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <SupplierTable
        onDetails={setDetail}
        onEdit={setEditing}
        onDelete={setDeleting}
      />
      {editing !== undefined && (
        <SupplierForm
          supplier={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setNotice(editing ? "Proveedor actualizado." : "Proveedor creado.");
            setEditing(undefined);
          }}
        />
      )}
      {detail && (
        <SupplierSelectorModal
          initialDetails={detail}
          onClose={() => setDetail("")}
        />
      )}{" "}
      {deleting && (
        <CatalogDeleteDialog
          kind="suppliers"
          id={deleting}
          onClose={() => setDeleting("")}
          onDone={(deactivated) => {
            setDeleting("");
            setNotice(
              deactivated
                ? "Proveedor desactivado. Su historial se conserva."
                : "Proveedor eliminado.",
            );
          }}
        />
      )}
    </>
  );
}
