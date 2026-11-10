"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AlertTriangle, ArrowRightLeft, Check, ChevronDown, CircleSlash, Info, Sparkles, XCircle } from "lucide-react";
import type { Category } from "@/lib/types";
import type { PlannedRow } from "@/lib/import/plan";
import type { RowOverride } from "@/lib/import/rows";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/ProductImage";

export type RowFilter = "all" | "ready" | "update" | "issues" | "skipped";

export function matchesFilter(r: PlannedRow, f: RowFilter): boolean {
  if (r.action === "empty" || r.action === "merged") return false;
  switch (f) {
    case "ready":
      return r.action === "create";
    case "update":
      return r.action === "update";
    case "issues":
      return r.action === "error" || r.issues.some((i) => i.level === "warning");
    case "skipped":
      return r.action === "skip";
    default:
      return true;
  }
}

const STEP = 80;

export function ReviewTable({
  rows,
  categories,
  currency,
  onOverride,
}: {
  rows: PlannedRow[];
  categories: Category[];
  currency: string;
  onOverride: (index: number, patch: RowOverride) => void;
}) {
  const [limit, setLimit] = useState(STEP);
  const sentinel = useRef<HTMLLIElement>(null);

  useEffect(() => setLimit(STEP), [rows.length]);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || limit >= rows.length) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimit((l) => l + STEP), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [limit, rows.length]);

  if (rows.length === 0) {
    return <p className="px-4 py-14 text-center text-sm text-muted">Nothing in this view.</p>;
  }

  return (
    <ul className="divide-y divide-[color:var(--hairline)]">
      {rows.slice(0, limit).map((r) => (
        <Row key={r.draft.index} row={r} categories={categories} currency={currency} onOverride={onOverride} />
      ))}
      {limit < rows.length && (
        <li ref={sentinel} className="flex justify-center p-4">
          <button type="button" className="btn-quiet" onClick={() => setLimit((l) => l + STEP)}>
            Show more ({rows.length - limit} left)
          </button>
        </li>
      )}
    </ul>
  );
}

const ACTION_STYLE: Record<string, { label: string; cls: string }> = {
  create: { label: "New", cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300" },
  update: { label: "Update", cls: "bg-sky-500/12 text-sky-700 dark:text-sky-300" },
  skip: { label: "Skip", cls: "bg-surface-hover text-muted" },
  error: { label: "Can't import", cls: "bg-rose-500/12 text-rose-700 dark:text-rose-300" },
};

const SOURCE_LABEL: Record<string, string> = {
  auto: "Auto-sorted",
  default: "Default",
  file: "From file",
  new: "New category",
  manual: "",
  existing: "Kept",
};

const Row = memo(function Row({
  row: r,
  categories,
  currency,
  onOverride,
}: {
  row: PlannedRow;
  categories: Category[];
  currency: string;
  onOverride: (index: number, patch: RowOverride) => void;
}) {
  const p = r.draft.product;
  const errors = r.issues.filter((i) => i.level === "error");
  const warnings = r.issues.filter((i) => i.level === "warning");
  const infos = r.issues.filter((i) => i.level === "info");
  const excluded = r.action === "skip" && r.reason === "Excluded";
  const action = ACTION_STYLE[r.action] ?? ACTION_STYLE.skip;
  const idx = r.draft.index;

  const StatusIcon = errors.length ? XCircle : warnings.length ? AlertTriangle : r.action === "skip" ? CircleSlash : Check;
  const statusCls = errors.length
    ? "text-rose-500"
    : warnings.length
      ? "text-amber-500"
      : r.action === "skip"
        ? "text-faint"
        : "text-emerald-500";

  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-2 px-4 py-3 transition-colors md:grid-cols-[auto_minmax(0,1fr)_11rem_8.5rem_5.5rem_6.5rem] md:items-center",
        excluded && "opacity-55",
        errors.length > 0 && "bg-rose-500/[0.035]",
      )}
      style={{ contentVisibility: "auto", containIntrinsicSize: "76px" }}
    >
      {/* include toggle + status */}
      <div className="flex items-center gap-2 self-start md:self-center">
        <button
          type="button"
          role="checkbox"
          aria-checked={!excluded && r.action !== "error"}
          aria-label={excluded ? `Include row ${r.draft.rowNumber}` : `Exclude row ${r.draft.rowNumber}`}
          disabled={r.action === "error"}
          onClick={() => onOverride(idx, { exclude: !excluded })}
          className="grid h-9 w-9 place-items-center rounded-full disabled:opacity-40"
        >
          <span
            className={cn(
              "grid h-[20px] w-[20px] place-items-center rounded-[6px] border transition-all",
              !excluded && r.action !== "error" ? "border-brand-600 bg-brand-600 text-white" : "border-hairline-strong",
            )}
          >
            {!excluded && r.action !== "error" && <Check className="h-3 w-3" strokeWidth={3.5} />}
          </span>
        </button>
        <StatusIcon className={cn("h-[18px] w-[18px] shrink-0", statusCls)} aria-hidden />
      </div>

      {/* product */}
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-hairline bg-[var(--img-bg)]">
          <ProductImage src={p.images[0]} alt={p.name || "No name"} fit="contain" compact className="absolute inset-0" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="tabular shrink-0 text-[11px] font-semibold text-faint">#{r.draft.rowNumber}</span>
            <EditableText
              value={p.name}
              placeholder="Add a name"
              invalid={errors.some((e) => e.field === "name")}
              onCommit={(v) => onOverride(idx, { name: v })}
              className="text-[14px] font-semibold text-content"
              label={`Name for row ${r.draft.rowNumber}`}
            />
          </div>
          <p className="truncate text-[12px] text-faint">
            {[p.brand, p.sku, p.images.length > 1 ? `${p.images.length} images` : null, p.specs.length ? `${p.specs.length} specs` : null]
              .filter(Boolean)
              .join(" · ") || " "}
          </p>
          {(errors.length > 0 || warnings.length > 0 || r.changes.length > 0 || r.reason || infos.length > 0) && (
            <ul className="mt-1 space-y-0.5 text-[12px] leading-snug">
              {errors.map((e, i) => (
                <li key={`e${i}`} className="font-medium text-rose-600 dark:text-rose-400">
                  {e.message}
                </li>
              ))}
              {warnings.map((w, i) => (
                <li key={`w${i}`} className="text-amber-700 dark:text-amber-400">
                  {w.message}
                </li>
              ))}
              {r.action === "update" && r.changes.length > 0 && (
                <li className="flex items-start gap-1 text-sky-700 dark:text-sky-300">
                  <ArrowRightLeft className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Updates {r.match?.name ? <b className="font-semibold">“{r.match.name}”</b> : "existing product"}:{" "}
                    {r.changes.slice(0, 3).map((c) => `${c.label} ${c.from} → ${c.to}`).join(" · ")}
                    {r.changes.length > 3 && ` · +${r.changes.length - 3} more`}
                  </span>
                </li>
              )}
              {r.reason && r.action === "skip" && <li className="text-muted">{r.reason}</li>}
              {infos.slice(0, 1).map((n, i) => (
                <li key={`i${i}`} className="flex items-center gap-1 text-faint">
                  <Info className="h-3 w-3" /> {n.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* category */}
      <div className="col-start-2 md:col-start-auto">
        <label className="relative block">
          <span className="sr-only">Category for row {r.draft.rowNumber}</span>
          <select
            value={r.category.source === "new" ? "__new" : r.category.categoryId ?? ""}
            onChange={(e) => onOverride(idx, { categoryId: e.target.value || undefined })}
            className={cn(
              "input !min-h-[2.25rem] cursor-pointer appearance-none !rounded-lg !py-0 !pl-2.5 pr-7 text-[13px]",
              !r.category.categoryId && r.category.source !== "new" && "!border-rose-500/60 text-rose-500",
            )}
          >
            {r.category.source === "new" && <option value="__new">{r.category.newName} (new)</option>}
            {!r.category.categoryId && r.category.source !== "new" && <option value="">Choose…</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
        </label>
        {SOURCE_LABEL[r.category.source] && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-faint">
            {r.category.source === "auto" && <Sparkles className="h-3 w-3 text-brand-400" />}
            {SOURCE_LABEL[r.category.source]}
          </span>
        )}
      </div>

      {/* price + stock (side by side on mobile) */}
      <div className="col-start-2 flex items-center gap-2 md:contents">
        <div className="md:text-right">
          <EditableText
            value={p.price !== null ? String(p.price) : r.draft.raw.price}
            display={p.price !== null ? `${currency}${p.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : r.draft.raw.price || "Add price"}
            invalid={errors.some((e) => e.field === "price")}
            onCommit={(v) => onOverride(idx, { price: v })}
            inputMode="decimal"
            className="tabular text-[14px] font-semibold text-content md:justify-end"
            label={`Price for row ${r.draft.rowNumber}`}
          />
          {p.salePrice !== undefined && p.price !== null && (
            <span className="tabular block text-[11.5px] text-deal-600 dark:text-deal-400">
              Deal {currency}
              {p.salePrice.toLocaleString("en-US")}
            </span>
          )}
        </div>
        <div className="md:text-center">
          <EditableText
            value={p.quantity !== null ? String(p.quantity) : r.draft.raw.quantity}
            display={p.quantity !== null ? `${p.quantity} in stock` : r.draft.raw.quantity || (r.action === "update" ? "Keep" : "0 in stock")}
            invalid={errors.some((e) => e.field === "quantity")}
            onCommit={(v) => onOverride(idx, { quantity: v })}
            inputMode="numeric"
            className="tabular text-[13px] text-content2 md:justify-center"
            label={`Stock for row ${r.draft.rowNumber}`}
          />
        </div>
      </div>

      {/* action */}
      <div className="col-start-2 md:col-start-auto md:text-right">
        <span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold", action.cls)}>
          {excluded ? "Excluded" : action.label}
        </span>
      </div>
    </li>
  );
});

/** Looks like text; becomes an input on click. Commits on blur/Enter, Esc cancels. */
function EditableText({
  value,
  display,
  placeholder,
  invalid,
  onCommit,
  className,
  inputMode,
  label,
}: {
  value: string;
  display?: string;
  placeholder?: string;
  invalid?: boolean;
  onCommit: (v: string) => void;
  className?: string;
  inputMode?: "decimal" | "numeric";
  label: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={draft}
        inputMode={inputMode}
        aria-label={label}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (draft !== value) onCommit(draft);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="input !min-h-[2.1rem] w-full !rounded-lg !px-2.5 text-[13.5px]"
      />
    );
  }
  const text = display ?? value;
  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`${label}: ${text || "empty"}. Click to edit`}
      className={cn(
        "flex w-full min-w-0 items-center rounded-md text-left underline decoration-transparent decoration-dashed underline-offset-4 transition hover:decoration-current",
        invalid && "text-rose-600 decoration-rose-400 dark:text-rose-400",
        className,
      )}
    >
      <span className="truncate">{text || <span className="italic text-faint">{placeholder ?? "—"}</span>}</span>
    </button>
  );
}
