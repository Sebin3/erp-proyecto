import type { State } from "./model";

const normalize = (value: string) => value.trim().toLocaleLowerCase("es");

/**
 * Introduces the Maestros layer without replacing the legacy fields used by
 * the operational screens. It is deliberately idempotent: reopening the app
 * must never duplicate companies, branches, units or categories.
 */
export function ensureMasterData(state: State) {
  let changed = false;
  const companyId = state.companies?.[0]?.id ?? "EMP-001";
  state.companies ??= [{
    id: companyId,
    taxId: "",
    legalName: state.settings.company,
    fiscalAddress: "",
    baseCurrency: state.settings.currency,
    active: true,
  }];
  const company = state.companies[0];
  if (company.legalName !== state.settings.company) {
    company.legalName = state.settings.company;
    changed = true;
  }

  state.branches ??= [];
  const branchByName = new Map(state.branches.map((branch) => [normalize(branch.name), branch]));
  const names = [...new Set(state.warehouses.map((warehouse) => warehouse.branch.trim()).filter(Boolean))];
  names.forEach((name, index) => {
    if (!branchByName.has(normalize(name))) {
      const branch = {
        id: `SUC-${String(state.branches!.length + 1).padStart(3, "0")}`,
        companyId: company.id,
        code: `SUC-${String(state.branches!.length + 1).padStart(2, "0")}`,
        name,
        address: "",
        active: true,
      };
      state.branches!.push(branch);
      branchByName.set(normalize(name), branch);
      changed = true;
    }
  });
  state.warehouses.forEach((warehouse) => {
    const branch = branchByName.get(normalize(warehouse.branch));
    if (branch && warehouse.branchId !== branch.id) {
      warehouse.branchId = branch.id;
      changed = true;
    }
    if (!warehouse.code) {
      warehouse.code = warehouse.id;
      changed = true;
    }
  });

  state.masterCategories ??= [];
  const categoryByName = new Map(state.masterCategories.map((category) => [normalize(category.name), category]));
  state.categories.forEach((name, index) => {
    if (!categoryByName.has(normalize(name))) {
      const category = {
        id: `CAT-${String(state.masterCategories!.length + 1).padStart(3, "0")}`,
        code: `CAT-${String(state.masterCategories!.length + 1).padStart(3, "0")}`,
        name,
        active: true,
      };
      state.masterCategories!.push(category);
      categoryByName.set(normalize(name), category);
      changed = true;
    }
  });
  state.products.forEach((product) => {
    const category = categoryByName.get(normalize(product.category));
    if (category && product.categoryId !== category.id) {
      product.categoryId = category.id;
      changed = true;
    }
  });

  state.units ??= [];
  const unitByCode = new Map(state.units.map((unit) => [normalize(unit.code), unit]));
  if (!unitByCode.has("und")) {
    const unit = {
      id: "UND",
      code: "UND",
      name: "Unidad",
      abbreviation: "UND",
      precision: 0,
      active: true,
    };
    state.units.push(unit);
    unitByCode.set("und", unit);
    changed = true;
  }
  const legacyUnits = [...new Set(state.products.map((product) => product.unit.trim()).filter(Boolean))];
  legacyUnits.forEach((code) => {
    if (!unitByCode.has(normalize(code))) {
      const unit = {
        id: code.toUpperCase(),
        code: code.toUpperCase(),
        name: code.toUpperCase() === "UND" ? "Unidad" : code,
        abbreviation: code.toUpperCase(),
        precision: 3,
        active: true,
      };
      state.units!.push(unit);
      unitByCode.set(normalize(code), unit);
      changed = true;
    }
  });
  state.products.forEach((product) => {
    const unit = unitByCode.get(normalize(product.unit));
    if (unit && product.unitId !== unit.id) {
      product.unitId = unit.id;
      changed = true;
    }
  });
  state.brands ??= [];
  state.unitConversions ??= [];

  state.transporters ??= [];
  state.sellers ??= [];
  state.zones ??= [];
  state.currencies ??= [];
  state.exchangeRates ??= [];
  state.taxes ??= [];
  state.paymentMethods ??= [];
  state.priceLists ??= [];
  state.priceListItems ??= [];

  const addCurrency = (isoCode: string, name: string, symbol: string) => {
    if (!state.currencies!.some((currency) => currency.isoCode.toUpperCase() === isoCode)) {
      state.currencies!.push({ id: isoCode, isoCode, name, symbol, active: true });
      changed = true;
    }
  };
  addCurrency("PEN", "Sol peruano", "S/");
  addCurrency("USD", "Dólar estadounidense", "$" );
  addCurrency("EUR", "Euro", "€");

  if (!state.taxes.some((tax) => tax.code.toUpperCase() === "IGV18")) {
    state.taxes.push({ id: "IGV18", code: "IGV18", name: "IGV general", percentage: 18, type: "IGV", validFrom: "2024-01-01", active: true });
    changed = true;
  }
  const defaultPaymentMethods = [
    { id: "CONTADO", code: "CONT", name: "Contado", creditDays: 0, type: "Contado" as const },
    { id: "TRANSFERENCIA", code: "TRANS", name: "Transferencia bancaria", creditDays: 0, type: "Electrónico" as const },
    { id: "CREDITO-30", code: "CRED30", name: "Crédito 30 días", creditDays: 30, type: "Crédito" as const },
    { id: "CREDITO-60", code: "CRED60", name: "Crédito 60 días", creditDays: 60, type: "Crédito" as const },
  ];
  defaultPaymentMethods.forEach((method) => {
    if (!state.paymentMethods!.some((current) => current.id === method.id)) {
      state.paymentMethods!.push({ ...method, active: true });
      changed = true;
    }
  });
  if (!state.priceLists.some((list) => list.code === "BASE-PEN")) {
    state.priceLists.push({ id: "LISTA-BASE", code: "BASE-PEN", name: "Lista base PEN", currencyId: "PEN", validFrom: "2024-01-01", active: true });
    changed = true;
  }
  return changed;
}
