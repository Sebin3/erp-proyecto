import type { Party, State } from "./model";
import { rucCheckDigit } from "./catalog-logic.ts";
const demoRuc = (n: number) => {
  const base = `2099000${String(n).padStart(3, "0")}`;
  return base + rucCheckDigit(base);
};

const supplierRecords = [
  ["Novalina Polímeros S.A.C.", "novalina", "Valeria Montes", "Av. Talleres 240, Ate", "Novalina", "Materia prima", "Fabricante nacional", "Ejecutiva comercial", "Ate", "Lima", "Lima", "Crédito 30 días", 3, ["Polietileno", "Pigmentos"], "2023-03-15"],
  ["Altacima Resinas Industriales S.A.C.", "altacima", "Diego Salcedo", "Jr. Molinos 180, Los Olivos", "Altacima Industrial", "Resinas", "Distribuidor nacional", "Coordinador de ventas", "Los Olivos", "Lima", "Lima", "Contado", 5, ["Resinas", "PVC"], "2024-02-20"],
  ["Lumetra Embalajes E.I.R.L.", "lumetra", "Lucía Prado", "Av. Manufactura 320, Cerro Colorado", "Lumetra", "Embalaje", "Fabricante nacional", "Jefa de cuentas", "Cerro Colorado", "Arequipa", "Arequipa", "Crédito 60 días", 7, ["Film stretch", "Embalaje"], "2024-07-12"],
  ["Quimicentro Industrial S.A.C.", "quimicentro", "Renato Paredes", "Av. Separadora Industrial 410, Lima", "Quimicentro", "Químicos", "Distribuidor nacional", "Ejecutivo comercial", "Ate", "Lima", "Lima", "Crédito 30 días", 4, ["Limpieza", "Pigmentos"], "2024-09-05"],
  ["Packline Soluciones E.I.R.L.", "packline", "Sofía Valdivia", "Calle Los Cedros 155, Callao", "Packline", "Embalaje", "Distribuidor nacional", "Ejecutiva de cuentas", "Callao", "Callao", "Callao", "Crédito 45 días", 6, ["Embalaje", "Adhesivos"], "2024-10-18"],
  ["Seguridad Andina S.A.C.", "seguridad-andina", "Jorge Huamán", "Av. Industrial 820, Villa El Salvador", "Seguridad Andina", "Seguridad", "Importador", "Coordinador comercial", "Villa El Salvador", "Lima", "Lima", "Contado", 8, ["Seguridad industrial", "Accesorios"], "2025-01-22"],
  ["Limpieza Técnica del Pacífico S.R.L.", "limpieza-pacifico", "Mariana León", "Jr. Los Eucaliptos 290, San Martín de Porres", "Limpieza Técnica", "Limpieza", "Fabricante nacional", "Asesora comercial", "San Martín de Porres", "Lima", "Lima", "Crédito 30 días", 5, ["Limpieza", "Químicos"], "2025-03-10"],
  ["Conexiones del Valle S.A.C.", "conexiones-valle", "Paolo Cárdenas", "Av. Las Industrias 530, Trujillo", "Conexiones del Valle", "PVC", "Distribuidor nacional", "Jefe de ventas", "Trujillo", "Trujillo", "La Libertad", "Crédito 45 días", 6, ["PVC", "Accesorios"], "2025-05-28"],
] as const;

const productDetails = [
  ["Bolsas", "Bolsa resistente para embalaje industrial, capacidad de 20 litros."],
  ["Envases", "Balde de polietileno de 20 litros para almacenamiento de suministros."],
  ["Materia prima", "Resina de polietileno para transformación y fabricación de envases."],
  ["PVC", "Conexión de PVC de 90 grados para tuberías de una pulgada."],
  ["Embalaje", "Película extensible de 50 centímetros para protección de carga."],
  ["Envases", "Recipiente rectangular de 40 litros para organización industrial."],
  ["Materia prima", "Pigmento azul para procesos de coloración de materiales plásticos."],
  ["PVC", "Tubo de PVC de tres cuartos de pulgada, longitud de tres metros."],
  ["Adhesivos", "Cinta de embalaje de alta resistencia para cierre de cajas."],
  ["Seguridad industrial", "Guantes de nitrilo para manipulación segura en almacén."],
  ["Embalaje", "Etiquetas térmicas para identificación y trazabilidad de productos."],
  ["Limpieza", "Limpiador desengrasante concentrado para superficies industriales."],
  ["PVC", "Válvula de PVC de una pulgada para instalaciones hidráulicas."],
] as const;

export function demoSupplier(index: number): Party {
  const record = supplierRecords[index] ?? supplierRecords[0];
  return {
    id: `PRO-${index + 1}`,
    name: record[0],
    taxId: demoRuc(index + 1),
    contact: record[2],
    email: `ventas@${record[1]}.example`,
    phone: `90010000${index + 1}`,
    alternatePhone: `01555000${index + 1}`,
    address: record[3],
    credit: 25000,
    active: true,
    demo: true,
    tradeName: record[4],
    category: record[5],
    supplierType: record[6],
    contactRole: record[7],
    district: record[8],
    province: record[9],
    department: record[10],
    paymentTerms: record[11],
    currency: "PEN",
    estimatedDeliveryDays: record[12],
    suppliedCategories: [...record[13]],
    registeredAt: record[14],
    commercialStatus: "Habilitado",
    commercialNotes:
      "Las condiciones comerciales se acuerdan por orden de compra.",
    internalNotes:
      "Datos de contacto e identificación pendientes de validación documental.",
  };
}
export function completeFreshDemo(state: State) {
  state.suppliers = state.suppliers.map((s, i) => ({
    ...s,
    ...demoSupplier(i),
  }));
  state.customers.forEach((c, i) => Object.assign(c, demoCustomer(i)));
  state.products.forEach((p, i) =>
    Object.assign(p, {
      demo: true,
      registeredAt: "2024-01-10",
      category: productDetails[i]?.[0] ?? "Otros",
      sku: `EC-${String(i + 1).padStart(4, "0")}`,
      description: productDetails[i]?.[1],
    }),
  );
}

export function expandCatalogData(state: State): boolean {
  let changed = false;
  const categories = ["Adhesivos", "Seguridad industrial", "Limpieza", "Químicos", "Accesorios"];
  categories.forEach((category) => {
    if (!state.categories.includes(category) && !state.deletedCategories?.includes(category)) {
      state.categories.push(category);
      changed = true;
    }
  });

  supplierRecords.forEach((_, index) => {
    const id = `PRO-${index + 1}`;
    if (!state.suppliers.some((supplier) => supplier.id === id)) {
      state.suppliers.push(demoSupplier(index));
      changed = true;
    }
  });

  const customerNames = [
    "Armonía Distribuciones S.A.C.",
    "Vértice Abastecimientos E.I.R.L.",
    "Brisalia Comercio Industrial S.A.C.",
    "Nexora Suministros S.A.C.",
    "Delta Comercial S.A.C.",
    "Grupo Andino de Suministros E.I.R.L.",
    "Nova Industria Peruana S.A.C.",
    "Soluciones Operativas Lima S.R.L.",
    "Mercado Técnico del Sur S.A.C.",
  ];
  customerNames.forEach((name, index) => {
    const id = `CLI-${index + 1}`;
    if (!state.customers.some((customer) => customer.id === id)) {
      state.customers.push(demoCustomer(index));
      changed = true;
    }
  });

  const productSeed = [
    ["Cinta de embalaje 48 mm", "Adhesivos", "UND", 3.2, 5.5, 40],
    ["Guantes de nitrilo industrial", "Seguridad industrial", "CAJ", 18, 28, 15],
    ["Etiquetas térmicas 100 × 150 mm", "Embalaje", "ROL", 12, 19, 20],
    ["Limpiador desengrasante 5 L", "Limpieza", "UND", 16, 25, 12],
    ["Válvula PVC 1 pulgada", "PVC", "UND", 6.5, 10.5, 25],
  ] as const;
  productSeed.forEach(([name, category, unit, cost, price, minimum], offset) => {
    const index = 8 + offset;
    const id = `PRD-${String(index + 1).padStart(3, "0")}`;
    if (state.products.some((product) => product.id === id)) return;
    state.products.push({
      id,
      name,
      category,
      unit,
      cost,
      price,
      minimum,
      active: true,
      demo: true,
      sku: `EC-${String(index + 1).padStart(4, "0")}`,
      description: productDetails[index]?.[1],
      registeredAt: "2025-06-12",
    });
    state.stock[id] = { "ALM-01": 80 + offset * 10, "ALM-02": 30 + offset * 5, "ALM-03": 15 + offset * 3 };
    changed = true;
  });
  return changed;
}

function demoCustomer(i: number): Party {
  const names = [
    "Armonía Distribuciones S.A.C.",
    "Vértice Abastecimientos E.I.R.L.",
    "Brisalia Comercio Industrial S.A.C.",
    "Nexora Suministros S.A.C.",
    "Delta Comercial S.A.C.",
    "Grupo Andino de Suministros E.I.R.L.",
    "Nova Industria Peruana S.A.C.",
    "Soluciones Operativas Lima S.R.L.",
    "Mercado Técnico del Sur S.A.C.",
  ];
  const contacts = ["Camila Ríos", "Mateo Vera", "Elena Campos", "Nicolás Lara", "Andrea Salas", "Bruno Castañeda", "Julia Ponce", "Iván Lozano", "Rosa Medina"];
  const districts = ["Surquillo", "San Miguel", "Ate", "Comas", "Miraflores", "Callao", "Lince", "Chorrillos", "Arequipa"];
  return {
    id: `CLI-${i + 1}`,
    name: names[i],
    taxId: demoRuc(i + 11),
    contact: contacts[i],
    email: `administracion@cliente${i + 1}.example`,
    phone: `90020000${i + 1}`,
    address: `Av. Comercio ${120 + i * 40}, Lima`,
    credit: 25000,
    active: true,
    demo: true,
    tradeName: names[i].split(" ")[0],
    category: "Comercial",
    registeredAt: "2024-01-10",
    district: districts[i],
    province: "Lima",
    department: "Lima",
    paymentTerms: i % 2 ? "Contado" : "Crédito 30 días",
    currency: "PEN",
  };
}
// Exact untouched legacy demo fingerprints only; an ID alone never authorizes replacing a record.
export function upgradeLegacyDemo(state: State): boolean {
  let changed = false;
  const legacy = [
    "Polímeros del Perú S.A.C.",
    "Resinas Andinas S.A.C.",
    "Industrias Plásticas Lima S.A.",
  ];
  const contacts = ["Carlos Ramírez", "María Torres", "Ana Flores"];
  state.suppliers.forEach((s) => {
    const n = legacy.indexOf(s.name);
    if (
      n < 0 ||
      s.demo !== undefined ||
      s.id !== `PRO-${n + 1}` ||
      s.taxId !== `201000000${String(n + 1).padStart(2, "0")}` ||
      s.contact !== contacts[n] ||
      s.email !== `contacto${n + 1}@empresa.pe` ||
      s.phone !== `98765432${n}` ||
      s.address !== "Av. Industrial 250, Lima" ||
      s.credit !== 25000 ||
      !s.active ||
      Object.keys(s).some(
        (key) =>
          ![
            "id",
            "name",
            "taxId",
            "contact",
            "email",
            "phone",
            "address",
            "credit",
            "active",
          ].includes(key),
      )
    )
      return;
    Object.assign(s, demoSupplier(n));
    changed = true;
  });
  const customerNames = [
    "Distribuidora San Martín S.A.C.",
    "Comercial Los Andes E.I.R.L.",
    "Plásticos del Sur E.I.R.L.",
    "Corporación del Norte S.A.C.",
  ];
  state.customers.forEach((c) => {
    const n = customerNames.indexOf(c.name);
    if (
      n < 0 ||
      c.demo !== undefined ||
      c.id !== `CLI-${n + 1}` ||
      c.taxId !== `201000000${String(n + 1).padStart(2, "0")}` ||
      c.contact !== contacts[n % 3] ||
      c.email !== `contacto${n + 1}@empresa.pe` ||
      c.phone !== `98765432${n}` ||
      c.address !== "Av. Industrial 250, Lima" ||
      c.credit !== 25000 ||
      !c.active ||
      Object.keys(c).some(
        (key) =>
          ![
            "id",
            "name",
            "taxId",
            "contact",
            "email",
            "phone",
            "address",
            "credit",
            "active",
          ].includes(key),
      )
    )
      return;
    Object.assign(c, demoCustomer(n));
    changed = true;
  });
  const productNames = [
    "Bolsa industrial 20 L",
    "Balde industrial 20 L",
    "Resina de polietileno",
    "Codo PVC 90° de 1”",
    "Film stretch 50 cm",
    "Contenedor rectangular 40 L",
    "Pigmento azul industrial",
    "Tubo PVC 3/4” × 3 m",
  ];
  state.products.forEach((p) => {
    const n = productNames.indexOf(p.name);
    if (
      n < 0 ||
      p.demo !== undefined ||
      p.id !== `PRD-${String(n + 1).padStart(3, "0")}` ||
      p.category !==
        ["Bolsas", "Envases", "Materia prima", "PVC", "Embalaje"][n % 5] ||
      p.unit !== (n === 2 || n === 6 ? "KG" : "UND") ||
      p.cost !== [1.2, 12, 5.8, 2.5, 18, 24, 35, 8][n] ||
      p.price !== [2, 20, 9, 4.5, 28, 38, 55, 13][n] ||
      p.minimum !== 30 ||
      !p.active ||
      Object.keys(p).some(
        (key) =>
          ![
            "id",
            "name",
            "category",
            "unit",
            "cost",
            "price",
            "minimum",
            "active",
          ].includes(key),
      )
    )
      return;
    Object.assign(p, {
      demo: true,
      registeredAt: "2024-01-10",
      description: `${p.name}. Producto para compras, ventas e inventario. Importes en PEN.`,
    });
    changed = true;
  });
  return changed;
}
