import type { Party, State } from "./model";
import { rucCheckDigit } from "./catalog-logic.ts";
const demoRuc = (n: number) => {
  const base = `2099000${String(n).padStart(3, "0")}`;
  return base + rucCheckDigit(base);
};
export function demoSupplier(index: number): Party {
  const companies = [
    "Novalina Polímeros S.A.C.",
    "Altacima Resinas Industriales S.A.C.",
    "Lumetra Embalajes E.I.R.L.",
  ];
  return {
    id: `PRO-${index + 1}`,
    name: companies[index],
    taxId: demoRuc(index + 1),
    contact: ["Valeria Montes", "Diego Salcedo", "Lucía Prado"][index],
    email: `ventas@${["novalina", "altacima", "lumetra"][index]}.example`,
    phone: `90010000${index + 1}`,
    alternatePhone: `01555000${index + 1}`,
    address: [
      "Av. Talleres 240, Ate",
      "Jr. Molinos 180, Los Olivos",
      "Av. Manufactura 320, Cerro Colorado",
    ][index],
    credit: 25000,
    active: true,
    demo: true,
    tradeName: ["Novalina", "Altacima Industrial", "Lumetra"][index],
    category: ["Materia prima", "Resinas", "Embalaje"][index],
    supplierType: [
      "Fabricante nacional",
      "Distribuidor nacional",
      "Fabricante nacional",
    ][index],
    contactRole: [
      "Ejecutiva comercial",
      "Coordinador de ventas",
      "Jefa de cuentas",
    ][index],
    district: ["Ate", "Los Olivos", "Cerro Colorado"][index],
    province: ["Lima", "Lima", "Arequipa"][index],
    department: ["Lima", "Lima", "Arequipa"][index],
    paymentTerms: ["Crédito 30 días", "Contado", "Crédito 60 días"][index],
    currency: "PEN",
    estimatedDeliveryDays: [3, 5, 7][index],
    suppliedCategories: [
      ["Polietileno", "Pigmentos"],
      ["Resinas", "PVC"],
      ["Film stretch", "Embalaje"],
    ][index],
    registeredAt: ["2023-03-15", "2024-02-20", "2024-07-12"][index],
    commercialStatus: "Habilitado",
    commercialNotes:
      "Empresa ficticia de demostración. Las condiciones se acuerdan por orden de compra.",
    internalNotes:
      "Registro DEMO; datos de contacto e identificación no verificados.",
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
      category: [
        "Bolsas",
        "Envases",
        "Materia prima",
        "PVC",
        "Embalaje",
        "Envases",
        "Materia prima",
        "PVC",
      ][i],
      sku: `EC-${String(i + 1).padStart(4, "0")}`,
      description: [
        "Bolsa resistente para embalaje industrial, capacidad de 20 litros.",
        "Balde de polietileno de 20 litros para almacenamiento de suministros.",
        "Resina de polietileno para transformación y fabricación de envases.",
        "Conexión de PVC de 90 grados para tuberías de una pulgada.",
        "Película extensible de 50 centímetros para protección de carga.",
        "Recipiente rectangular de 40 litros para organización industrial.",
        "Pigmento azul para procesos de coloración de materiales plásticos.",
        "Tubo de PVC de tres cuartos de pulgada, longitud de tres metros.",
      ][i],
    }),
  );
}
function demoCustomer(i: number): Party {
  const names = [
    "Armonía Distribuciones S.A.C.",
    "Vértice Abastecimientos E.I.R.L.",
    "Brisalia Comercio Industrial S.A.C.",
    "Nexora Suministros S.A.C.",
  ];
  return {
    id: `CLI-${i + 1}`,
    name: names[i],
    taxId: demoRuc(i + 11),
    contact: ["Camila Ríos", "Mateo Vera", "Elena Campos", "Nicolás Lara"][i],
    email: `administracion@cliente${i + 1}.example`,
    phone: `90020000${i + 1}`,
    address: `Av. Comercio ${120 + i * 40}, Lima`,
    credit: 25000,
    active: true,
    demo: true,
    tradeName: names[i].split(" ")[0],
    category: "Comercial",
    registeredAt: "2024-01-10",
    district: ["Surquillo", "San Miguel", "Ate", "Comas"][i],
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
      description: `${p.name}. Producto ficticio para probar compras, ventas e inventario. Importes en PEN.`,
    });
    changed = true;
  });
  return changed;
}
