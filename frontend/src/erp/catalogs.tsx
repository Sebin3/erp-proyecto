import { SupplierAdministration, CatalogDeleteDialog } from "./supplier-admin";
import { CustomerEditor } from "./customers";
import { validRuc, type CatalogKind } from "./catalog-logic";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { ProductDetails } from "./products";
import { useState } from "react";
import { Icon } from "./icons";
import { useErp } from "./store";
import {
  money,
  today,
  type Party,
  type Product,
  type Warehouse,
} from "./model";
import { exportCsv, Modal, Records, Tag } from "./ui";
type Catalog =
  | "Clientes"
  | "Productos"
  | "Proveedores"
  | "Almacenes"
  | "Categorías"
  | "Empresa"
  | "Auditoría";
export function Catalogs() {
  const { state, transact } = useErp();
  const [tab, setTab] = useState<Catalog>("Clientes");
  const [editor, setEditor] = useState<Record<string, unknown> | null>(null);
  const [viewing, setViewing] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState<{
    kind: CatalogKind;
    id: string;
  } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState("Todos");
  const catalogs: Catalog[] = [
    "Clientes",
    "Productos",
    "Proveedores",
    "Almacenes",
    "Categorías",
    "Empresa",
    "Auditoría",
  ];
  const source =
    tab === "Clientes"
      ? state.customers
      : tab === "Proveedores"
        ? state.suppliers
        : tab === "Productos"
          ? state.products
          : tab === "Almacenes"
            ? state.warehouses
            : [];
  const data = source.filter(
    (r) =>
      (active === "Todos" || r.active === (active === "Activos")) &&
      (tab !== "Productos" ||
        !categoryFilter ||
        (r as Product).category === categoryFilter),
  );
  const catalogKind: CatalogKind =
    tab === "Clientes"
      ? "customers"
      : tab === "Productos"
        ? "products"
        : "warehouses";
  const rowActions = (record: Record<string, unknown>) => (
    <div className="catalog-action-buttons">
      <button
        type="button"
        aria-label={`Ver detalles ${record.name}`}
        title="Ver detalles"
        onClick={() => setViewing(record)}
      >
        <Eye />
      </button>
      <button
        type="button"
        aria-label={`Editar ${record.name}`}
        title="Editar"
        onClick={() => {
          setError("");
          setEditor(record);
        }}
      >
        <Pencil />
      </button>
      <button
        type="button"
        aria-label={`Eliminar ${record.name}`}
        title="Eliminar o desactivar"
        onClick={() =>
          setDeleting({ kind: catalogKind, id: String(record.id) })
        }
      >
        <Trash2 />
      </button>
    </div>
  );
  const product = tab === "Productos";
  const warehouse = tab === "Almacenes";
  const fields = product
    ? [
        "name",
        "category",
        "unit",
        "cost",
        "price",
        "minimum",
        "description",
        "sku",
        "barcode",
      ]
    : warehouse
      ? ["name", "branch"]
      : [
          "name",
          "taxId",
          "contact",
          "phone",
          "email",
          "address",
          "credit",
          ...(tab === "Proveedores"
            ? ["tradeName", "supplierCategory", "supplierType", "paymentTerms"]
            : []),
        ];
  const labels: Record<string, string> = {
    name: "Nombre / razón social",
    category: "Categoría",
    unit: "Unidad",
    cost: "Costo unitario",
    price: "Precio de venta (IGV incluido)",
    minimum: "Stock mínimo",
    description: "Descripción",
    sku: "SKU (opcional)",
    barcode: "Código de barras (opcional)",
    branch: "Sucursal",
    taxId: "RUC / DNI",
    contact: "Contacto",
    phone: "Teléfono",
    email: "Correo",
    address: "Dirección",
    credit: "Línea de crédito",
    tradeName: "Nombre comercial",
    supplierCategory: "Categoría del proveedor",
    supplierType: "Tipo de proveedor",
    paymentTerms: "Condiciones de pago",
    contactRole: "Cargo",
    alternatePhone: "Teléfono alternativo",
    district: "Distrito",
    province: "Provincia",
    department: "Departamento",
    currency: "Moneda habitual",
    commercialNotes: "Observaciones comerciales",
  };
  const empty = () =>
    product
      ? {
          name: "",
          category: state.categories[0] ?? "",
          unit: "UND",
          cost: 0,
          price: 0,
          minimum: 30,
          active: true,
        }
      : warehouse
        ? { name: "", branch: "", active: true }
        : {
            name: "",
            taxId: "",
            contact: "",
            phone: "",
            email: "",
            address: "",
            credit: 0,
            active: true,
          };
  const save = () => {
    if (!editor) return;
    try {
      if (!String(editor.name ?? "").trim())
        throw Error("El nombre es obligatorio.");
      if (
        !product &&
        !warehouse &&
        !/^\d{8}(\d{3})?$/.test(String(editor.taxId))
      )
        throw Error("Ingresa un DNI de 8 dígitos o RUC de 11 dígitos.");
      if (
        !product &&
        !warehouse &&
        String(editor.taxId).length === 11 &&
        !validRuc(String(editor.taxId)) &&
        (
          source.find((r) => r.id === editor.id && "taxId" in r) as
            Party | undefined
        )?.taxId !== editor.taxId
      )
        throw Error("El dígito verificador del RUC no es válido.");
      if (
        editor.email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(editor.email))
      )
        throw Error("Ingresa un correo electrónico válido.");
      for (const key of ["cost", "price", "minimum", "credit"])
        if (
          key in editor &&
          (!Number.isFinite(Number(editor[key])) || Number(editor[key]) < 0)
        )
          throw Error("Los importes y mínimos no pueden ser negativos.");
      if (product && Number(editor.price) <= 0)
        throw Error("El precio debe ser mayor que cero.");
      if (product && (!String(editor.category) || !String(editor.unit)))
        throw Error("Selecciona categoría y unidad.");
      if (warehouse && !String(editor.branch).trim())
        throw Error("La sucursal es obligatoria.");
      transact((s) => {
        const list =
          tab === "Clientes"
            ? s.customers
            : tab === "Proveedores"
              ? s.suppliers
              : tab === "Productos"
                ? s.products
                : s.warehouses;
        const prefix = product
          ? "PRD"
          : warehouse
            ? "ALM"
            : tab === "Clientes"
              ? "CLI"
              : "PRO";
        const id = String(editor.id ?? `${prefix}-${Date.now().toString(36)}`);
        if (
          !product &&
          !warehouse &&
          list.some(
            (r) => r.id !== id && "taxId" in r && r.taxId === editor.taxId,
          )
        )
          throw Error("Ya existe un tercero con ese documento.");
        const { supplierCategory, ...values } = editor;
        const record = {
          ...values,
          ...(tab === "Proveedores" && supplierCategory !== undefined
            ? { category: supplierCategory }
            : {}),
          id,
        } as Product & Party & Warehouse;
        const index = list.findIndex((r) => r.id === id);
        if (index >= 0) list[index] = record;
        else list.push(record);
        if (product && !s.stock[id])
          s.stock[id] = Object.fromEntries(s.warehouses.map((w) => [w.id, 0]));
        s.audit.unshift({
          id: `CAT-${Date.now()}`,
          date: new Date().toISOString(),
          action: index >= 0 ? "Editar catálogo" : "Crear catálogo",
          record: `${tab}: ${record.name}`,
        });
      });
      setEditor(null);
      setError("");
      setNotice("Catálogo actualizado.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  };
  const headers = product
    ? [
        "Código",
        "Producto",
        "Categoría",
        "Unidad",
        "Costo",
        "Precio",
        "Mínimo",
        "Estado",
        "Acciones",
      ]
    : warehouse
      ? ["Código", "Almacén", "Sucursal", "Estado", "Acciones"]
      : [
          "Código",
          "Razón social",
          "RUC / DNI",
          "Contacto",
          "Crédito",
          "Estado",
          "Acciones",
        ];
  return (
    <>
      <div className="hd page-head">
        <div>
          <h1>Mantenimientos</h1>
          <p className="sub no-margin">
            Catálogos compartidos por compras, ventas e inventario.
          </p>
        </div>
      </div>
      <div className="catalog-tabs">
        {catalogs.map((c) => (
          <button
            key={c}
            className={tab === c ? "btn" : "secondary-btn"}
            onClick={() => {
              setTab(c);
              setActive("Todos");
              setCategoryFilter("");
              setError("");
            }}
          >
            {c}
            {c === "Clientes"
              ? ` · ${state.customers.length}`
              : c === "Productos"
                ? ` · ${state.products.length}`
                : ""}
          </button>
        ))}
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {!editor && error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {tab === "Proveedores" && <SupplierAdministration />}
      {["Clientes", "Productos", "Almacenes"].includes(tab) && (
        <>
          <div className="hd">
            <h2>{tab}</h2>
            <button
              className="btn"
              aria-label="+ Nuevo registro"
              onClick={() => {
                setError("");
                setEditor(empty());
              }}
            >
              <Icon name="plus" size={15} />
              Nuevo registro
            </button>
          </div>
          <Records
            sortable
            headers={headers}
            filters={
              <>
                <select
                  aria-label="Filtrar actividad"
                  value={active}
                  onChange={(e) => setActive(e.target.value)}
                >
                  {["Todos", "Activos", "Inactivos"].map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                {product && (
                  <select
                    aria-label="Categoría de productos"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <option value="">Todas las categorías</option>
                    {state.categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                )}
              </>
            }
            rows={data.map((r) => ({
              id: r.id,
              search: Object.values(r).join(" "),
              sortValues: product
                ? [
                    r.id,
                    r.name,
                    (r as Product).category,
                    (r as Product).unit,
                    (r as Product).cost,
                    (r as Product).price,
                    (r as Product).minimum,
                    r.active ? "Activo" : "Inactivo",
                  ]
                : warehouse
                  ? [
                      r.id,
                      r.name,
                      (r as Warehouse).branch,
                      r.active ? "Activo" : "Inactivo",
                    ]
                  : [
                      r.id,
                      r.name,
                      (r as Party).taxId,
                      (r as Party).contact,
                      (r as Party).credit,
                      r.active ? "Activo" : "Inactivo",
                    ],
              cells: product
                ? [
                    r.id,
                    <>
                      {r.name}
                      {"demo" in r && r.demo && (
                        <small>DEMO · producto ficticio</small>
                      )}
                    </>,
                    (r as Product).category,
                    (r as Product).unit,
                    money((r as Product).cost),
                    money((r as Product).price),
                    (r as Product).minimum,
                    <Tag value={r.active ? "Activo" : "Inactivo"} />,
                    rowActions({ ...r }),
                  ]
                : warehouse
                  ? [
                      r.id,
                      <>
                        {r.name}
                        {"demo" in r && r.demo && (
                          <small>DEMO · empresa ficticia</small>
                        )}
                      </>,
                      (r as Warehouse).branch,
                      <Tag value={r.active ? "Activo" : "Inactivo"} />,
                      rowActions({ ...r }),
                    ]
                  : [
                      r.id,
                      <>
                        {r.name}
                        {"demo" in r && r.demo && (
                          <small>DEMO · empresa ficticia</small>
                        )}
                      </>,
                      (r as Party).taxId,
                      (r as Party).contact,
                      money((r as Party).credit),
                      <Tag value={r.active ? "Activo" : "Inactivo"} />,
                      rowActions({ ...r }),
                    ],
            }))}
            onExport={() =>
              exportCsv(
                tab,
                headers.filter((h) => h !== "Acciones"),
                data.map((r) =>
                  product
                    ? [
                        r.id,
                        r.name,
                        (r as Product).category,
                        (r as Product).unit,
                        (r as Product).cost,
                        (r as Product).price,
                        (r as Product).minimum,
                        r.active ? "Activo" : "Inactivo",
                      ]
                    : warehouse
                      ? [
                          r.id,
                          r.name,
                          (r as Warehouse).branch,
                          r.active ? "Activo" : "Inactivo",
                        ]
                      : [
                          r.id,
                          r.name,
                          (r as Party).taxId,
                          (r as Party).contact,
                          (r as Party).credit,
                          r.active ? "Activo" : "Inactivo",
                        ],
                ),
              )
            }
          />
          <p className="muted">
            Desactiva registros para dejar de utilizarlos en nuevas operaciones.
            Sus documentos y movimientos anteriores se conservan.
          </p>
        </>
      )}
      {tab === "Categorías" && <Categories />}
      {tab === "Empresa" && <Company />}
      {tab === "Auditoría" && (
        <Records
          headers={["Fecha / hora", "Acción", "Registro"]}
          rows={state.audit.map((a) => ({
            id: a.id,
            search: `${a.action} ${a.record}`,
            cells: [
              new Date(a.date).toLocaleString("es-PE"),
              a.action,
              a.record,
            ],
          }))}
          onExport={() =>
            exportCsv(
              "auditoria",
              ["Fecha", "Acción", "Registro"],
              state.audit.map((a) => [a.date, a.action, a.record]),
            )
          }
        />
      )}{" "}
      {viewing && (
        <Modal title={String(viewing.name)} onClose={() => setViewing(null)}>
          {product ? (
            <ProductDetails
              product={viewing as unknown as Product}
              warehouseId={state.warehouses[0]?.id ?? ""}
            />
          ) : (
            <div className="detail-meta">
              {Object.entries(viewing)
                .filter(([key]) => !["country", "website"].includes(key))
                .map(([key, value]) => (
                  <div key={key}>
                    <small>
                      {labels[key] ??
                        {
                          id: "Código",
                          active: "Estado",
                          demo: "Registro DEMO",
                          registeredAt: "Fecha de registro",
                        }[key] ??
                        key}
                    </small>
                    <b>
                      {typeof value === "boolean"
                        ? value
                          ? "Sí"
                          : "No"
                        : String(
                            value === undefined ||
                              value === null ||
                              value === ""
                              ? "No registrado"
                              : value,
                          )}
                    </b>
                  </div>
                ))}
            </div>
          )}
          <div className="modal-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setViewing(null)}
            >
              Cerrar ficha
            </button>
          </div>
        </Modal>
      )}
      {deleting && (
        <CatalogDeleteDialog
          kind={deleting.kind}
          id={deleting.id}
          onClose={() => setDeleting(null)}
          onDone={(deactivated) => {
            setDeleting(null);
            setNotice(
              deactivated
                ? "Registro desactivado. Su historial se conserva."
                : "Registro eliminado.",
            );
          }}
        />
      )}
      {editor && tab === "Clientes" && (
        <CustomerEditor
          customer={editor.id ? (editor as unknown as Party) : undefined}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setNotice("Catálogo actualizado.");
          }}
        />
      )}
      {editor && tab !== "Clientes" && (
        <Modal
          title={`${editor.id ? "Editar" : "Crear"} · ${tab}`}
          onClose={() => setEditor(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            <div className="form-grid">
              {fields.map((key) => (
                <label key={key}>
                  {labels[key]}
                  {key === "category" && product ? (
                    <select
                      value={String(editor[key] ?? "")}
                      onChange={(e) =>
                        setEditor({ ...editor, [key]: e.target.value })
                      }
                    >
                      {state.categories.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  ) : key === "unit" ? (
                    <select
                      value={String(editor[key])}
                      onChange={(e) =>
                        setEditor({ ...editor, [key]: e.target.value })
                      }
                    >
                      {["UND", "KG", "ROL", "CJA", "BLS", "PAQ", "MLL"].map(
                        (u) => (
                          <option key={u}>{u}</option>
                        ),
                      )}
                    </select>
                  ) : (
                    <input
                      required={["name", "taxId", "branch", "price"].includes(
                        key,
                      )}
                      type={
                        ["cost", "price", "minimum", "credit"].includes(key)
                          ? "number"
                          : key === "email"
                            ? "email"
                            : "text"
                      }
                      min="0"
                      step="0.01"
                      value={String(editor[key] ?? "")}
                      onChange={(e) =>
                        setEditor({
                          ...editor,
                          [key]: [
                            "cost",
                            "price",
                            "minimum",
                            "credit",
                          ].includes(key)
                            ? Number(e.target.value)
                            : e.target.value,
                        })
                      }
                    />
                  )}
                </label>
              ))}
              <label>
                Estado
                <select
                  value={editor.active ? "Activo" : "Inactivo"}
                  onChange={(e) =>
                    setEditor({
                      ...editor,
                      active: e.target.value === "Activo",
                    })
                  }
                >
                  <option>Activo</option>
                  <option>Inactivo</option>
                </select>
              </label>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => setEditor(null)}
              >
                Cancelar
              </button>
              <button className="btn">Guardar</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
function Categories() {
  const { state, transact } = useErp();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  return (
    <section className="card">
      <h2>Categorías de producto</h2>
      <div className="catalog-tabs">
        {state.categories.map((c) => (
          <span className="tag" key={c}>
            {c}
          </span>
        ))}
      </div>
      <form
        className="product-picker"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            transact((s) => {
              if (!name.trim()) throw Error("Ingresa un nombre.");
              if (
                s.categories.some(
                  (c) => c.toLowerCase() === name.trim().toLowerCase(),
                )
              )
                throw Error("La categoría ya existe.");
              s.categories.push(name.trim());
            });
            setName("");
            setError("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Error");
          }
        }}
      >
        <input
          aria-label="Nombre de nueva categoría"
          placeholder="Nueva categoría"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="btn">Agregar categoría</button>
      </form>
      {error && <p className="error">{error}</p>}
    </section>
  );
}
function Company() {
  const { state, transact } = useErp();
  const [company, setCompany] = useState(state.settings.company);
  const [message, setMessage] = useState("");
  return (
    <section className="card">
      <h2>Empresa y respaldo</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            transact((s) => {
              s.settings.company = company.trim();
            });
            setMessage("Empresa actualizada.");
          } catch (err) {
            setMessage(err instanceof Error ? err.message : "Error");
          }
        }}
      >
        <label className="filter-field">
          Razón social
          <input
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
        <p>Moneda operativa: Soles (PEN). Precios con IGV incluido.</p>
        <button className="btn">Guardar</button>
      </form>
      <hr />
      <p className="muted">
        Los datos se guardan en este navegador. Descarga un respaldo para
        conservar una copia.
      </p>
      <button
        className="secondary-btn"
        onClick={() => {
          const url = URL.createObjectURL(
            new Blob([JSON.stringify(state, null, 2)], {
              type: "application/json",
            }),
          );
          const a = document.createElement("a");
          a.href = url;
          a.download = `enterprisecloud-respaldo-${today()}.json`;
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        <Icon name="download" size={15} />
        Descargar respaldo JSON
      </button>
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
