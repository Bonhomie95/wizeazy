"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import type { StoreSettings } from "@/lib/types";
import { BoltSpinner } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useConfirm } from "@/components/ui/Confirm";

export function SettingsPanel() {
  const { settings, updateSettings, refresh } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [resetting, setResetting] = useState(false);

  const commit = async (key: keyof StoreSettings, value: string) => {
    await updateSettings({ [key]: value });
  };

  const field = (key: keyof StoreSettings, label: string, placeholder = "", hint = "", inputMode?: "numeric") => (
    <SettingsField
      key={key}
      label={label}
      placeholder={placeholder}
      hint={hint}
      inputMode={inputMode}
      value={settings[key]}
      onCommit={(next) => commit(key, next)}
      onError={(msg) => toast({ tone: "error", title: "Couldn't save", description: msg })}
    />
  );

  const resetStore = async () => {
    const ok = await confirm({
      title: "Reset everything to the demo data?",
      message: "All products, categories and settings will be replaced. This can't be undone — export your products first if you need them.",
      confirmLabel: "Reset store",
      tone: "danger",
    });
    if (!ok) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reset store data.");
      }
      await refresh();
      toast({ title: "Store reset", description: "Demo products and settings restored." });
    } catch (err) {
      toast({ tone: "error", title: "Reset failed", description: err instanceof Error ? err.message : undefined });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-[24px] border border-hairline bg-surface-solid p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold text-content">Store details</h3>
        <p className="mt-1 text-[13px] text-muted">Changes save automatically when you leave a field.</p>
        <div className="mt-5 grid gap-4">
          {field("storeName", "Store name", "Wizeazy")}
          {field("tagline", "Tagline", "Short store description", "Shown under the headline on your storefront.")}
          <div className="grid grid-cols-2 gap-4">
            {field("currencySymbol", "Currency symbol", "₦")}
            {field("currency", "Currency code", "NGN")}
          </div>
        </div>
      </section>

      <section className="rounded-[24px] border border-hairline bg-surface-solid p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold text-content">Contact channels</h3>
        <p className="mt-1 text-[13px] text-muted">These power every “Buy now” and contact button.</p>
        <div className="mt-5 grid gap-4">
          {field("whatsapp", "WhatsApp number", "2348012345678", "International format, digits only (no + or spaces).", "numeric")}
          {field("instagram", "Instagram handle", "wizeazy", "Without the @.")}
          {field("snapchat", "Snapchat handle", "wizeazy", "Without the @.")}
          {field("telegram", "Telegram handle", "wizeazy", "Without the @.")}
        </div>
      </section>

      <section className="rounded-[24px] border border-rose-500/25 bg-rose-500/[0.04] p-5 sm:p-6 lg:col-span-2">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-[15px] font-semibold text-content">Reset store data</h3>
            <p className="mt-1 text-[13px] text-muted">Restore the original demo products, categories and settings.</p>
          </div>
          <Button variant="danger" onClick={resetStore} loading={resetting} loadingText="Resetting…" icon={<RotateCcw className="h-4 w-4" />}>
            Reset to defaults
          </Button>
        </div>
      </section>
    </div>
  );
}

function SettingsField({
  label,
  placeholder,
  hint,
  value,
  inputMode,
  onCommit,
  onError,
}: {
  label: string;
  placeholder: string;
  hint: string;
  value: string;
  inputMode?: "numeric";
  onCommit: (next: string) => Promise<void>;
  onError: (msg?: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const id = `set-${label.replace(/\W+/g, "-").toLowerCase()}`;

  useEffect(() => setDraft(value), [value]);

  const commit = async () => {
    if (draft === value) return;
    setState("saving");
    try {
      await onCommit(draft);
      setState("saved");
      setTimeout(() => setState("idle"), 1600);
    } catch (err) {
      setState("idle");
      setDraft(value);
      onError(err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <AnimatePresence>
          {state !== "idle" && (
            <m.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mb-1.5 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600 dark:text-emerald-400"
            >
              {state === "saving" ? <BoltSpinner className="!h-3.5 !w-3.5 text-brand-400" /> : <Check className="h-3.5 w-3.5" />}
              {state === "saving" ? "Saving" : "Saved"}
            </m.span>
          )}
        </AnimatePresence>
      </div>
      <input
        id={id}
        className="input"
        value={draft}
        inputMode={inputMode}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
      />
      {hint && <p className="mt-1.5 text-[12px] text-faint">{hint}</p>}
    </div>
  );
}
