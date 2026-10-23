import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import { Package, FileText } from "lucide-react";

const layers: HTMLElement[] = [];
const DismissContext = createContext<(() => void) | null>(null);
export function ModalDismissButton({
  onClick,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const dismiss = useContext(DismissContext);
  return (
    <button
      {...props}
      type="button"
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) dismiss?.();
      }}
    >
      {children}
    </button>
  );
}
let originalOverflow = "";
let applicationRoot: HTMLElement | null = null;
let originalInert = false;
const syncLayers = () =>
  layers.forEach((node, i) => {
    node.inert = i !== layers.length - 1;
    node.style.zIndex = String(100 + i * 10);
  });
export function Modal({
  title,
  children,
  onClose,
  wide = false,
  className = "",
  subtitle,
  icon,
  hideHeader = false,
  dismissible = true,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
  className?: string;
  subtitle?: string;
  icon?: ReactNode;
  hideHeader?: boolean;
  dismissible?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);
  const canDismiss = useRef(dismissible);
  canDismiss.current = dismissible;
  const requestClose = () => {
    if (!canDismiss.current) return;
    if (timer.current) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches)
      return close.current();
    setClosing(true);
    timer.current = setTimeout(() => close.current(), 180);
  };
  useEffect(() => {
    const node = root.current!;
    const previous = document.activeElement as HTMLElement | null;
    if (!layers.length) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      applicationRoot = document.getElementById("root");
      if (applicationRoot) {
        originalInert = applicationRoot.inert;
        applicationRoot.inert = true;
      }
    }
    layers.push(node);
    syncLayers();
    const candidates = [
      ...node.querySelectorAll<HTMLElement>(
        "[data-autofocus],input:not(:disabled),select:not(:disabled),button:not(:disabled)",
      ),
    ].filter((element) => element.offsetParent !== null);
    (
      candidates.find((element) => element.hasAttribute("data-autofocus")) ??
      candidates[0]
    )?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && layers.at(-1) === node) {
        event.preventDefault();
        event.stopImmediatePropagation();
        requestClose();
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      const wasTop = layers.at(-1) === node;
      layers.splice(layers.indexOf(node), 1);
      syncLayers();
      if (!layers.length) {
        document.body.style.overflow = originalOverflow;
        if (applicationRoot) applicationRoot.inert = originalInert;
        applicationRoot = null;
      }
      document.removeEventListener("keydown", escape);
      if (timer.current) clearTimeout(timer.current);
      if (wasTop && previous?.isConnected) previous.focus();
    };
  }, []);
  return createPortal(
    <div
      ref={root}
      className={`modal-backdrop ${closing ? "is-closing" : ""}`}
      onMouseDown={(e) => e.target === e.currentTarget && requestClose()}
    >
      <section
        className={`modal-card ${wide ? "modal-wide" : ""} ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key !== "Tab") return;
          e.stopPropagation();
          const nodes = [
            ...e.currentTarget.querySelectorAll<HTMLElement>(
              'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
            ),
          ].filter((n) => n.offsetParent !== null && n.tabIndex !== -1);
          const first = nodes[0],
            last = nodes.at(-1);
          if (
            e.shiftKey &&
            (document.activeElement === first ||
              !nodes.includes(document.activeElement as HTMLElement))
          ) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }}
      >
        {!hideHeader && (
          <div className="modal-head">
            <div className="modal-heading">
              <span className="modal-heading-icon">
                {icon ?? (/cotización|orden de venta|^Editar COT/i.test(title) ? (
                  <FileText size={20} strokeWidth={1.65} />
                ) : /producto/i.test(title) ? (
                  <Package size={20} strokeWidth={1.65} />
                ) : (
                  <Icon
                    name={
                      /proveedor/i.test(title)
                        ? "building"
                        : /compra/i.test(title)
                          ? "purchase"
                          : /cotización/i.test(title)
                            ? "quote"
                            : /cobro/i.test(title)
                              ? "wallet"
                              : "invoice"
                    }
                    size={20}
                  />
                ))}
              </span>
              <div>
                <span className="section-eyebrow">ENTERPRISECLOUD</span>
                <h2>{title}</h2>
                {subtitle && <p className="supplier-subtitle">{subtitle}</p>}
              </div>
            </div>
            <button
              type="button"
              className="close-btn"
              aria-label="Cerrar"
              onClick={requestClose}
            >
              <Icon name="close" size={17} />
            </button>
          </div>
        )}
        <div className="modal-content">
          <DismissContext.Provider value={requestClose}>
            {children}
          </DismissContext.Provider>
        </div>
      </section>
    </div>,
    document.body,
  );
}
