import { upgradeLegacyDemo } from "./demo";
import { completeDashboardDemo } from "./dashboard-demo";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { initialState, type State } from "./model";
const KEY = "enterprisecloud-integrated-erp-v1";
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
        completeDashboardDemo(state);
        return state;
      }
      throw Error("Los datos guardados no tienen un formato compatible.");
    }
    const fresh = initialState();
    completeDashboardDemo(fresh);
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
        if (completeDashboardDemo(durable) || upgraded) {
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
    const sync = (event: StorageEvent) => {
      if (event.key !== KEY || !event.newValue) return;
      try {
        const next = read();
        current.current = next;
        setState(next);
        setStorageError("");
      } catch {
        setStorageError(
          "Otra pestaña cambió los datos a un formato incompatible. Recarga para revisar el almacenamiento.",
        );
      }
    };
    addEventListener("storage", sync);
    return () => removeEventListener("storage", sync);
  }, []);
  const transact = (action: (draft: State) => void) => {
    // Read the durable snapshot before every transaction to preserve edits from other tabs.
    const base = localStorage.getItem(KEY) ? read() : current.current;
    const draft = structuredClone(base);
    action(draft);
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
