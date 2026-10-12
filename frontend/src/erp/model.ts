import { completeFreshDemo } from "./demo.ts";
export type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  cost: number;
  price: number;
  minimum: number;
  active: boolean;
  demo?: boolean;
  description?: string;
  sku?: string;
  barcode?: string;
  imageUrl?: string;
  registeredAt?: string;
};
export type Party = {
  id: string;
  name: string;
  taxId: string;
  contact: string;
  email: string;
  phone: string;
  address: string;
  credit: number;
  active: boolean;
  demo?: boolean;
  tradeName?: string;
  category?: string;
  supplierType?: string;
  registeredAt?: string;
  contactRole?: string;
  alternatePhone?: string;
  district?: string;
  province?: string;
  department?: string;
  paymentTerms?: string;
  currency?: string;
  estimatedDeliveryDays?: number;
  suppliedCategories?: string[];
  commercialNotes?: string;
  internalNotes?: string;
  commercialStatus?: string;
  logoUrl?: string;
  country?: string;
  website?: string;
};
export type Warehouse = {
  id: string;
  name: string;
  branch: string;
  active: boolean;
};
export type Line = { productId: string; quantity: number; price: number };
export type Payment = {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
};
export type Document = {
  demo?: boolean;
  id: string;
  number: string;
  kind: "OC" | "NI" | "OV" | "CP";
  date: string;
  partyId: string;
  warehouseId: string;
  method: string;
  voucher: string;
  lines: Line[];
  discount: number;
  freight: number;
  total: number;
  balance: number;
  status: string;
  sourceId?: string;
  receiptRequestId?: string;
  payments: Payment[];
  received?: Record<string, number>;
  notes: string;
};
export type Quote = {
  demo?: boolean;
  id: string;
  number: string;
  date: string;
  partyId: string;
  warehouseId: string;
  method: string;
  voucher: string;
  lines: Line[];
  discount: number;
  freight: number;
  total: number;
  status: "Borrador" | "Enviada" | "Aceptada" | "Procesada";
  validity: number;
  notes: string;
  orderId?: string;
};
export type Movement = {
  id: string;
  date: string;
  documentId: string;
  productId: string;
  warehouseId: string;
  partyId: string;
  type: "Entrada" | "Salida";
  quantity: number;
  balance: number;
  cost: number;
};
export type Audit = {
  id: string;
  date: string;
  action: string;
  record: string;
};
export type State = {
  demoDashboardVersion?: number;
  payables?: {
    id: string;
    documentId: string;
    supplierId: string;
    date: string;
    dueDate: string;
    total: number;
    balance: number;
    payments: Payment[];
    demo?: boolean;
  }[];
  inventoryValuations?: {
    date: string;
    value: number;
    demo?: boolean;
    includesTax: boolean;
  }[];
  version: 1;
  products: Product[];
  customers: Party[];
  suppliers: Party[];
  warehouses: Warehouse[];
  categories: string[];
  documents: Document[];
  quotes: Quote[];
  movements: Movement[];
  stock: Record<string, Record<string, number>>;
  audit: Audit[];
  settings: { company: string; currency: string };
};
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const money = (n: number) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    n,
  );
export const dateLabel = (d: string) => d.split("-").reverse().join("/");
export const round = (n: number) =>
  Math.round((n + Number.EPSILON) * 100) / 100;
export const quantityRound = (n: number) =>
  Math.round((n + Number.EPSILON) * 1000) / 1000;
function validateDate(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
    !Number.isFinite(parsed.getTime()) ||
    `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}` !==
      date
  )
    throw Error("Selecciona una fecha válida.");
}
export const total = (lines: Line[], discount = 0, freight = 0) =>
  round(
    lines.reduce((s, l) => s + l.quantity * l.price, 0) - discount + freight,
  );
export const isCredit = (method: string) => method.startsWith("Crédito");
export const stockOf = (s: State, p: string, w: string) => s.stock[p]?.[w] ?? 0;
export const methods = [
  "Contado",
  "Transferencia bancaria",
  "Yape / Plin",
  "Crédito 30 días",
  "Crédito 60 días",
];
export const paymentMethods = [
  "Efectivo",
  "Transferencia bancaria",
  "Depósito en cuenta",
  "Yape / Plin",
  "Cheque",
];
export const vouchers = [
  "Factura electrónica",
  "Boleta de venta electrónica",
  "Nota de venta",
];
let sequence = 0;
const uid = () => `${Date.now().toString(36)}-${(++sequence).toString(36)}`;
const number = (s: State, kind: string, voucher = "Factura electrónica") => {
  const series =
    kind === "CP"
      ? voucher.startsWith("Boleta")
        ? "B001"
        : voucher === "Nota de venta"
          ? "NV01"
          : "F001"
      : kind;
  const existing =
    kind === "COT"
      ? s.quotes.map((d) => d.number)
      : s.documents.map((d) => d.number);
  const maximum = existing
    .filter((n) => n.startsWith(`${series}-`))
    .reduce((max, n) => Math.max(max, Number(n.split("-").at(-1)) || 0), 0);
  return `${series}-${kind === "CP" ? "" : `${new Date().getFullYear()}-`}${String(maximum + 1).padStart(6, "0")}`;
};
const log = (s: State, action: string, record: string) =>
  s.audit.unshift({
    id: uid(),
    date: new Date().toISOString(),
    action,
    record,
  });
export type Draft = {
  kind: "OC" | "OV";
  date: string;
  partyId: string;
  warehouseId: string;
  method: string;
  voucher: string;
  lines: Line[];
  discount: number;
  freight: number;
  notes: string;
};
function validate(
  s: State,
  d: Omit<Draft, "kind">,
  sale: boolean,
  checkStock = sale,
) {
  validateDate(d.date);
  if (
    !(sale ? s.customers : s.suppliers).some(
      (p) => p.id === d.partyId && p.active,
    )
  )
    throw Error("Selecciona un tercero activo.");
  if (!s.warehouses.some((w) => w.id === d.warehouseId && w.active))
    throw Error("Selecciona un almacén activo.");
  if (!d.lines.length) throw Error("Agrega al menos un producto.");
  if (new Set(d.lines.map((l) => l.productId)).size !== d.lines.length)
    throw Error("Un producto solo puede aparecer una vez.");
  for (const l of d.lines) {
    if (
      !s.products.some((p) => p.id === l.productId && p.active) ||
      !Number.isFinite(l.quantity) ||
      l.quantity <= 0 ||
      !Number.isFinite(l.price) ||
      l.price <= 0
    )
      throw Error("Revisa los productos, cantidades y precios.");
    if (checkStock && stockOf(s, l.productId, d.warehouseId) < l.quantity)
      throw Error(
        `Stock insuficiente de ${s.products.find((p) => p.id === l.productId)?.name}.`,
      );
  }
  if (
    !Number.isFinite(d.discount) ||
    d.discount < 0 ||
    !Number.isFinite(d.freight) ||
    d.freight < 0 ||
    !Number.isFinite(total(d.lines, d.discount, d.freight)) ||
    total(d.lines, d.discount, d.freight) <= 0
  )
    throw Error("El total debe ser positivo; revisa descuento y flete.");
}
export function createDocument(s: State, d: Draft, sourceId?: string) {
  validate(s, d, d.kind === "OV");
  const doc: Document = {
    ...d,
    lines: d.lines.map((l) => ({ ...l })),
    id: uid(),
    number: number(s, d.kind),
    total: total(d.lines, d.discount, d.freight),
    balance: 0,
    status: "Pendiente",
    payments: [],
    sourceId,
  };
  s.documents.unshift(doc);
  log(s, "Crear orden", doc.number);
  return doc;
}
function move(s: State, doc: Document, type: "Entrada" | "Salida") {
  for (const l of doc.lines) {
    const balance = quantityRound(
      stockOf(s, l.productId, doc.warehouseId) +
        (type === "Entrada" ? l.quantity : -l.quantity),
    );
    if (balance < 0) throw Error("La operación dejaría stock negativo.");
    s.stock[l.productId] = {
      ...s.stock[l.productId],
      [doc.warehouseId]: balance,
    };
    s.movements.unshift({
      id: uid(),
      date: doc.date,
      documentId: doc.id,
      productId: l.productId,
      warehouseId: doc.warehouseId,
      partyId: doc.partyId,
      type,
      quantity: l.quantity,
      balance,
      cost:
        type === "Entrada"
          ? l.price
          : s.products.find((p) => p.id === l.productId)!.cost,
    });
  }
}
export function receive(
  s: State,
  id: string,
  quantities: Record<string, number>,
  warehouseId: string,
  date: string,
  requestId?: string,
) {
  if (
    requestId &&
    s.documents.some((d) => d.kind === "NI" && d.receiptRequestId === requestId)
  )
    throw Error(
      "Esta recepción ya fue registrada. Consulta la nota de ingreso.",
    );
  validateDate(date);
  const oc = s.documents.find((d) => d.id === id && d.kind === "OC");
  if (!oc || !["Pendiente", "Recibida parcial"].includes(oc.status))
    throw Error("Esta compra ya fue recibida.");
  if (!s.warehouses.some((w) => w.id === warehouseId && w.active))
    throw Error("Selecciona un almacén activo.");
  if (
    Object.keys(quantities).some(
      (productId) => !oc.lines.some((l) => l.productId === productId),
    )
  )
    throw Error("La recepción contiene productos ajenos a la orden de compra.");
  if (new Set(oc.lines.map((l) => l.productId)).size !== oc.lines.length)
    throw Error(
      "La orden contiene productos duplicados. Revisa la compra antes de recibirla.",
    );
  const lines = oc.lines.map((l) => ({
    ...l,
    quantity: quantities[l.productId] ?? 0,
  }));
  for (const l of lines) {
    const ordered = oc.lines.find((x) => x.productId === l.productId)!.quantity;
    const alreadyReceived = oc.received?.[l.productId] ?? 0;
    if (
      !Number.isFinite(ordered) ||
      ordered <= 0 ||
      !Number.isFinite(alreadyReceived) ||
      alreadyReceived < 0 ||
      alreadyReceived > ordered
    )
      throw Error(
        "Las cantidades de la orden no son válidas para registrar el ingreso.",
      );
    const remaining = quantityRound(
      ordered - (oc.received?.[l.productId] ?? 0),
    );
    if (
      !Number.isFinite(l.quantity) ||
      l.quantity < 0 ||
      l.quantity > remaining ||
      Math.abs(l.quantity - quantityRound(l.quantity)) > 1e-9
    )
      throw Error("La recepción no puede superar la cantidad pendiente.");
  }
  const incoming = lines.filter((l) => l.quantity > 0);
  if (!incoming.length) throw Error("Ingresa una cantidad a recibir.");
  for (const l of incoming) {
    if (
      !s.products.some((p) => p.id === l.productId) ||
      !Number.isFinite(l.price) ||
      l.price < 0 ||
      !Number.isFinite(stockOf(s, l.productId, warehouseId) + l.quantity) ||
      stockOf(s, l.productId, warehouseId) < 0
    )
      throw Error(
        "El producto, costo o stock no es válido para registrar el ingreso.",
      );
  }
  const note: Document = {
    ...oc,
    id: uid(),
    number: number(s, "NI"),
    kind: "NI",
    date,
    warehouseId,
    lines: incoming,
    total: total(incoming),
    discount: 0,
    freight: 0,
    status: "Registrado",
    sourceId: oc.id,
    receiptRequestId: requestId,
    balance: 0,
    payments: [],
    received: undefined,
  };
  s.documents.unshift(note);
  move(s, note, "Entrada");
  oc.received = { ...oc.received };
  for (const l of incoming)
    oc.received[l.productId] = quantityRound(
      (oc.received[l.productId] ?? 0) + l.quantity,
    );
  oc.status = oc.lines.every(
    (l) => (oc.received?.[l.productId] ?? 0) >= l.quantity,
  )
    ? "Recibida"
    : "Recibida parcial";
  log(s, "Recibir compra", `${oc.number} → ${note.number}`);
  return note;
}
export function invoice(s: State, id: string, voucher: string, date: string) {
  validateDate(date);
  if (!vouchers.includes(voucher))
    throw Error("Selecciona un tipo de comprobante válido.");
  const ov = s.documents.find((d) => d.id === id && d.kind === "OV");
  if (!ov || ov.status !== "Pendiente")
    throw Error("La orden ya fue facturada.");
  validate(s, ov, true);
  if (isCredit(ov.method)) {
    const client = s.customers.find((c) => c.id === ov.partyId)!;
    const debt = s.documents
      .filter((d) => d.kind === "CP" && d.partyId === client.id)
      .reduce((sum, d) => sum + d.balance, 0);
    if (debt + ov.total > client.credit)
      throw Error(
        `La venta supera la línea de crédito disponible (${money(Math.max(0, client.credit - debt))}).`,
      );
  }
  const credit = isCredit(ov.method);
  const cp: Document = {
    ...ov,
    id: uid(),
    number: number(s, "CP", voucher),
    kind: "CP",
    voucher,
    date,
    sourceId: ov.id,
    balance: credit ? ov.total : 0,
    status: credit ? "Pendiente de pago" : "Pagada",
    payments: credit
      ? []
      : [
          {
            id: uid(),
            date,
            amount: ov.total,
            method: ov.method,
            reference: "Pago al contado",
          },
        ],
  };
  s.documents.unshift(cp);
  move(s, cp, "Salida");
  ov.status = "Facturada";
  const quote = s.quotes.find((q) => q.orderId === ov.id);
  if (quote) quote.status = "Procesada";
  log(s, "Facturar venta", `${ov.number} → ${cp.number}`);
  return cp;
}
export function pay(s: State, id: string, payment: Omit<Payment, "id">) {
  validateDate(payment.date);
  const cp = s.documents.find((d) => d.id === id && d.kind === "CP");
  if (!cp || cp.balance <= 0) throw Error("El comprobante no tiene deuda.");
  if (
    !Number.isFinite(payment.amount) ||
    round(payment.amount) < 0.01 ||
    round(payment.amount) > cp.balance
  )
    throw Error("El pago debe ser positivo y no superar el saldo.");
  cp.balance = round(cp.balance - payment.amount);
  cp.payments.push({ ...payment, amount: round(payment.amount), id: uid() });
  cp.status = cp.balance === 0 ? "Pagada" : "Pago parcial";
  log(s, "Registrar cobro", `${cp.number}: ${money(payment.amount)}`);
}
export function saveQuote(
  s: State,
  d: Omit<Quote, "id" | "number" | "status" | "total">,
  id?: string,
) {
  validate(s, d, true, false);
  if (!Number.isInteger(d.validity) || d.validity < 1 || d.validity > 365)
    throw Error("La vigencia debe estar entre 1 y 365 días.");
  const old = s.quotes.find((q) => q.id === id);
  if (old && ["Aceptada", "Procesada"].includes(old.status))
    throw Error("La cotización ya está vinculada a una venta.");
  const quote: Quote = {
    ...d,
    lines: d.lines.map((l) => ({ ...l })),
    id: old?.id ?? uid(),
    number: old?.number ?? number(s, "COT"),
    status: old?.status ?? "Borrador",
    total: total(d.lines, d.discount, d.freight),
  };
  if (old) s.quotes[s.quotes.indexOf(old)] = quote;
  else s.quotes.unshift(quote);
  log(s, "Guardar cotización", quote.number);
  return quote;
}
export function changeQuote(
  s: State,
  id: string,
  action: "send" | "reject" | "accept",
) {
  const q = s.quotes.find((q) => q.id === id);
  if (!q) throw Error("Cotización no encontrada.");
  if (action === "send") {
    if (q.status !== "Borrador") throw Error("La cotización ya fue enviada.");
    q.status = "Enviada";
  } else if (action === "reject") {
    if (q.orderId) throw Error("La cotización ya tiene una venta vinculada.");
    q.status = "Borrador";
  } else {
    if (q.status !== "Enviada" || q.orderId)
      throw Error("Primero envía la cotización.");
    const ov = createDocument(s, { ...q, kind: "OV", date: today() }, q.id);
    q.orderId = ov.id;
    q.status = "Aceptada";
  }
  log(s, "Actualizar cotización", `${q.number}: ${q.status}`);
}
export function initialState(): State {
  const names = [
    "Bolsa industrial 20 L",
    "Balde industrial 20 L",
    "Resina de polietileno",
    "Codo PVC 90° de 1”",
    "Film stretch 50 cm",
    "Contenedor rectangular 40 L",
    "Pigmento azul industrial",
    "Tubo PVC 3/4” × 3 m",
  ];
  const products = names.map((name, i): Product => ({
    id: `PRD-${String(i + 1).padStart(3, "0")}`,
    name,
    category: ["Bolsas", "Envases", "Materia prima", "PVC", "Embalaje"][i % 5],
    unit: i === 2 || i === 6 ? "KG" : "UND",
    cost: [1.2, 12, 5.8, 2.5, 18, 24, 35, 8][i],
    price: [2, 20, 9, 4.5, 28, 38, 55, 13][i],
    minimum: 30,
    active: true,
  }));
  const party = (name: string, i: number, prefix: string): Party => ({
    id: `${prefix}-${i + 1}`,
    name,
    taxId: `201000000${String(i + 1).padStart(2, "0")}`,
    contact: ["Carlos Ramírez", "María Torres", "Ana Flores"][i % 3],
    email: `contacto${i + 1}@empresa.pe`,
    phone: `98765432${i}`,
    address: "Av. Industrial 250, Lima",
    credit: 25000,
    active: true,
  });
  const s: State = {
    version: 1,
    products,
    customers: [
      "Distribuidora San Martín S.A.C.",
      "Comercial Los Andes E.I.R.L.",
      "Plásticos del Sur E.I.R.L.",
      "Corporación del Norte S.A.C.",
    ].map((n, i) => party(n, i, "CLI")),
    suppliers: [
      "Polímeros del Perú S.A.C.",
      "Resinas Andinas S.A.C.",
      "Industrias Plásticas Lima S.A.",
    ].map((n, i) => party(n, i, "PRO")),
    warehouses: [
      {
        id: "ALM-01",
        name: "Almacén principal",
        branch: "Sede central · Lima",
        active: true,
      },
      {
        id: "ALM-02",
        name: "Almacén secundario",
        branch: "Sede central · Lima",
        active: true,
      },
      {
        id: "ALM-03",
        name: "Almacén Arequipa",
        branch: "Sucursal Arequipa",
        active: true,
      },
    ],
    categories: ["Bolsas", "Envases", "Materia prima", "PVC", "Embalaje"],
    documents: [],
    quotes: [],
    movements: [],
    stock: {},
    audit: [],
    settings: { company: "EnterpriseCloud S.A.C.", currency: "PEN" },
  };
  completeFreshDemo(s);
  products.forEach(
    (p, i) =>
      (s.stock[p.id] = {
        "ALM-01": i === 1 ? 18 : 100 + i * 15,
        "ALM-02": 50 + i * 5,
        "ALM-03": 20 + i * 2,
      }),
  );
  const draft = (
    kind: "OC" | "OV",
    partyId: string,
    lines: Line[],
    warehouseId = "ALM-01",
    method = "Crédito 30 días",
  ): Draft => ({
    kind,
    date: today(),
    partyId,
    warehouseId,
    method,
    voucher: "Factura electrónica",
    lines,
    discount: 0,
    freight: 0,
    notes: "",
  });
  const oc = createDocument(
    s,
    draft("OC", s.suppliers[0].id, [
      { productId: products[0].id, quantity: 300, price: 1.2 },
      { productId: products[2].id, quantity: 40, price: 5.8 },
    ]),
  );
  receive(
    s,
    oc.id,
    { [products[0].id]: 300, [products[2].id]: 40 },
    "ALM-01",
    today(),
  );
  const partial = createDocument(
    s,
    draft(
      "OC",
      s.suppliers[1].id,
      [{ productId: products[1].id, quantity: 120, price: 12 }],
      "ALM-02",
      "Contado",
    ),
  );
  receive(s, partial.id, { [products[1].id]: 60 }, "ALM-02", today());
  createDocument(
    s,
    draft(
      "OC",
      s.suppliers[2].id,
      [{ productId: products[4].id, quantity: 80, price: 18 }],
      "ALM-03",
    ),
  );
  const ov = createDocument(
    s,
    draft("OV", s.customers[0].id, [
      { productId: products[0].id, quantity: 60, price: 2 },
      { productId: products[2].id, quantity: 4, price: 9 },
    ]),
  );
  const cp = invoice(s, ov.id, "Factura electrónica", today());
  pay(s, cp.id, {
    date: today(),
    amount: 78,
    method: "Transferencia bancaria",
    reference: "OP-778812",
  });
  const cash = createDocument(
    s,
    draft(
      "OV",
      s.customers[1].id,
      [{ productId: products[1].id, quantity: 10, price: 20 }],
      "ALM-02",
      "Contado",
    ),
  );
  invoice(s, cash.id, "Boleta de venta electrónica", today());
  createDocument(
    s,
    draft("OV", s.customers[2].id, [
      { productId: products[4].id, quantity: 12, price: 28 },
    ]),
  );
  const q = saveQuote(s, {
    ...draft("OV", s.customers[3].id, [
      { productId: products[3].id, quantity: 15, price: 4.5 },
    ]),
    validity: 15,
  });
  q.status = "Enviada";
  s.documents.forEach((document) => {
    document.demo = true;
    document.notes = document.notes
      ? `${document.notes} · DEMO`
      : "Operación DEMO simulada";
  });
  s.quotes.forEach((quote) => {
    quote.demo = true;
    quote.notes = "Cotización DEMO simulada";
  });
  return s;
}
