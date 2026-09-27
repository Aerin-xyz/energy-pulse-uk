import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
export function AtlasInspector({
  title,
  kind,
  onClose,
  children,
}: {
  title: string;
  kind: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const [mobile, setMobile] = useState(
    () => matchMedia("(max-width:900px)").matches,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const mq = matchMedia("(max-width:900px)");
    const changed = () => setMobile(mq.matches);
    mq.addEventListener("change", changed);
    return () => mq.removeEventListener("change", changed);
  }, []);
  useEffect(() => {
    if (mobile && !dialog.current?.open) dialog.current?.showModal();
    if (mobile || kind !== "search")
      heading.current?.focus({ preventScroll: true });
  }, [kind, mobile]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const fit = () =>
      dialog.current?.style.setProperty(
        "--sheet-height",
        `${viewport?.height || innerHeight}px`,
      );
    fit();
    viewport?.addEventListener("resize", fit);
    return () => viewport?.removeEventListener("resize", fit);
  }, [mobile]);
  const content = (
    <>
      <header className="atlas-inspector-header">
        <h2 ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <button
          className="atlas-close"
          onClick={onClose}
          aria-label={kind === "detail" ? "Close map detail" : `Close ${kind}`}
        >
          <X size={20} />
        </button>
      </header>
      <div className="atlas-inspector-body">{children}</div>
    </>
  );
  const escape = (e: React.KeyboardEvent) => {
    if (mobile && e.key === "Tab") {
      const nodes = [
        ...dialog.current!.querySelectorAll<HTMLElement>(
          'button:not(:disabled),a[href],input,select,summary,[tabindex="0"]',
        ),
      ].filter((n) => n.getClientRects().length);
      const first = nodes[0],
        last = nodes.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === heading.current)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      onClose();
    }
  };
  return mobile ? (
    createPortal(
      <dialog
        ref={dialog}
        className="atlas-inspector atlas-sheet"
        data-panel={kind}
        aria-label={kind === "detail" ? "Selected map evidence" : title}
        onKeyDown={escape}
        onCancel={(e) => {
          e.preventDefault();
          onClose();
        }}
      >
        {content}
      </dialog>,
      document.body,
    )
  ) : (
    <aside
      className="atlas-inspector atlas-map-detail"
      data-panel={kind}
      role="region"
      aria-label={kind === "detail" ? "Selected map evidence" : title}
      onKeyDown={escape}
    >
      {content}
    </aside>
  );
}
