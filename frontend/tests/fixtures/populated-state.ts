import { completeFreshDemo } from "./demo.ts";
import { createDocument, receive, invoice, pay, saveQuote, today, defaultAccessRoles, defaultAccessUsers } from "../../src/erp/model.ts";
import type { State, Product, Party, Draft, Line } from "../../src/erp/model.ts";
export function populatedState(): State {
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
    users: defaultAccessUsers(),
    roles: defaultAccessRoles(),
    currentUserId: "USR-001",
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
      ? document.notes
      : "Operación registrada";
  });
  s.quotes.forEach((quote) => {
    quote.demo = true;
    quote.notes = "Cotización comercial registrada.";
  });
  s.businessCleanupVersion = 1;
  return s;
}
