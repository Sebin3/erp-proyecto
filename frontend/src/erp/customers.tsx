import { useRef, useState } from "react";
import { Search, Plus, Eye, Users } from "lucide-react";
import { Modal } from "./modal";
import { useErp } from "./store";
import { money, type Party } from "./model";

export function CustomerEditor({
  customer,
  onClose,
  onSaved,
}: {
  customer?: Party;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  const { state, transact } = useErp();
  const [value, setValue] = useState<Party>(
    customer ?? {
      id: `CLI-${crypto.randomUUID()}`,
      name: "",
      taxId: "",
      contact: "",
      phone: "",
      email: "",
      address: "",
      credit: 0,
      active: true,
    },
  );
  const [documentType, setDocumentType] = useState(
    customer?.taxId.length === 8 ? "DNI" : "RUC",
  );
  const [error, setError] = useState("");
  const busy = useRef(false);
  const currencies = (state.currencies ?? []).filter((currency) => currency.active || currency.isoCode === value.currency);
  const paymentMethods = (state.paymentMethods ?? []).filter((method) => method.active || method.name === value.paymentTerms);
  return (
    <Modal
      title={customer ? "Editar cliente" : "Nuevo cliente"}
      subtitle="Información del catálogo compartido de clientes"
      onClose={onClose}
      className="customer-editor"
      wide
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (busy.current) return;
          busy.current = true;
          try {
            transact((s) => {
              const record = {
                ...value,
                name: value.name.trim(),
                taxId: value.taxId.trim(),
                email: value.email.trim(),
              };
              if (!record.name) throw Error("El nombre es obligatorio.");
              if (
                !(documentType === "DNI" ? /^\d{8}$/ : /^\d{11}$/).test(
                  record.taxId,
                )
              )
                throw Error(
                  `Ingresa un ${documentType} de ${documentType === "DNI" ? 8 : 11} dígitos.`,
                );
              if (
                record.email &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)
              )
                throw Error("Ingresa un correo electrónico válido.");
              if (!Number.isFinite(record.credit) || record.credit < 0)
                throw Error("La línea de crédito no puede ser negativa.");
              if (
                s.customers.some(
                  (c) => c.id !== record.id && c.taxId === record.taxId,
                )
              )
                throw Error("Ya existe un cliente con ese documento.");
              const index = s.customers.findIndex((c) => c.id === record.id);
              if (index < 0) s.customers.push(record);
              else s.customers[index] = record;
              s.audit.unshift({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                action: index < 0 ? "Crear catálogo" : "Editar catálogo",
                record: `Clientes: ${record.name}`,
              });
            });
            onSaved(value.id);
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "No se pudo guardar.",
            );
            busy.current = false;
          }
        }}
      >
        {error && (
          <p role="alert" className="quote-error">
            {error}
          </p>
        )}
        <div className="form-grid">
          <label>
            Tipo de cliente
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
            >
              <option value="RUC">Empresa / persona con RUC</option>
              <option value="DNI">Persona natural con DNI</option>
            </select>
          </label>
          <label>
            {documentType}
            <input
              required
              inputMode="numeric"
              maxLength={documentType === "DNI" ? 8 : 11}
              value={value.taxId}
              onChange={(e) => setValue({ ...value, taxId: e.target.value })}
            />
          </label>
          {(
            [
              [
                "name",
                documentType === "RUC"
                  ? "Nombre / razón social"
                  : "Nombre completo",
              ],
              ["contact", "Contacto"],
              ["phone", "Teléfono"],
              ["email", "Correo"],
              ["address", "Dirección"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className={key === "address" ? "span-two" : ""}>
              {label}
              <input
                required={key === "name"}
                type={
                  key === "email" ? "email" : key === "phone" ? "tel" : "text"
                }
                value={value[key]}
                onChange={(e) => setValue({ ...value, [key]: e.target.value })}
              />
            </label>
          ))}
          <label>
            Nombre comercial <span className="optional">· opcional</span>
            <input
              value={value.tradeName ?? ""}
              onChange={(e) => setValue({ ...value, tradeName: e.target.value })}
            />
          </label>
          <label>
            Cargo del contacto <span className="optional">· opcional</span>
            <input
              value={value.contactRole ?? ""}
              onChange={(e) => setValue({ ...value, contactRole: e.target.value })}
            />
          </label>
          <label>
            Distrito <span className="optional">· opcional</span>
            <input
              value={value.district ?? ""}
              onChange={(e) => setValue({ ...value, district: e.target.value })}
            />
          </label>
          <label>
            Provincia <span className="optional">· opcional</span>
            <input
              value={value.province ?? ""}
              onChange={(e) => setValue({ ...value, province: e.target.value })}
            />
          </label>
          <label>
            Departamento <span className="optional">· opcional</span>
            <input
              value={value.department ?? ""}
              onChange={(e) => setValue({ ...value, department: e.target.value })}
            />
          </label>
          <label>
            Línea de crédito
            <input
              type="number"
              min="0"
              step="0.01"
              value={value.credit}
              onChange={(e) =>
                setValue({ ...value, credit: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Moneda habitual <span className="optional">· opcional</span>
            <select
              value={value.currency ?? ""}
              onChange={(e) => setValue({ ...value, currency: e.target.value })}
            >
              <option value="">No registrada</option>
              {currencies.map((currency) => <option key={currency.id}>{currency.isoCode}</option>)}
            </select>
          </label>
          <label>
            Condición de pago <span className="optional">· opcional</span>
            <select
              value={value.paymentTerms ?? ""}
              onChange={(e) => setValue({ ...value, paymentTerms: e.target.value })}
            >
              <option value="">No registrada</option>
              {paymentMethods.map((method) => <option key={method.id}>{method.name}</option>)}
            </select>
          </label>
          <label>
            Zona comercial <span className="optional">· opcional</span>
            <select value={value.zoneId ?? ""} onChange={(e) => setValue({ ...value, zoneId: e.target.value || undefined })}>
              <option value="">Sin asignar</option>
              {(state.zones ?? []).filter((zone) => zone.active || zone.id === value.zoneId).map((zone) => <option key={zone.id} value={zone.id}>{zone.code} · {zone.name}</option>)}
            </select>
          </label>
          <label>
            Vendedor responsable <span className="optional">· opcional</span>
            <select value={value.sellerId ?? ""} onChange={(e) => setValue({ ...value, sellerId: e.target.value || undefined })}>
              <option value="">Sin asignar</option>
              {(state.sellers ?? []).filter((seller) => seller.active || seller.id === value.sellerId).map((seller) => <option key={seller.id} value={seller.id}>{seller.code} · {seller.name}</option>)}
            </select>
          </label>
          <label>
            Lista de precios <span className="optional">· opcional</span>
            <select value={value.priceListId ?? ""} onChange={(e) => setValue({ ...value, priceListId: e.target.value || undefined })}>
              <option value="">Sin asignar</option>
              {(state.priceLists ?? []).filter((list) => list.active || list.id === value.priceListId).map((list) => <option key={list.id} value={list.id}>{list.code} · {list.name}</option>)}
            </select>
          </label>
          <label className="span-two">
            Observaciones comerciales <span className="optional">· opcional</span>
            <textarea
              rows={3}
              value={value.commercialNotes ?? ""}
              onChange={(e) => setValue({ ...value, commercialNotes: e.target.value })}
            />
          </label>
          <label>
            Estado
            <select
              value={value.active ? "Activo" : "Inactivo"}
              onChange={(e) =>
                setValue({ ...value, active: e.target.value === "Activo" })
              }
            >
              <option>Activo</option>
              <option>Inactivo</option>
            </select>
          </label>
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn">Guardar cliente</button>
        </div>
      </form>
    </Modal>
  );
}

export function CustomerSelector({
  value,
  onChange,
  allowCreate = true,
}: {
  value: string;
  onChange: (id: string) => void;
  allowCreate?: boolean;
}) {
  const { state } = useErp();
  const [selecting, setSelecting] = useState(false),
    [creating, setCreating] = useState(false),
    [details, setDetails] = useState(false);
  const [query, setQuery] = useState("");
  const selected = state.customers.find((c) => c.id === value);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const filtered = state.customers.filter((c) =>
    normalize(`${c.name} ${c.tradeName ?? ""} ${c.taxId} ${c.id}`).includes(
      normalize(query),
    ),
  );
  return (
    <div className="quote-customer">
      <div className="quote-section-heading">
        <label>Cliente</label>
        {allowCreate && (
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setCreating(true)}
          >
            <Plus size={15} />
            Nuevo cliente
          </button>
        )}
      </div>
      <button
        type="button"
        className="customer-select-trigger"
        onClick={() => setSelecting(true)}
      >
        <Users size={19} />
        <span>
          <strong>{selected?.name ?? "Seleccionar cliente existente"}</strong>
          <small>
            {selected
              ? `${selected.taxId.length === 8 ? "DNI" : "RUC"} ${selected.taxId} · ${selected.id}`
              : "Buscar por nombre, razón social, documento o código"}
          </small>
        </span>
        <Search size={17} />
      </button>
      {selected && (
        <div className="customer-selected">
          <span>
            {selected.phone || "Sin teléfono"} ·{" "}
            {selected.email || "Sin correo"}
            {" · "}
            {selected.active ? "Activo" : "Inactivo"}
          </span>
          <button type="button" onClick={() => setDetails(true)}>
            <Eye size={15} />
            Ver detalles
          </button>
        </div>
      )}
      {selecting && (
        <Modal
          title="Seleccionar cliente"
          className="customer-selector-modal"
          subtitle="Clientes registrados en Mantenimientos"
          onClose={() => setSelecting(false)}
        >
          <label className="customer-search">
            Buscar cliente
            <input
              data-autofocus
              placeholder="Nombre, RUC, DNI o código"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="customer-results">
            {filtered.map((c) => (
              <button
                type="button"
                key={c.id}
                disabled={!c.active}
                aria-pressed={value === c.id}
                onClick={() => {
                  onChange(c.id);
                  setSelecting(false);
                }}
              >
                <span>
                  <strong>{c.name}</strong>
                  <small>
                    {c.taxId} · {c.id}
                  </small>
                </span>
                <span className="customer-status">
                  {c.active ? "Activo" : "Inactivo"}
                </span>
              </button>
            ))}
            {!filtered.length && (
              <div className="customer-empty">
                <Users size={26} strokeWidth={1.5} />
                <h3>
                  {state.customers.length
                    ? "Sin resultados"
                    : "Aún no hay clientes registrados"}
                </h3>
                <p>
                  {state.customers.length
                    ? "Prueba con otro nombre, documento o código."
                    : "Registra tus clientes previamente desde Mantenimientos para crear una orden."}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}
      {allowCreate && creating && (
        <CustomerEditor
          onClose={() => setCreating(false)}
          onSaved={(id) => {
            onChange(id);
            setCreating(false);
          }}
        />
      )}
      {details && selected && (
        <Modal
          title="Detalles del cliente"
          className="customer-details-modal"
          onClose={() => setDetails(false)}
        >
          <h3>{selected.name}</h3>
          <div className="detail-meta">
            {[
              ["Código", selected.id],
              ["Documento", selected.taxId],
              ["Estado", selected.active ? "Activo" : "Inactivo"],
              ["Contacto", selected.contact],
              ["Teléfono", selected.phone],
              ["Correo", selected.email],
              ["Dirección", selected.address],
              ["Línea de crédito", money(selected.credit)],
            ].map(([label, content]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{content || "No registrado"}</b>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
