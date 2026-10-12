import { useState } from "react";
import { Eye, Download } from "lucide-react";
import { useErp } from "./store";
import { money, dateLabel } from "./model";
import { Modal, Records, DocDetail, exportCsv } from "./ui";
import { SupplierDetailsTrigger } from "./suppliers";

export function PayableDetails({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { state } = useErp();
  const [order, setOrder] = useState(false);
  const account = state.payables?.find((p) => p.id === id);
  const doc = state.documents.find((d) => d.id === account?.documentId);
  if (!account) return null;
  return (
    <Modal
      title={`Cuenta por pagar · ${doc?.number ?? account.id}`}
      onClose={onClose}
      wide
    >
      <div className="detail-meta">
        <div>
          <small>Proveedor</small>
          <SupplierDetailsTrigger supplierId={account.supplierId}>
            {state.suppliers.find((s) => s.id === account.supplierId)?.name ??
              account.supplierId}
          </SupplierDetailsTrigger>
        </div>
        <div>
          <small>Registro</small>
          <b>
            {account.id}
            {account.demo ? " · DEMO" : ""}
          </b>
        </div>
        <div>
          <small>Fecha</small>
          <b>{dateLabel(account.date)}</b>
        </div>
        <div>
          <small>Vencimiento</small>
          <b>{dateLabel(account.dueDate)}</b>
        </div>
        <div>
          <small>Importe total</small>
          <b>{money(account.total)}</b>
        </div>
        <div>
          <small>Saldo pendiente</small>
          <b>{money(account.balance)}</b>
        </div>
      </div>
      <h3>Pagos registrados</h3>
      <Records
        headers={["Fecha", "Medio", "Referencia", "Importe"]}
        rows={account.payments.map((p) => ({
          id: p.id,
          search: `${p.date} ${p.reference}`,
          cells: [dateLabel(p.date), p.method, p.reference, money(p.amount)],
        }))}
        empty="No hay pagos registrados."
      />
      <div className="modal-actions">
        {doc && (
          <button className="secondary-btn" onClick={() => setOrder(true)}>
            Ver orden de compra
          </button>
        )}
        <button className="btn" onClick={onClose}>
          Cerrar cuenta
        </button>
      </div>
      {order && doc && <DocDetail doc={doc} onClose={() => setOrder(false)} />}
    </Modal>
  );
}
export function PayablesPanel() {
  const { state } = useErp();
  const [detail, setDetail] = useState("");
  const accounts = state.payables ?? [];
  if (!state.payables) return null;
  const name = (id: string) =>
    state.suppliers.find((s) => s.id === id)?.name ?? id;
  const number = (id: string) =>
    state.documents.find((d) => d.id === id)?.number ?? id;
  const headers = [
    "Registro",
    "Orden de compra",
    "Proveedor",
    "Vencimiento",
    "Importe",
    "Saldo",
    "Acciones",
  ];
  return (
    <section style={{ marginTop: 28 }}>
      <div className="hd">
        <div>
          <h2>Cuentas por pagar</h2>
          <p className="muted">
            Deuda registrada a proveedores. Los ejemplos se identifican como
            DEMO.
          </p>
        </div>
        <button
          className="secondary-btn"
          onClick={() =>
            exportCsv(
              "cuentas-por-pagar",
              headers.slice(0, -1),
              accounts.map((a) => [
                a.id,
                number(a.documentId),
                name(a.supplierId),
                a.dueDate,
                a.total,
                a.balance,
              ]),
            )
          }
        >
          <Download size={14} />
          Exportar cuentas por pagar
        </button>
      </div>
      <Records
        sortable
        headers={headers}
        rows={accounts.map((a) => ({
          id: a.id,
          search: `${a.id} ${number(a.documentId)} ${name(a.supplierId)}`,
          sortValues: [
            a.id,
            number(a.documentId),
            name(a.supplierId),
            a.dueDate,
            a.total,
            a.balance,
          ],
          cells: [
            <>
              {a.id}
              {a.demo && <small>DEMO · deuda simulada</small>}
            </>,
            number(a.documentId),
            <SupplierDetailsTrigger supplierId={a.supplierId}>
              {name(a.supplierId)}
            </SupplierDetailsTrigger>,
            dateLabel(a.dueDate),
            money(a.total),
            money(a.balance),
            <button
              className="secondary-btn"
              aria-label={`Ver cuenta ${a.id}`}
              onClick={() => setDetail(a.id)}
            >
              <Eye size={14} />
              Ver detalle
            </button>,
          ],
        }))}
      />
      {detail && <PayableDetails id={detail} onClose={() => setDetail("")} />}
    </section>
  );
}
