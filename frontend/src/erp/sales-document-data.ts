import { round, type State, type Document, type Quote } from "./model.ts";

export function salesRelations(s: State, doc: Document) {
  const order =
    doc.kind === "OV"
      ? doc
      : s.documents.find((d) => d.kind === "OV" && d.id === doc.sourceId);
  const invoice =
    doc.kind === "CP"
      ? doc
      : s.documents.find((d) => d.kind === "CP" && d.sourceId === doc.id);
  const quote = order
    ? s.quotes.find((q) => q.id === order.sourceId || q.orderId === order.id)
    : undefined;
  return {
    order,
    invoice,
    quote,
    movements: s.movements.filter((m) => m.documentId === invoice?.id),
    payments: invoice?.payments ?? [],
  };
}
export function financialSummary(
  doc: Pick<Document | Quote, "lines" | "discount" | "freight" | "total">,
) {
  const subtotal = round(
    doc.lines.reduce((sum, l) => sum + l.quantity * l.price, 0),
  );
  // Existing contract: saved prices and total include 18% IGV. Never add tax to total.
  const base = round(doc.total / 1.18);
  return {
    subtotal,
    discount: doc.discount,
    freight: doc.freight,
    base,
    tax: round(doc.total - base),
    total: doc.total,
    difference: round(doc.total - (subtotal - doc.discount + doc.freight)),
  };
}
export function creditDueDate(date: string, method: string) {
  const days = /^Crédito (\d+) días$/.exec(method)?.[1];
  const time = Date.parse(`${date}T12:00:00Z`);
  return days && Number.isFinite(time)
    ? new Date(time + Number(days) * 86400000).toISOString().slice(0, 10)
    : null;
}
export function documentMoney(doc: { currency?: string }, amount: number) {
  const currency = doc.currency ?? "PEN";
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
