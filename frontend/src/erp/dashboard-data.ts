import { today, stockOf, type State, type Document } from "./model.ts";
export type ChartPeriod = "Diario" | "Semanal" | "Mensual" | "Trimestral";
const day = 86400000;
const timestamp = (date: string) => Date.parse(`${date}T00:00:00Z`);
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
export const validOperation = (d: Document) =>
  !/anulad|cancelad|devuelt/i.test(d.status) &&
  Number.isFinite(d.total) &&
  d.total >= 0;
export function dueDate(d: Document) {
  const days = /^Crédito (\d+) días$/.exec(d.method)?.[1];
  return days
    ? dateKey(new Date(timestamp(d.date) + Number(days) * day))
    : null;
}
export function dashboardData(state: State, now = today()) {
  const sales = state.documents.filter(
    (d) => d.kind === "CP" && validOperation(d) && d.date <= now,
  );
  const purchases = state.documents.filter(
    (d) => d.kind === "OC" && validOperation(d) && d.date <= now,
  );
  const receivables = sales
    .filter((d) => d.balance > 0)
    .map((d) => {
      const due = dueDate(d);
      const overdue = due
        ? Math.floor((timestamp(now) - timestamp(due)) / day)
        : null;
      return {
        doc: d,
        due,
        overdue,
        bucket:
          overdue === null
            ? -1
            : overdue <= 0
              ? 0
              : overdue <= 30
                ? 1
                : overdue <= 60
                  ? 2
                  : 3,
      };
    });
  const aging = [0, 0, 0, 0];
  const payables = (state.payables ?? [])
    .filter(
      (p) =>
        p.balance > 0 &&
        p.date <= now &&
        state.documents.some((d) => d.id === p.documentId && validOperation(d)),
    )
    .map((p) => {
      const overdue = Math.floor((timestamp(now) - timestamp(p.dueDate)) / day);
      return {
        account: p,
        doc: state.documents.find((d) => d.id === p.documentId)!,
        due: p.dueDate,
        overdue,
        balance: p.balance,
        bucket: overdue <= 0 ? 0 : overdue <= 30 ? 1 : overdue <= 60 ? 2 : 3,
      };
    });
  const payableAging = [0, 0, 0, 0];
  payables.forEach((p) => (payableAging[p.bucket] += p.balance));
  receivables.forEach((r) => {
    if (r.bucket >= 0) aging[r.bucket] += r.doc.balance;
  });
  let cost = 0;
  const completeCosts = sales.every((d) => {
    const movements = state.movements.filter(
      (m) => m.documentId === d.id && m.type === "Salida",
    );
    if (
      !d.lines.every(
        (l) =>
          Math.abs(
            movements
              .filter((m) => m.productId === l.productId)
              .reduce((s, m) => s + m.quantity, 0) - l.quantity,
          ) < 0.000001,
      )
    )
      return false;
    if (movements.some((m) => !Number.isFinite(m.cost) || m.cost < 0))
      return false;
    cost += movements.reduce((s, m) => s + m.quantity * m.cost, 0);
    return true;
  });
  const salesTotal = sales.reduce((s, d) => s + d.total, 0);
  // The existing document editor records prices including 18% IGV for purchases and sales.
  const netSales = salesTotal / 1.18;
  const profit = completeCosts && sales.length ? netSales - cost / 1.18 : null;
  const low = state.products
    .filter((p) => p.active)
    .flatMap((p) =>
      state.warehouses
        .filter((w) => w.active)
        .map((w) => ({ p, w, quantity: stockOf(state, p.id, w.id) })),
    )
    .filter((r) => r.quantity <= r.p.minimum)
    .sort((a, b) => {
      const severity = (r: typeof a) =>
        r.p.minimum > 0
          ? (r.p.minimum - r.quantity) / r.p.minimum
          : r.quantity === 0
            ? 1
            : 0;
      return (
        severity(b) - severity(a) ||
        a.quantity - b.quantity ||
        a.p.name.localeCompare(b.p.name)
      );
    });
  const valuations = (state.inventoryValuations ?? [])
    .filter((v) => v.date <= now && Number.isFinite(v.value) && v.value >= 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  let rotation: null | {
    value: number;
    start: string;
    end: string;
    demo: boolean;
    estimated?: boolean;
  } = null;
  if (valuations.length >= 2) {
    const start = valuations[0].date,
      end = valuations.at(-1)!.date;
    const demo = valuations.every((v) => v.demo);
    let weighted = 0,
      duration = 0;
    for (let i = 1; i < valuations.length; i++) {
      const delta =
        timestamp(valuations[i].date) - timestamp(valuations[i - 1].date);
      weighted +=
        (delta *
          (valuations[i].value / (valuations[i].includesTax ? 1.18 : 1) +
            valuations[i - 1].value /
              (valuations[i - 1].includesTax ? 1.18 : 1))) /
        2;
      duration += delta;
    }
    const average = duration > 0 ? weighted / duration : 0;
    const periodSales = sales.filter(
      (d) => d.date >= start && d.date <= end,
    );
    const ids = new Set(periodSales.map((d) => d.id));
    const moves = state.movements.filter(
      (m) => ids.has(m.documentId) && m.type === "Salida",
    );
    const complete = periodSales.every((d) =>
      d.lines.every(
        (l) =>
          Math.abs(
            moves
              .filter(
                (m) => m.documentId === d.id && m.productId === l.productId,
              )
              .reduce((s, m) => s + m.quantity, 0) - l.quantity,
          ) < 0.000001,
      ),
    );
    if (
      average > 0 &&
      complete &&
      periodSales.length &&
      moves.every((m) => Number.isFinite(m.cost) && m.cost >= 0)
    )
      rotation = {
        value:
          moves.reduce((s, m) => s + (m.quantity * m.cost) / 1.18, 0) / average,
        start,
        end,
        demo,
      };
  }
  // Without historical valuations, reconstruct daily quantities from the stock
  // ledger and value them at current catalog costs. This is explicitly estimated.
  if ((!rotation || sales.some((d) => d.date > rotation!.end)) && completeCosts && state.products.length) {
    const start = dateKey(new Date(timestamp(now) - 89 * day));
    const quantities = structuredClone(state.stock);
    const costs = new Map(state.products.map((p) => [p.id, p.cost]));
    const movements = [...state.movements].sort((a, b) => b.date.localeCompare(a.date));
    let index = 0, sum = 0, valid = state.products.every((p) => Number.isFinite(p.cost) && p.cost >= 0);
    for (let offset = 0; offset < 90 && valid; offset++) {
      const date = dateKey(new Date(timestamp(now) - offset * day));
      while (index < movements.length && movements[index].date > date) {
        const m = movements[index++];
        if (!Number.isFinite(m.quantity) || m.quantity < 0) { valid = false; break; }
        const warehouses = quantities[m.productId] ??= {};
        warehouses[m.warehouseId] = (warehouses[m.warehouseId] ?? 0) + (m.type === "Entrada" ? -m.quantity : m.quantity);
      }
      for (const [productId, warehouses] of Object.entries(quantities)) {
        for (const quantity of Object.values(warehouses)) {
          if (!Number.isFinite(quantity) || quantity < -0.000001 || !costs.has(productId)) valid = false;
          sum += Math.max(0, quantity) * (costs.get(productId) ?? 0) / 1.18;
        }
      }
    }
    const periodIds = new Set(sales.filter((d) => d.date >= start).map((d) => d.id));
    const periodCost = state.movements.filter((m) => periodIds.has(m.documentId) && m.type === "Salida").reduce((total, m) => total + m.quantity * m.cost / 1.18, 0);
    if (valid && sum > 0) rotation = {value: periodCost / (sum / 90), start, end: now, demo: false, estimated: true};
  }
  const pendingInvoices = state.documents.filter((d) => d.kind === "OV" && d.status === "Pendiente" && validOperation(d) && d.date <= now);
  return {
    pendingInvoices,
    pendingInvoiceTotal: pendingInvoices.reduce((sum, d) => sum + d.total, 0),
    payables,
    payableAging,
    payableDebt: payables.reduce((s, p) => s + p.balance, 0),
    payableOverdue: payables.filter((p) => p.overdue > 0).length,
    hasPayableLedger: state.payables !== undefined,
    rotation,
    sales,
    purchases,
    salesTotal,
    purchasesTotal: purchases.reduce((s, d) => s + d.total, 0),
    netSales,
    profit,
    margin: profit !== null && netSales > 0 ? (profit / netSales) * 100 : null,
    receivables,
    aging,
    debt: receivables.reduce((s, r) => s + r.doc.balance, 0),
    overdue: receivables.filter((r) => (r.overdue ?? 0) > 0).length,
    unknownDue: receivables.filter((r) => r.due === null).length,
    low,
    criticalProducts: new Set(low.map((r) => r.p.id)).size,
    alerts: [
      ...receivables.map((r) => ({
        ...r,
        balance: r.doc.balance,
        type: "Cobrar",
        payableId: "",
      })),
      ...payables.map((r) => ({
        ...r,
        type: "Pagar",
        payableId: r.account.id,
      })),
    ]
      .filter((r) => r.overdue !== null && r.overdue >= -7)
      .sort((a, b) => (b.overdue ?? 0) - (a.overdue ?? 0))
      .slice(0, 5),
    orders: state.documents
      .filter((d) => d.kind === "OV" && d.date === now)
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.number.localeCompare(a.number),
      ),
  };
}
export function chartBuckets(state: State, period: ChartPeriod, now = today()) {
  if (period === "Diario") return dailyChartBuckets(state, now);
  const current = new Date(timestamp(now));
  const count = period === "Semanal" ? 8 : period === "Mensual" ? 6 : 4;
  const boundary = (offset: number) => {
    const d = new Date(current);
    if (period === "Semanal") {
      d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + offset * 7);
    } else if (period === "Mensual") {
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + offset);
    } else {
      d.setUTCDate(1);
      d.setUTCMonth(Math.floor(d.getUTCMonth() / 3) * 3 + offset * 3);
    }
    return dateKey(d);
  };
  return Array.from({ length: count }, (_, i) => {
    const start = boundary(i - count + 1),
      end = boundary(i - count + 2);
    const d = new Date(timestamp(start));
    const label =
      period === "Semanal"
        ? `${d.getUTCDate()} ${d.toLocaleDateString("es-PE", { month: "short", timeZone: "UTC" })}`
        : period === "Mensual"
          ? d.toLocaleDateString("es-PE", {
              month: "short",
              year: "2-digit",
              timeZone: "UTC",
            })
          : `T${Math.floor(d.getUTCMonth() / 3) + 1} ${d.getUTCFullYear()}`;
    const docs = state.documents.filter(
      (doc) =>
        validOperation(doc) &&
        doc.date >= start &&
        doc.date < end &&
        doc.date <= now,
    );
    const finalDay = dateKey(new Date(timestamp(end) - day));
    return {
      start,
      end: finalDay > now ? now : finalDay,
      label,
      sales: docs
        .filter((d) => d.kind === "CP")
        .reduce((s, d) => s + d.total, 0),
      buys: docs
        .filter((d) => d.kind === "OC")
        .reduce((s, d) => s + d.total, 0),
    };
  });
}

// Current month, one point per day, with no dates after today.
export function dailyChartBuckets(state: State, now = today()) {
  const count = Number(now.slice(8, 10));
  return Array.from({length: count}, (_, index) => {
    const date = `${now.slice(0, 8)}${String(index + 1).padStart(2, "0")}`;
    const documents = state.documents.filter((d) => d.date === date && validOperation(d));
    return {start: date, end: date, label: `${index + 1} ${new Date(timestamp(date)).toLocaleDateString("es-PE", {month: "short", timeZone: "UTC"})}`,
      sales: documents.filter((d) => d.kind === "CP").reduce((sum, d) => sum + d.total, 0),
      buys: documents.filter((d) => d.kind === "OC").reduce((sum, d) => sum + d.total, 0)};
  });
}
