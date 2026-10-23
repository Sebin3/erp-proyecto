import { Document as PdfDocument, Page, StyleSheet, Text, View, pdf } from "@react-pdf/renderer";
import { dateLabel, type Document, type State } from "./model";
import { documentMoney, financialSummary, salesRelations } from "./sales-document-data";

export type InvoicePdfFormat = "corporate" | "classic" | "compact";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", paddingTop: 40, paddingHorizontal: 42, paddingBottom: 48, color: "#16191d", fontSize: 9 },
  compactPage: { paddingTop: 26, paddingHorizontal: 27, paddingBottom: 35, fontSize: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", paddingBottom: 18, borderBottom: "1 solid #1c2025", marginBottom: 20 },
  company: { fontSize: 16, fontFamily: "Helvetica-Bold", maxWidth: "65%", marginBottom: 5 },
  companyCompact: { fontSize: 12 },
  label: { fontSize: 8, letterSpacing: 1, color: "#666b73", marginBottom: 6 },
  documentNumber: { fontFamily: "Helvetica-Bold", fontSize: 15, textAlign: "right" },
  documentNumberCompact: { fontSize: 11 },
  right: { textAlign: "right" },
  muted: { color: "#666b73" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 10 },
  cards: { flexDirection: "row", gap: 16, marginBottom: 22 },
  compactCards: { gap: 10, marginBottom: 12 },
  card: { width: "50%", padding: 12, backgroundColor: "#f5f5f5", borderRadius: 5 },
  compactCard: { padding: 8 },
  classicCard: { backgroundColor: "#ffffff", border: "1 solid #dedede" },
  cardLine: { marginTop: 4 },
  bold: { fontFamily: "Helvetica-Bold" },
  tableHead: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 7, borderBottom: "1 solid #222", backgroundColor: "#efefef" },
  classicHead: { backgroundColor: "#ffffff" },
  row: { flexDirection: "row", paddingVertical: 9, paddingHorizontal: 7, borderBottom: "1 solid #e6e6e6" },
  code: { width: "15%", paddingRight: 5 },
  item: { width: "39%", paddingRight: 5 },
  qty: { width: "12%", textAlign: "right" },
  price: { width: "17%", textAlign: "right" },
  amount: { width: "17%", textAlign: "right" },
  totals: { width: "55%", alignSelf: "flex-end", marginTop: 16 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 7, paddingTop: 10, borderTop: "1 solid #1c2025", fontFamily: "Helvetica-Bold", fontSize: 13 },
  note: { marginTop: 15, paddingTop: 8, borderTop: "1 solid #e6e6e6" },
  footer: { position: "absolute", bottom: 20, left: 42, right: 42, borderTop: "1 solid #dedede", paddingTop: 6, flexDirection: "row", justifyContent: "space-between", color: "#666b73", fontSize: 7 },
  compactFooter: { left: 27, right: 27, bottom: 13 },
});

function InvoicePdf({ state, doc, format }: { state: State; doc: Document; format: InvoicePdfFormat }) {
  const compact = format === "compact";
  const classic = format === "classic";
  const buyer = doc.customerSnapshot ?? state.customers.find((c) => c.id === doc.partyId);
  const order = salesRelations(state, doc).order;
  const f = financialSummary(doc);
  const money = (n: number) => documentMoney(doc, n);
  const cell = (v?: string) => v?.trim() || "—";
  return (
    <PdfDocument title={`${doc.voucher} ${doc.number}`} author={state.settings.company} subject="Comprobante interno EnterpriseCloud">
      <Page size={compact ? "A5" : classic ? "LETTER" : "A4"} style={[s.page, ...(compact ? [s.compactPage] : [])]} wrap>
        <View style={s.header} wrap={false}>
          <View style={{ maxWidth: "62%" }}>
            <Text style={[s.company, ...(compact ? [s.companyCompact] : [])]}>{state.settings.company}</Text>
            <Text style={s.muted}>EnterpriseCloud · Documento comercial</Text>
          </View>
          <View>
            <Text style={[s.label, s.right]}>{doc.voucher.toUpperCase()}</Text>
            <Text style={[s.documentNumber, ...(compact ? [s.documentNumberCompact] : [])]}>{doc.number}</Text>
            <Text style={[s.muted, s.right, { marginTop: 5 }]}>{dateLabel(doc.date)}</Text>
          </View>
        </View>
        <View style={[s.cards, ...(compact ? [s.compactCards] : [])]} wrap={false}>
          <View style={[s.card, ...(classic ? [s.classicCard] : []), ...(compact ? [s.compactCard] : [])]}>
            <Text style={s.label}>CLIENTE</Text>
            <Text style={s.bold}>{cell(buyer?.name)}</Text>
            <Text style={s.cardLine}>RUC / DNI: {cell(buyer?.taxId)}</Text>
            {buyer?.address && <Text style={s.cardLine}>{buyer.address}</Text>}
            {buyer?.email && <Text style={s.cardLine}>{buyer.email}</Text>}
          </View>
          <View style={[s.card, ...(classic ? [s.classicCard] : []), ...(compact ? [s.compactCard] : [])]}>
            <Text style={s.label}>DETALLES</Text>
            <Text style={s.cardLine}>Estado: {doc.status}</Text>
            <Text style={s.cardLine}>Condición: {doc.method}</Text>
            <Text style={s.cardLine}>Moneda: {doc.currency ?? state.settings.currency}</Text>
            {order && <Text style={s.cardLine}>Orden: {order.number}</Text>}
            {state.warehouses.find((w) => w.id === doc.warehouseId)?.name && <Text style={s.cardLine}>Almacén: {state.warehouses.find((w) => w.id === doc.warehouseId)?.name}</Text>}
          </View>
        </View>
        <Text style={s.title}>Detalle de productos</Text>
        <View style={[s.tableHead, ...(classic ? [s.classicHead] : [])]} wrap={false}>
          <Text style={s.code}>Código</Text><Text style={s.item}>Descripción</Text><Text style={s.qty}>Cant.</Text><Text style={s.price}>P. unitario</Text><Text style={s.amount}>Importe</Text>
        </View>
        {doc.lines.map((line, index) => (
          <View style={s.row} key={`${line.productId}-${index}`} wrap={false}>
            <Text style={s.code}>{line.productId}</Text>
            <Text style={s.item}>{line.productSnapshot?.name ?? state.products.find((p) => p.id === line.productId)?.name ?? "Producto no registrado"}</Text>
            <Text style={s.qty}>{line.quantity.toLocaleString("es-PE", { maximumFractionDigits: 3 })}</Text>
            <Text style={s.price}>{money(line.price)}</Text>
            <Text style={s.amount}>{money(line.quantity * line.price)}</Text>
          </View>
        ))}
        <View style={s.totals} wrap={false}>
          <View style={s.totalRow}><Text>Subtotal</Text><Text>{money(f.subtotal)}</Text></View>
          <View style={s.totalRow}><Text>Descuento global</Text><Text>{money(f.discount)}</Text></View>
          <View style={s.totalRow}><Text>Flete</Text><Text>{money(f.freight)}</Text></View>
          <View style={s.totalRow}><Text>Base imponible</Text><Text>{money(f.base)}</Text></View>
          <View style={s.totalRow}><Text>IGV 18% incluido</Text><Text>{money(f.tax)}</Text></View>
          <View style={s.total}><Text>Total</Text><Text>{money(doc.total)}</Text></View>
          <View style={s.totalRow}><Text>Saldo pendiente</Text><Text>{money(doc.balance)}</Text></View>
        </View>
        {doc.notes?.trim() && <View style={s.note}><Text style={s.bold}>Observaciones</Text><Text>{doc.notes}</Text></View>}
        <View style={[s.footer, ...(compact ? [s.compactFooter] : [])]} fixed>
          <Text>Registro interno · Sin validación electrónica SUNAT</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </PdfDocument>
  );
}

export function renderInvoicePdfBlob(state: State, doc: Document, format: InvoicePdfFormat) {
  return pdf(<InvoicePdf state={state} doc={doc} format={format} />).toBlob();
}

export async function downloadInvoicePdf(state: State, doc: Document, format: InvoicePdfFormat) {
  const blob = await renderInvoicePdfBlob(state, doc, format);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${doc.number.replace(/[^a-zA-Z0-9-_]/g, "-")}-${format}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
