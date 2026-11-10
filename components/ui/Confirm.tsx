"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Promise-based confirmation sheet (replaces window.confirm):
 *   if (await confirm({ title, message, tone: "danger" })) …
 * Focus moves to the safe action, Esc cancels, Enter confirms.
 */

interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<((o: ConfirmOptions) => Promise<boolean>) | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

  const confirm = useCallback(
    (o: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        lastFocus.current = document.activeElement as HTMLElement | null;
        setPending({ ...o, resolve });
      }),
    [],
  );

  const close = useCallback(
    (ok: boolean) => {
      pending?.resolve(ok);
      setPending(null);
      requestAnimationFrame(() => lastFocus.current?.focus?.());
    },
    [pending],
  );

  useEffect(() => {
    if (!pending) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pending, close]);

  const danger = pending?.tone === "danger";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {pending && (
          <m.div
            className="fixed inset-0 z-[500] flex items-end justify-center p-3 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => close(false)} aria-hidden />
            <m.div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="wz-confirm-title"
              aria-describedby={pending.message ? "wz-confirm-msg" : undefined}
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98, transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
              className="relative w-full max-w-sm rounded-[26px] glass-strong p-6 text-center shadow-lift"
            >
              <span
                className={cn(
                  "mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl",
                  danger ? "bg-rose-500/12 text-rose-500" : "bg-brand-500/12 text-brand-400",
                )}
              >
                <AlertTriangle className="h-6 w-6" />
              </span>
              <h2 id="wz-confirm-title" className="text-lg font-semibold tracking-tight text-content">
                {pending.title}
              </h2>
              {pending.message && (
                <p id="wz-confirm-msg" className="mt-1.5 text-sm leading-relaxed text-muted">
                  {pending.message}
                </p>
              )}
              <div className="mt-6 grid grid-cols-2 gap-2.5">
                <button ref={cancelRef} type="button" className="btn-ghost" onClick={() => close(false)}>
                  {pending.cancelLabel ?? "Cancel"}
                </button>
                <button
                  type="button"
                  className={danger ? "btn-danger" : "btn-primary"}
                  onClick={() => close(true)}
                >
                  {pending.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
