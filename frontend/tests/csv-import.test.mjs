import test from "node:test";
import assert from "node:assert/strict";
import { initialState, createDocument, today } from "../src/erp/model.ts";
import { cleanBusinessData } from "../src/erp/business-cleanup.ts";
import { rucCheckDigit } from "../src/erp/catalog-logic.ts";
import { importCsv, previewCsv, csvTemplate } from "../src/erp/csv-import.ts";
import { queryProducts, defaultProductFilters } from "../src/erp/product-query.ts";

const ruc = (base) => base + rucCheckDigit(base);
const products = "name,category,unit,cost,price,minimum,sku,barcode,description\n" +
  '"Tubería, reforzada",PVC,UND,10.50,15,3,SKU-1,BAR-1,"Uso industrial"\n' +
  'Válvula ángulo,PVC,UND,8,12,2,SKU-2,BAR-2,"Acero, zinc"\n';

test("fresh state has no business records, but retains all original category, warehouse and company configuration", () => {
  const s = initialState();
  assert.equal(s.categories.length, 10);
  assert.equal(s.warehouses.length, 3);
  assert.deepEqual(s.settings, { company: "EnterpriseCloud S.A.C.", currency: "PEN" });
  for (const name of ["products", "customers", "suppliers", "documents", "quotes", "movements", "audit"])
    assert.deepEqual(s[name], []);
  assert.deepEqual(s.stock, {});
});

test("one-time cleanup preserves configuration exactly and never removes data imported afterwards", () => {
  const s = initialState();
  delete s.businessCleanupVersion;
  const categories = structuredClone(s.categories), warehouses = structuredClone(s.warehouses), company = structuredClone(s.settings);
  s.customers.push({id:"CLI-OLD",name:"Sample",taxId:"12345678"});
  s.documents.push({id:"old",kind:"CP"});
  s.stock["PRD-OLD"] = {"ALM-01": 7};
  s.audit.push({id:"a",date:"2026-01-01",action:"old",record:"old"});
  assert.equal(cleanBusinessData(s), true);
  assert.deepEqual(s.categories, categories);
  assert.deepEqual(s.warehouses, warehouses);
  assert.deepEqual(s.settings, company);
  assert.deepEqual([s.customers,s.documents,s.audit,s.stock,s.payables,s.inventoryValuations],[[],[],[],{},[],[]]);
  importCsv(s, "customers", "name,taxId\nCliente Real,12345678", "skip");
  const saved = JSON.parse(JSON.stringify(s));
  assert.equal(cleanBusinessData(saved), false);
  assert.equal(saved.customers.length, 1);
});

test("CSV imports UTF-8 products into shared catalog with zero stock, without sales or Kardex movements", () => {
  const s = initialState();
  const result = importCsv(s, "products", products, "skip");
  assert.deepEqual(result, {created:2,updated:0,skipped:0,errors:0});
  assert.equal(s.products[0].name, "Tubería, reforzada");
  assert.equal(s.products[1].name, "Válvula ángulo");
  assert.equal(s.products[0].cost, 10.5);
  assert.equal(new Set(s.products.map(p=>p.id)).size, 2);
  assert.deepEqual(Object.values(s.stock[s.products[0].id]), [0,0,0]);
  assert.deepEqual([s.documents,s.movements,s.quotes],[[],[],[]]);
  assert.equal(queryProducts(s,"ALM-01",{...defaultProductFilters,query:"tuberia"},"OC").length,1);
  const persisted = JSON.parse(JSON.stringify(s));
  assert.equal(persisted.products[1].name,"Válvula ángulo");
});

test("duplicates can be skipped or updated without changing codes, stock, or existing document links", () => {
  const s = initialState();
  importCsv(s,"products",products,"skip");
  const originalId=s.products[0].id;
  s.stock[originalId]["ALM-01"]=5;
  const csv='name,category,unit,cost,price,minimum,sku,barcode\n"Tubería, reforzada",PVC,UND,11,20,3,SKU-1,BAR-1';
  assert.equal(previewCsv(s,"products",csv).duplicate,1);
  assert.equal(importCsv(s,"products",csv,"skip").skipped,1);
  assert.equal(s.products[0].price,15);
  assert.equal(importCsv(s,"products",csv,"update").updated,1);
  assert.equal(s.products[0].id,originalId);
  assert.equal(s.products[0].price,20);
  assert.equal(s.stock[originalId]["ALM-01"],5);
});

test("validates rows and columns, keeps good rows, rejects missing categories and malformed dates", () => {
  const s=initialState();
  const csv="name;category;unit;cost;price;minimum;registeredAt\n"+
    "Producto real;PVC;UND;10;20;3;2026-10-23\n"+
    "Producto sin categoría;No existe;UND;10;20;3;2026-02-30\n"+
    "Producto incompleto;PVC;UND;10;;3;2026-10-23\n";
  const preview=previewCsv(s,"products",csv);
  assert.deepEqual([preview.valid,preview.errors,preview.duplicate],[1,2,0]);
  assert.ok(preview.rows[1].errors.category);
  assert.ok(preview.rows[1].errors.registeredAt);
  assert.ok(preview.rows[2].errors.price);
  assert.deepEqual(importCsv(s,"products",csv,"update"),{created:1,updated:0,skipped:0,errors:2});
  assert.equal(s.categories.includes("No existe"),false);
  assert.throws(()=>previewCsv(s,"products","name,category,unit,cost,price,minimum,inventario\nX,PVC,UND,1,2,0,99"),/Columnas no reconocidas/);
  assert.throws(()=>previewCsv(s,"products","name,category,unit,cost,price,minimum\n\"sin cierre,PVC,UND,1,2,0"),/comillas/);
});

test("customers and suppliers use the same catalog chosen by order and quote workflows", () => {
  const s=initialState();
  const supplierCsv=`name,taxId,email,registeredAt,estimatedDeliveryDays\nProveedor Ñ,${ruc("2060000001")},ventas@proveedor.pe,2026-10-23,5`;
  const customerCsv=`name,taxId,credit,active\nComercial Andina,12345678,500,Activo`;
  assert.equal(importCsv(s,"suppliers",supplierCsv,"skip").created,1);
  assert.equal(importCsv(s,"customers",customerCsv,"skip").created,1);
  assert.equal(s.suppliers.length,1); assert.equal(s.customers.length,1);
  assert.equal(s.suppliers[0].taxId,ruc("2060000001"));
  assert.equal(s.customers[0].taxId,"12345678");
  assert.equal(previewCsv(s,"customers",customerCsv).duplicate,1);
  assert.equal(previewCsv(s,"suppliers",supplierCsv).duplicate,1);
  assert.equal(previewCsv(s,"suppliers",`name,taxId\nInválido,20600000014`).errors,1);
  importCsv(s,"products",products,"skip");
  const order=createDocument(s,{kind:"OC",date:today(),partyId:s.suppliers[0].id,warehouseId:s.warehouses[0].id,method:"Contado",voucher:"Factura electrónica",lines:[{productId:s.products[0].id,quantity:2,price:s.products[0].cost}],discount:0,freight:0,notes:""});
  assert.equal(order.partyId,s.suppliers[0].id);
  assert.equal(s.stock[s.products[0].id][s.warehouses[0].id],0);
  assert.equal(csvTemplate("customers").charCodeAt(0),0xFEFF);
});

test("duplicate identifiers within one CSV cannot create repeated customer records", () => {
  const s=initialState();
  const csv="name,taxId\nPrimero,12345678\nSegundo,12345678";
  assert.deepEqual([previewCsv(s,"customers",csv).valid,previewCsv(s,"customers",csv).errors],[1,1]);
  assert.equal(importCsv(s,"customers",csv,"update").created,1);
  assert.equal(s.customers[0].name,"Primero");
});

test("a 200-product CSV feeds the shared searchable catalog without creating stock", () => {
  const s = initialState();
  const rows = Array.from({ length: 200 }, (_, index) =>
    `Producto ${index},PVC,UND,2,5,1,SKU-${index}`);
  const result = importCsv(s, "products",
    `name,category,unit,cost,price,minimum,sku\n${rows.join("\n")}`, "skip");
  assert.equal(result.created, 200);
  assert.equal(s.products.length, 200);
  assert.equal(queryProducts(s, "ALM-01", { ...defaultProductFilters, query: "SKU-199" }, "OC").length, 1);
  assert.equal(s.movements.length, 0);
  assert.ok(Object.values(s.stock).every((warehouses) => Object.values(warehouses).every((quantity) => quantity === 0)));
});
