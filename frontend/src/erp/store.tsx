import { ensurePurchasePayables } from "./purchase-payables";
import { clearOctober16Operations } from "./operation-cleanup";
import { expandCatalogData, upgradeLegacyDemo } from "./demo";
import { completeDashboardDemo } from "./dashboard-demo";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ensureAccessControl, initialState, type State } from "./model";
const KEY = "enterprisecloud-integrated-erp-v1";
const cleanSimulatedAudit = (state: State) => {
  if (state.auditCleanupVersion === 1) return false;
  state.audit = [];
  state.auditCleanupVersion = 1;
  return true;
};
// "Pendiente" from the interim workflow was saved without an explicit send.
const normalizeDraftQuotes = (state: State) => {
  let changed = false;
  for (const quote of state.quotes) if (quote.status === "Pendiente" && !quote.orderId) {
    quote.status = "Borrador";
    changed = true;
  }
  return changed;
};
type Store = {
  state: State;
  transact: (action: (draft: State) => void) => void;
  storageError: string;
};
const Context = createContext<Store | null>(null);
function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const state = JSON.parse(raw) as State;
      if (
        state.version === 1 &&
        Array.isArray(state.documents) &&
        Array.isArray(state.products) &&
        Array.isArray(state.movements) &&
        Array.isArray(state.customers) &&
        Array.isArray(state.suppliers) &&
        Array.isArray(state.warehouses) &&
        Array.isArray(state.quotes) &&
        Array.isArray(state.categories) &&
        Array.isArray(state.audit) &&
        state.stock &&
        state.settings
      ) {
        upgradeLegacyDemo(state);
        expandCatalogData(state);
        completeDashboardDemo(state);
        ensureAccessControl(state);
        cleanSimulatedAudit(state);
        clearOctober16Operations(state);
        ensurePurchasePayables(state);
        normalizeDraftQuotes(state);
        return state;
      }
      throw Error("Los datos guardados no tienen un formato compatible.");
    }
    const fresh = initialState();
    expandCatalogData(fresh);
    completeDashboardDemo(fresh);
    cleanSimulatedAudit(fresh);
    clearOctober16Operations(fresh);
    ensurePurchasePayables(fresh);
    return fresh;
  } catch (error) {
    throw Error(
      `No se pudieron cargar los datos: ${error instanceof Error ? error.message : "error desconocido"}`,
    );
  }
}
export function ErpProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(read);
  const [storageError, setStorageError] = useState("");
  const current = useRef(state);
  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY))
        localStorage.setItem(KEY, JSON.stringify(current.current));
      else {
        const durable = JSON.parse(localStorage.getItem(KEY)!) as State;
        const upgraded = upgradeLegacyDemo(durable);
        const catalogExpanded = expandCatalogData(durable);
        const accessUpgraded = ensureAccessControl(durable);
        const demoUpgraded = completeDashboardDemo(durable);
        const auditCleaned = cleanSimulatedAudit(durable);
        const operationsCleared = clearOctober16Operations(durable);
        if (operationsCleared) localStorage.setItem(`${KEY}-before-2026-10-16-cleanup`, localStorage.getItem(KEY)!);
        const payablesUpdated = ensurePurchasePayables(durable);
        const quotesUpdated = normalizeDraftQuotes(durable);
        if (demoUpgraded || upgraded || catalogExpanded || accessUpgraded || auditCleaned || operationsCleared || payablesUpdated || quotesUpdated) {
          localStorage.setItem(KEY, JSON.stringify(durable));
          current.current = durable;
          setState(durable);
        }
      }
    } catch {
      setStorageError(
        "El navegador no permite guardar datos. Habilita el almacenamiento para registrar operaciones.",
      );
    }
    const sync = () => {
      try {
        if (!localStorage.getItem(KEY)) return;
        const next = read();
        if (JSON.stringify(next) !== JSON.stringify(current.current)) {
          current.current = next;
          setState(next);
        }
        setStorageError("");
      } catch {
        setStorageError("No se pudieron sincronizar los datos guardados. Recarga para revisar el almacenamiento.");
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === KEY && event.newValue) sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  const transact = (action: (draft: State) => void) => {
    // Read the durable snapshot before every transaction to preserve edits from other tabs.
    const base = localStorage.getItem(KEY) ? read() : current.current;
    const draft = structuredClone(base);
    action(draft);
    ensurePurchasePayables(draft);
    try {
      localStorage.setItem(KEY, JSON.stringify(draft));
    } catch {
      setStorageError(
        "No se pudo guardar en este navegador. Libera espacio o habilita el almacenamiento antes de continuar.",
      );
      throw Error(
        "No se pudo guardar la operación. Los datos anteriores siguen intactos.",
      );
    }
    setStorageError("");
    current.current = draft;
    setState(draft);
  };
  return (
    <Context.Provider value={{ state, transact, storageError }}>
      {children}
    </Context.Provider>
  );
}
export function useErp() {
  const store = useContext(Context);
  if (!store) throw Error("ERP provider missing");
  return store;
}
