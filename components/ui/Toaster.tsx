"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * iOS-style notification banners. Non-blocking, announced politely to
 * screen readers, never steal focus, optional action (e.g. "Undo").
 */

type Tone = "success" | "error" | "info";

export interface ToastOptions {
  title: string;
  description?: string;
  tone?: Tone;
  action?: { label: string; onClick: () => void | Promise<void> };
  /** ms; actions get longer by default */
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<((t: ToastOptions) => void) | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <Toaster>");
  return ctx;
}

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-rose-500" />,
  info: <Info className="h-5 w-5 text-brand-400" />,
};

export function Toaster({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (t: ToastOptions) => {
      const id = ++seq.current;
      setItems((list) => [...list.slice(-2), { ...t, id }]);
      window.setTimeout(() => dismiss(id), t.duration ?? (t.action ? 9000 : 4200));
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[max(1rem,env(safe-area-inset-bottom))] z-[400] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6"
      >
        <AnimatePresence initial={false}>
          {items.map((t) => (
            <m.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97, transition: { duration: 0.16 } }}
              transition={{ type: "spring", stiffness: 420, damping: 34 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-2xl glass-strong p-3.5 pr-2 shadow-lift"
              role={t.tone === "error" ? "alert" : "status"}
            >
              <span className="mt-0.5 shrink-0">{ICONS[t.tone ?? "success"]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-content">{t.title}</p>
                {t.description && <p className="mt-0.5 text-[13px] leading-snug text-muted">{t.description}</p>}
              </div>
              {t.action && (
                <button
                  type="button"
                  onClick={async () => {
                    dismiss(t.id);
                    await t.action?.onClick();
                  }}
                  className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-500 transition hover:bg-brand-500/10 dark:text-brand-300"
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full text-faint transition hover:bg-surface-hover hover:text-content")}
              >
                <X className="h-4 w-4" />
              </button>
            </m.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
