"use client";

import { useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { AlertCircle, ChevronDown, Columns3 } from "lucide-react";
import { FIELDS, type ColumnMapping, type FieldKey, type HeaderInfo } from "@/lib/import/fields";
import { cn } from "@/lib/utils";

/** Field → column picker with a live sample from the file under each choice. */
export function MappingPanel({
  header,
  mapping,
  onChange,
}: {
  header: HeaderInfo;
  mapping: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
}) {
  const missing = FIELDS.filter((f) => f.required && (mapping[f.key] === undefined || mapping[f.key] === null));
  const [open, setOpen] = useState(missing.length > 0);
  const [all, setAll] = useState(false);
  const mapped = Object.values(mapping).filter((v) => v !== null && v !== undefined).length + header.optionPairs.length * 2 + header.specColumns.length;
  const shown = FIELDS.filter((f) => all || f.essential || (mapping[f.key] !== undefined && mapping[f.key] !== null));

  const set = (key: FieldKey, col: number | null) => {
    const next: ColumnMapping = { ...mapping };
    if (col !== null) {
      for (const k of Object.keys(next) as FieldKey[]) if (next[k] === col) next[k] = null; // one field per column
    }
    next[key] = col;
    onChange(next);
  };

  return (
    <section className="rounded-[22px] border border-hairline bg-surface-solid">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/10 text-brand-500 dark:text-brand-300">
          <Columns3 className="h-[18px] w-[18px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14.5px] font-semibold text-content">Columns</span>
          <span className="block truncate text-[12.5px] text-muted">
            {missing.length
              ? `Choose the column for ${missing.map((f) => f.label.toLowerCase()).join(" and ")}`
              : `${mapped} of ${header.columns.length} columns recognised automatically`}
          </span>
        </span>
        {missing.length > 0 && <AlertCircle className="h-5 w-5 text-rose-500" />}
        <ChevronDown className={cn("h-5 w-5 text-faint transition-transform duration-300", open && "rotate-180")} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="overflow-hidden"
          >
            <div className="grid gap-x-4 gap-y-3 border-t border-hairline px-4 py-4 sm:grid-cols-2 sm:px-5 xl:grid-cols-3">
              {shown.map((f) => {
                const col = mapping[f.key];
                const info = col !== null && col !== undefined ? header.columns[col] : undefined;
                const bad = f.required && !info;
                return (
                  <label key={f.key} className="block min-w-0">
                    <span className="mb-1 flex items-center gap-1 text-[12px] font-semibold text-muted">
                      {f.label}
                      {f.required && <span className="text-rose-500">*</span>}
                    </span>
                    <span className="relative block">
                      <select
                        value={col ?? ""}
                        onChange={(e) => set(f.key, e.target.value === "" ? null : Number(e.target.value))}
                        className={cn(
                          "input !min-h-[2.5rem] cursor-pointer appearance-none !py-0 pr-8 text-[13.5px]",
                          bad && "!border-rose-500/60",
                          !info && "text-faint",
                        )}
                      >
                        <option value="">— Not used —</option>
                        {header.columns.map((c) => (
                          <option key={c.index} value={c.index}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                    </span>
                    <span className="mt-1 block truncate text-[11.5px] text-faint">
                      {info ? (info.sample ? `e.g. ${info.sample}` : "Column is empty") : f.hint ?? " "}
                    </span>
                  </label>
                );
              })}
            </div>
            {(header.optionPairs.length > 0 || header.specColumns.length > 0) && (
              <p className="border-t border-hairline px-4 py-3 text-[12.5px] text-muted sm:px-5">
                Also added as product specs:{" "}
                <span className="font-semibold text-content2">
                  {[...header.optionPairs.map((o) => o.label), ...header.specColumns.map((s) => s.label)].join(", ")}
                </span>
              </p>
            )}
            <div className="border-t border-hairline px-4 py-2.5 sm:px-5">
              <button type="button" onClick={() => setAll((v) => !v)} className="text-[13px] font-semibold text-brand-500 dark:text-brand-300">
                {all ? "Show fewer fields" : "Show all fields"}
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
}
