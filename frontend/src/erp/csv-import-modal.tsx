import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import { Modal } from "./modal";
import { useErp } from "./store";
import { toast } from "./toast";
import {
  csvTemplate,
  importCsv,
  importFields,
  previewCsv,
  type DuplicateMode,
  type ImportKind,
  type ImportSummary,
} from "./csv-import";

const titles: Record<ImportKind, string> = {
  customers: "clientes", suppliers: "proveedores", products: "productos",
};
function downloadTemplate(kind: ImportKind) {
  const blob = new Blob([csvTemplate(kind)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `plantilla-${titles[kind]}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function CsvImportModal({ kind, onClose }: { kind: ImportKind; onClose: () => void }) {
  const { state, transact } = useErp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState("");
  const [mode, setMode] = useState<DuplicateMode>("skip");
  const [page, setPage] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const preview = useMemo(() => {
    if (!content) return { data: null, error: "" };
    try { return { data: previewCsv(state, kind, content), error: "" }; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : "CSV inválido." }; }
  }, [state, kind, content]);
  const fields = importFields[kind];
  const visible = preview.data?.rows.slice(page * 15, (page + 1) * 15) ?? [];
  const pages = Math.ceil((preview.data?.rows.length ?? 0) / 15);
  const eligible = (preview.data?.valid ?? 0) + (mode === "update" ? preview.data?.duplicate ?? 0 : 0);
  async function readFile(file?: File) {
    if (!file) return;
    setFileError(""); setContent(""); setName(""); setPage(0); setSummary(null);
    if (!/\.csv$/i.test(file.name)) { setFileError("Selecciona un archivo con extensión .csv."); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError("El archivo supera el límite de 10 MB."); return; }
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      setName(file.name); setContent(decoded);
    } catch { setFileError("No se pudo leer el archivo. Guárdalo con codificación UTF-8."); }
  }
  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault(); setDragging(false);
    void readFile(event.dataTransfer.files[0]);
  }
  function select(event: ChangeEvent<HTMLInputElement>) {
    void readFile(event.target.files?.[0]); event.target.value = "";
  }
  function confirm() {
    if (!content || !eligible || busy) return;
    setBusy(true); setFileError("");
    try {
      let result: ImportSummary | null = null;
      transact((draft) => { result = importCsv(draft, kind, content, mode); });
      setSummary(result);
      toast.success(`Importación de ${titles[kind]} completada.`);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "No se pudo guardar la importación.");
    } finally { setBusy(false); }
  }
  return (
    <Modal title={`Importar ${titles[kind]} mediante CSV`} subtitle="Mantenimiento · Catálogo compartido" onClose={onClose} wide className="csv-import-modal">
      {summary ? (
        <div className="csv-finish" role="status">
          <span className="csv-finish-icon"><FileSpreadsheet size={28} /></span>
          <h3>Importación finalizada</h3>
          <p>Los cambios ya están disponibles en los módulos del ERP y se guardaron en este navegador.</p>
          <div className="csv-stats">
            <span><strong>{summary.created}</strong> nuevos</span>
            <span><strong>{summary.updated}</strong> actualizados</span>
            <span><strong>{summary.skipped}</strong> omitidos</span>
            <span><strong>{summary.errors}</strong> con errores</span>
          </div>
          <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Finalizar</button></div>
        </div>
      ) : (
        <>
          <div className="csv-intro">
            <div><h3>1. Prepara el archivo</h3><p>Usa las columnas reales de {titles[kind]}. Conserva los documentos y códigos como texto para mantener sus ceros iniciales.</p></div>
            <button type="button" className="secondary-btn csv-template" onClick={() => downloadTemplate(kind)}>
              <Download size={16} /> Descargar plantilla CSV
            </button>
          </div>
          <p className="csv-help">Obligatorios: {fields.filter((f) => f.required).map((f) => f.key).join(", ")}. El código interno es opcional; si se incluye, se conserva. Fechas: AAAA-MM-DD. Estado: Activo o Inactivo.{kind === "products" ? " La categoría debe existir; el stock inicial siempre es cero." : ""}</p>
          <div className={`csv-drop ${dragging ? "is-dragging" : ""}`} role="button" tabIndex={0}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)} onDrop={drop}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.current?.click(); } }}>
            <UploadCloud size={28} />
            <strong>{name || "Arrastra tu CSV aquí o selecciónalo"}</strong>
            <small>UTF-8 · .csv · hasta 10 MB · comas o punto y coma</small>
          </div>
          <input ref={fileInput} type="file" accept=".csv,text/csv" className="csv-file-input" onChange={select} aria-label={`Seleccionar CSV de ${titles[kind]}`} />
          {(fileError || preview.error) && <p className="error" role="alert">{fileError || preview.error}</p>}
          {preview.data && <>
            <div className="csv-intro csv-preview-heading"><div><h3>2. Revisa los registros</h3><p>Las filas con errores se omitirán. Revisa los detalles antes de confirmar.</p></div></div>
            <div className="csv-stats" aria-label="Resultado de validación">
              <span><strong>{preview.data.valid}</strong> válidos</span>
              <span><strong>{preview.data.duplicate}</strong> duplicados</span>
              <span><strong>{preview.data.errors}</strong> con errores</span>
              <span><strong>{preview.data.rows.length}</strong> filas</span>
            </div>
            <label className="csv-policy">Si el registro ya existe:
              <select value={mode} onChange={(event) => setMode(event.target.value as DuplicateMode)}>
                <option value="skip">Omitir duplicados</option>
                <option value="update">Actualizar existentes (conservar código y vínculos)</option>
              </select>
            </label>
            <div className="csv-table-wrap"><table className="csv-table"><thead><tr><th>Fila</th><th>Estado</th><th>{kind === "products" ? "Producto" : "Nombre / razón social"}</th><th>{kind === "products" ? "SKU / Categoría" : "RUC / DNI"}</th><th>Detalle</th></tr></thead>
              <tbody>{visible.map((row) => <tr key={row.line}>
                <td>{row.line}</td><td><span className={`csv-badge csv-${row.status}`}>{row.status === "error" ? "Error" : row.status === "duplicate" ? mode === "skip" ? "Se omitirá" : "Se actualizará" : "Nuevo"}</span></td>
                <td>{row.values.name || "—"}</td><td>{kind === "products" ? [row.values.sku, row.values.category].filter(Boolean).join(" · ") || "—" : row.values.taxId || "—"}</td>
                <td>{Object.entries(row.errors).length ? Object.entries(row.errors).map(([key, message]) => <div className="csv-cell-error" key={key}><b>{fields.find((f) => f.key === key)?.label ?? "Fila"}:</b> {message}</div>) : row.matchId ? `Coincide con ${row.matchId}` : "Listo para importar"}</td>
              </tr>)}</tbody></table></div>
            {pages > 1 && <div className="csv-pages"><button type="button" className="secondary-btn" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</button><span>Página {page + 1} de {pages}</span><button type="button" className="secondary-btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Siguiente</button></div>}
          </>}
          <div className="modal-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button>
            <button type="button" className="btn" disabled={!eligible || busy} onClick={confirm}>{busy ? "Guardando…" : `Importar ${eligible} registro${eligible === 1 ? "" : "s"}`}</button>
          </div>
        </>
      )}
    </Modal>
  );
}
