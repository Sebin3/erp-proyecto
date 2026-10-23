import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { CircleAlert, CircleCheck, Copy, FileSpreadsheet, Rows3, UploadCloud } from "lucide-react";
import { Modal } from "./modal";
import { useErp } from "./store";
import { toast } from "./toast";
import { importMasterCsv, masterDisplayValue, previewMasterCsv, type MasterImportPreview } from "./master-csv-import";
import type { DuplicateMode, ImportSummary } from "./csv-import";

type Result = ImportSummary & { kind: string; title: string };

export function MasterCsvImportModal({ onClose }: { onClose: () => void }) {
  const { state, transact } = useErp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [fileError, setFileError] = useState("");
  const [mode, setMode] = useState<DuplicateMode>("skip");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<Result | null>(null);
  const preview = useMemo<{ data: MasterImportPreview | null; error: string }>(() => {
    if (!content) return { data: null, error: "" };
    try { return { data: previewMasterCsv(state, content), error: "" }; }
    catch (error) { return { data: null, error: error instanceof Error ? error.message : "CSV inválido." }; }
  }, [content, state]);
  const visible = preview.data?.rows.slice(0, 15) ?? [];
  const eligible = (preview.data?.valid ?? 0) + (mode === "update" ? preview.data?.duplicate ?? 0 : 0);

  async function readFile(file?: File) {
    if (!file) return;
    setFileError(""); setContent(""); setName(""); setSummary(null);
    if (!/\.csv$/i.test(file.name)) { setFileError("Selecciona un archivo con extensión .csv."); return; }
    if (file.size > 10 * 1024 * 1024) { setFileError("El archivo supera el límite de 10 MB."); return; }
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      setName(file.name); setContent(decoded);
    } catch { setFileError("No se pudo leer el archivo. Guárdalo con codificación UTF-8."); }
  }
  function drop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files[0]); }
  function select(event: ChangeEvent<HTMLInputElement>) { void readFile(event.target.files?.[0]); event.target.value = ""; }
  function confirm() {
    if (!content || !eligible || busy) return;
    setBusy(true); setFileError("");
    try {
      let result!: Result;
      transact((draft) => { result = importMasterCsv(draft, content, mode); });
      setSummary(result);
      toast.success(`Importación de ${result.title} completada.`);
    } catch (error) { setFileError(error instanceof Error ? error.message : "No se pudo guardar la importación."); }
    finally { setBusy(false); }
  }
  return (
    <Modal title="Importar catálogo CSV" subtitle="Maestros · detección automática del submódulo" icon={<FileSpreadsheet size={20} />} onClose={onClose} wide className="csv-import-modal">
      {summary ? (
        <div className="csv-finish" role="status">
          <span className="csv-finish-icon"><FileSpreadsheet size={28} /></span>
          <h3>Importación finalizada</h3>
          <p>{summary.title} fue actualizado. Los datos ya se encuentran disponibles en su submódulo correspondiente.</p>
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
            <div><span className="csv-step">PASO 01 · ARCHIVO</span><h3>Selecciona un CSV de Maestros</h3><p>El sistema identificará automáticamente el submódulo por sus encabezados y guardará cada registro en el catálogo correcto.</p></div>
          </div>
          <p className="csv-help">Admite las plantillas de los 17 submódulos. Usa UTF-8, conserva los códigos como texto y carga primero las dependencias como empresas, sucursales, categorías, unidades, monedas y productos.</p>
          <div className={`csv-drop ${dragging ? "is-dragging" : ""}`} role="button" tabIndex={0}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={drop}
            onClick={() => fileInput.current?.click()}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.current?.click(); } }}>
            <span className="csv-drop-icon"><UploadCloud size={25} /></span>
            <strong>{name || "Arrastra tu CSV aquí o selecciónalo"}</strong>
            <small>UTF-8 · .csv · hasta 10 MB · comas o punto y coma</small>
          </div>
          <input ref={fileInput} type="file" accept=".csv,text/csv" className="csv-file-input" onChange={select} aria-label="Seleccionar CSV de Maestros" />
          {(fileError || preview.error) && <p className="error" role="alert">{fileError || preview.error}</p>}
          {preview.data && <>
            <div className="csv-intro csv-preview-heading"><div><span className="csv-step">PASO 02 · VALIDACIÓN</span><h3>{preview.data.title}</h3><p>Se detectó automáticamente este submódulo. Revisa las filas antes de guardar.</p></div></div>
            <div className="csv-stats" aria-label="Resultado de validación">
              <span><CircleCheck size={16} /><strong>{preview.data.valid}</strong> válidos</span>
              <span><Copy size={16} /><strong>{preview.data.duplicate}</strong> duplicados</span>
              <span><CircleAlert size={16} /><strong>{preview.data.errors}</strong> con errores</span>
              <span><Rows3 size={16} /><strong>{preview.data.rows.length}</strong> filas</span>
            </div>
            <label className="csv-policy">Si el registro ya existe:
              <select value={mode} onChange={(event) => setMode(event.target.value as DuplicateMode)}><option value="skip">Omitir duplicados</option><option value="update">Actualizar existentes (conservar vínculos)</option></select>
            </label>
            <div className="csv-table-wrap"><table className="csv-table"><thead><tr><th>Fila</th><th>Estado</th><th>Registro</th><th>Identificador</th><th>Detalle</th></tr></thead><tbody>{visible.map((row) => <tr key={row.line}>
              <td>{row.line}</td><td><span className={`csv-badge csv-${row.status}`}>{row.status === "error" ? "Error" : row.status === "duplicate" ? mode === "skip" ? "Se omitirá" : "Se actualizará" : "Nuevo"}</span></td>
              <td>{masterDisplayValue(row)}</td><td>{row.values.taxId || row.values.document || row.values.id || row.values.currencyId || "—"}</td>
              <td>{Object.entries(row.errors).length ? Object.entries(row.errors).map(([key, message]) => <div className="csv-cell-error" key={key}><b>{key === "_fila" ? "Fila" : key}:</b> {message}</div>) : row.matchId ? `Coincide con ${row.matchId}` : "Listo para importar"}</td>
            </tr>)}</tbody></table></div>
            {preview.data.rows.length > 15 && <p className="csv-help">Se muestran las primeras 15 filas. El resultado considera las {preview.data.rows.length} filas del archivo.</p>}
          </>}
          <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button><button type="button" className="btn" disabled={!eligible || busy} onClick={confirm}>{busy ? "Guardando…" : `Importar ${eligible} registro${eligible === 1 ? "" : "s"}`}</button></div>
        </>
      )}
    </Modal>
  );
}
