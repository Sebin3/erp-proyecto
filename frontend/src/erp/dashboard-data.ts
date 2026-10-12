import { today, stockOf, type State, type Document } from "./model.ts";
export type ChartPeriod = "Semanal" | "Mensual" | "Trimestral";
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
      (d) => d.date >= start && d.date <= end && (!demo || d.demo),
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
  return {
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
      .filter((d) => d.kind === "OV")
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || b.number.localeCompare(a.number),
      ),
  };
}
export function chartBuckets(state: State, period: ChartPeriod, now = today()) {
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
    return {
      start,
      end: dateKey(new Date(timestamp(end) - day)),
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
