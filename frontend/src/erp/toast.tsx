import {
  createToastHost,
  createToastQueue,
  Easing,
  motionOf,
  prefersReducedMotion,
  splitChars,
  TOAST_POSITIONS,
} from "super-beautiful-toast/core";
import type { CSSProperties, ReactNode, ComponentType } from "react";
import { createPortal } from "react-dom";
import {
  createContext,
  createElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import "super-beautiful-toast/style.css";
import "./toast.css";

export type ToastPosition =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export type ToastVariant =
  | "success"
  | "error"
  | "warning"
  | "info"
  | "neutral"
  | (string & {});

export type ToastComponentProps = {
  onClose: () => void;
  [key: string]: unknown;
};

export type ToastOptions = {
  message?: string;
  icon?: string | null;
  variant?: ToastVariant;
  position?: ToastPosition;
  duration?: number;
  origin?: HTMLElement | null;
  originStyle?: {
    background?: string;
    boxShadow?: string;
    borderRadius?: string;
  } | null;
  component?: ComponentType<ToastComponentProps> | null;
  props?: Record<string, unknown>;
  tint?: { bg: string; fg: string } | null;
  closable?: boolean;
  key?: string | null;
};

type CoreQueue = ReturnType<typeof createToastQueue>;
type ToastItem = ReturnType<CoreQueue["getItems"]>[number];
type ToastHost = ReturnType<typeof createToastHost>;

const queue = createToastQueue();
const DEFAULT_HOST_OPTIONS: Record<string, unknown> = {};
const ToastQueueContext = createContext<CoreQueue>(queue);

function createToastApi(target: CoreQueue) {
  const show = (options: ToastOptions = {}) =>
    target.show(options as Parameters<CoreQueue["show"]>[0]);
  const variant = (name: ToastVariant) =>
    (message: string, options: ToastOptions = {}) =>
      show({ ...options, message, variant: name });

  return {
    show,
    success: variant("success"),
    error: variant("error"),
    warning: variant("warning"),
    info: variant("info"),
    neutral: variant("neutral"),
    dismiss: (id: number) => target.dismiss(id),
    dismissAll: () => target.dismissAll(),
    configure: (settings: Partial<ReturnType<CoreQueue["getSettings"]>>) =>
      target.configure(settings),
    queue: target,
  };
}

export const toast = createToastApi(queue);

export function useToast() {
  return createToastApi(useContext(ToastQueueContext));
}

const BUILT_IN_ICONS: Record<string, string> = {
  check_circle:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.2 14.4-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7Z",
  error:
    "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-2h2v2Zm0-4h-2V7h2v6Z",
  info: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm1 15h-2v-6h2v6Zm0-8h-2V7h2v2Z",
  warning:
    "M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z",
};

function ToastIcon({
  name,
  component,
}: {
  name: string | null;
  component?: ComponentType<{ className?: string; name: string }> | null;
}) {
  if (!name || name === "check_circle") return null;
  if (component) {
    return createElement(component, {
      className: "sbt-icon",
      name,
    });
  }
  const path = BUILT_IN_ICONS[name];
  if (!path) return <span className="sbt-icon" aria-hidden="true">{name}</span>;
  return (
    <svg
      className="sbt-icon"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}

function ToastMessage({
  item,
  closeLabel,
  stagger,
  iconComponent,
  onClose,
}: {
  item: ToastItem;
  closeLabel: string;
  stagger: boolean;
  iconComponent?: ComponentType<{ className?: string; name: string }> | null;
  onClose: () => void;
}) {
  const messageRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = messageRef.current;
    if (
      !stagger ||
      !element ||
      !item.message ||
      item.message.length > 64 ||
      prefersReducedMotion()
    ) {
      return;
    }

    const split = splitChars(element);
    let pending = split.chars.length;
    split.chars.forEach((character: HTMLElement, index: number) => {
      const motion = motionOf(character);
      motion.set({ opacity: 0, yPercent: 40, blur: 4 });
      motion.to(
        { opacity: 1, yPercent: 0, blur: 0 },
        {
          duration: 0.4,
          ease: Easing.easeOutCubic,
          delay: 0.225 + index * 0.02,
          onComplete() {
            pending -= 1;
            if (pending <= 0) split.revert();
          },
        },
      );
    });

    return () => split.revert();
  }, [item.id, item.message, stagger]);

  return (
    <div className="sbt-content">
      <ToastIcon name={item.icon} component={iconComponent} />
      <span ref={messageRef} className="sbt-message">
        {item.message}
      </span>
      {item.closable && (
        <button
          type="button"
          className="sbt-close"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
            <path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19l5.6-5.6 5.6 5.6 1.4-1.4-5.6-5.6L19 6.4Z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function ToastItemView({
  item,
  queue: itemQueue,
  host,
  closeLabel,
  stagger,
  iconComponent,
}: {
  item: ToastItem;
  queue: CoreQueue;
  host: ToastHost;
  closeLabel: string;
  stagger: boolean;
  iconComponent?: ComponentType<{ className?: string; name: string }> | null;
}) {
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    host.bind(element, item.id);
    host.enter(element, item.id);
    return () => host.unbind(item.id);
  }, [host, item.id]);

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element || !item.closing) return;
    host.leave(element, item.id);
  }, [host, item.closing, item.id]);

  const CustomContent = item.component as ComponentType<ToastComponentProps> | null;
  const tintStyle = item.tint
    ? ({
        "--sbt-toast-bg": item.tint.bg,
        "--sbt-toast-fg": item.tint.fg,
      } as CSSProperties)
    : undefined;

  return (
    <div
      ref={elementRef}
      className="sbt-toast"
      data-sbt-id={item.id}
      aria-hidden={item.closing ? "true" : undefined}
    >
      <div
        className={`sbt-shell sbt-variant-${item.variant}`}
        style={tintStyle}
        data-sbt-shell
      >
        <div className="sbt-body" data-sbt-body>
          {CustomContent ? (
            createElement(CustomContent, {
              ...(item.props as Record<string, unknown>),
              onClose: () => itemQueue.dismiss(item.id),
            })
          ) : (
            <ToastMessage
              item={item}
              closeLabel={closeLabel}
              stagger={stagger}
              iconComponent={iconComponent}
              onClose={() => itemQueue.dismiss(item.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export type ToastHostProps = {
  queue?: CoreQueue;
  options?: Record<string, unknown>;
  positions?: ToastPosition[];
  iconComponent?: ComponentType<{ className?: string; name: string }> | null;
  teleportTo?: string | HTMLElement;
  closeLabel?: string;
  stagger?: boolean;
  children?: ReactNode;
};

export function ToastHost({
  queue: providedQueue = queue,
  options = DEFAULT_HOST_OPTIONS,
  positions = TOAST_POSITIONS as ToastPosition[],
  iconComponent = null,
  teleportTo = "body",
  closeLabel = "Cerrar notificación",
  stagger = true,
}: ToastHostProps) {
  const items = useSyncExternalStore(
    providedQueue.subscribe,
    providedQueue.getItems,
    providedQueue.getItems,
  ) as ToastItem[];
  const host = useMemo(
    () => createToastHost({ queue: providedQueue, options }),
    [providedQueue, options],
  );

  useLayoutEffect(() => () => host.destroy(), [host]);

  if (typeof document === "undefined") return null;
  const target =
    typeof teleportTo === "string"
      ? document.querySelector(teleportTo)
      : teleportTo;
  if (!target) return null;

  const grouped = new Map<ToastPosition, ToastItem[]>();
  positions.forEach((position) => grouped.set(position, []));
  items.forEach((item) => {
    const position = positions.includes(item.position as ToastPosition)
      ? (item.position as ToastPosition)
      : positions[0];
    if (position) grouped.get(position)?.push(item);
  });

  return createPortal(
    <ToastQueueContext.Provider value={providedQueue}>
      <div className="sbt-layer">
        <div className="sbt-announcer" aria-live="polite" aria-atomic="true">
          {items.find((item) => item.variant !== "error" && !item.closing)?.message ?? ""}
        </div>
        <div className="sbt-announcer" aria-live="assertive" aria-atomic="true">
          {items.find((item) => item.variant === "error" && !item.closing)?.message ?? ""}
        </div>
        {positions.map((position) => (
          <div key={position} className={`sbt-stack sbt-${position}`}>
            {[...(grouped.get(position) ?? [])].reverse().map((item) => (
              <ToastItemView
                key={item.id}
                item={item}
                queue={providedQueue}
                host={host}
                closeLabel={closeLabel}
                stagger={stagger}
                iconComponent={iconComponent}
              />
            ))}
          </div>
        ))}
      </div>
    </ToastQueueContext.Provider>,
    target,
  );
}
