import type { Product, Line, State } from "./model.ts";

export type ProductContext = "OC" | "OV" | "COT";
export type ProductFilters = {
  query: string;
  category: string;
  status: string;
  availability: string;
  sort: string;
};
export const defaultProductFilters: ProductFilters = {
  query: "",
  category: "",
  status: "",
  availability: "",
  sort: "name",
};
export const normalizeProductText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");
export const productStock = (state: State, id: string, warehouseId: string) =>
  state.stock[id]?.[warehouseId] ?? 0;
export function queryProducts(
  state: State,
  warehouseId: string,
  filters: ProductFilters,
  context: ProductContext,
) {
  const query = normalizeProductText(filters.query.trim());
  const price = (p: Product) => (context === "OC" ? p.cost : p.price);
  return state.products
    .filter((p) => {
      const stock = productStock(state, p.id, warehouseId);
      return (
        (!query ||
          normalizeProductText(
            [p.name, p.id, p.sku, p.barcode, p.description].join(" "),
          ).includes(query)) &&
        (!filters.category || p.category === filters.category) &&
        (!filters.status || p.active === (filters.status === "active")) &&
        (!filters.availability ||
          (filters.availability === "stock"
            ? stock > 0
            : filters.availability === "empty"
              ? stock <= 0
              : stock > 0 && stock <= p.minimum))
      );
    })
    .sort((a, b) => {
      if (filters.sort === "price")
        return price(a) - price(b) || a.id.localeCompare(b.id);
      if (filters.sort === "price-desc")
        return price(b) - price(a) || a.id.localeCompare(b.id);
      if (filters.sort === "stock")
        return (
          productStock(state, b.id, warehouseId) -
            productStock(state, a.id, warehouseId) || a.id.localeCompare(b.id)
        );
      return (
        (filters.sort === "code"
          ? a.id.localeCompare(b.id, "es", { numeric: true })
          : a.name.localeCompare(b.name, "es", {
              sensitivity: "base",
              numeric: true,
            }) * (filters.sort === "name-desc" ? -1 : 1)) ||
        a.id.localeCompare(b.id)
      );
    });
}
export function productRestriction(
  state: State,
  product: Product,
  warehouseId: string,
  context: ProductContext,
  lines: Line[],
) {
  if (!product.active) return "Producto inactivo";
  const existing = lines.find((l) => l.productId === product.id);
  if (
    context === "OV" &&
    (existing
      ? productStock(state, product.id, warehouseId) < existing.quantity + 1
      : productStock(state, product.id, warehouseId) <= 0)
  )
    return "Stock insuficiente en este almacén";
  return "";
}
export function appendProducts(
  state: State,
  lines: Line[],
  ids: string[],
  warehouseId: string,
  context: ProductContext,
) {
  const next = lines.map((l) => ({ ...l }));
  for (const id of new Set(ids)) {
    const product = state.products.find((p) => p.id === id);
    if (!product) throw new Error("El producto ya no está disponible.");
    const reason = productRestriction(
      state,
      product,
      warehouseId,
      context,
      next,
    );
    if (reason) throw new Error(`${product.name}: ${reason}.`);
    const line = next.find((l) => l.productId === id);
    if (line) line.quantity += 1;
    else
      next.push({
        productId: id,
        quantity:
          context === "OV"
            ? Math.min(1, productStock(state, id, warehouseId))
            : 1,
        price: context === "OC" ? product.cost : product.price,
      });
  }
  return next;
}
