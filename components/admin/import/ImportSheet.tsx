"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ClipboardPaste,
  Download,
  FileSpreadsheet,
  FileWarning,
  Layers,
  RotateCcw,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ACCEPT_ATTR, readPastedText, readSpreadsheet } from "@/lib/import/read";
import { ImportFileError, type Workbook } from "@/lib/import/types";
import { detectHeader, type ColumnMapping, type HeaderInfo } from "@/lib/import/fields";
import { buildDrafts, type RowOverride } from "@/lib/import/rows";
import { unknownCategoryNames, guessCategory } from "@/lib/import/categorize";
import { buildPlan, planToOps, undoOps, type BatchOp, type DuplicateMode } from "@/lib/import/plan";
import { downloadIssuesCsv, downloadTemplate } from "@/lib/export";
import { BrandLoader } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Segmented, Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toaster";
import { useConfirm } from "@/components/ui/Confirm";
import { MappingPanel } from "./MappingPanel";
import { ReviewTable, matchesFilter, type RowFilter } from "./ReviewTable";

type Step = "upload" | "review" | "importing" | "done";

interface ImportResult {
  createdIds: string[];
  previous: Product[];
  createdCategoryIds: string[];
  added: number;
  updated: number;
  skipped: number;
  failed: { rowNumber: number; name: string; error: string }[];
  stopped: boolean;
}

const CHUNK = 100;
const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Upload" },
  { key: "review", label: "Review" },
  { key: "done", label: "Import" },
];

export function ImportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const store = useStore();
  const { products, categories, settings, addCategory, deleteCategory, batchProducts, refresh } = store;
  const toast = useToast();
  const confirm = useConfirm();
  const reduce = useReducedMotion();

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<{ name: string; size: number } | null>(null);
  const [workbook, setWorkbook] = useState<Workbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [header, setHeader] = useState<HeaderInfo | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [overrides, setOverrides] = useState<Record<number, RowOverride>>({});
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("update");
  const [autoDetect, setAutoDetect] = useState(true);
  const [createMissing, setCreateMissing] = useState(false);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | null>(null);
  const [filter, setFilter] = useState<RowFilter>("all");
  const [reading, setReading] = useState(false);
  const [readError, setReadError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [result, setResult] = useState<ImportResult | null>(null);
  const [undoing, setUndoing] = useState(false);
  const stopRef = useRef(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // snapshot the catalogue at open time so matching is against fresh data
  useEffect(() => {
    if (open) refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // sensible default category: "Accessories" for an electronics store, else the first one
  useEffect(() => {
    if (defaultCategoryId && categories.some((c) => c.id === defaultCategoryId)) return;
    const acc = guessCategory("phone case", categories);
    setDefaultCategoryId(acc?.id ?? categories[0]?.id ?? null);
  }, [categories, defaultCategoryId]);

  const sheet = workbook?.sheets[sheetIndex];

  const drafts = useMemo(
    () => (sheet && header ? buildDrafts(sheet, header, mapping, overrides) : []),
    [sheet, header, mapping, overrides],
  );
  const plan = useMemo(
    () =>
      buildPlan(drafts, products, categories, { duplicateMode, autoDetect, createMissing, defaultCategoryId }, overrides, settings.currencySymbol),
    [drafts, products, categories, duplicateMode, autoDetect, createMissing, defaultCategoryId, overrides, settings.currencySymbol],
  );
  const unknownCats = useMemo(() => unknownCategoryNames(drafts.map((d) => d.product), categories), [drafts, categories]);
  const defaultCount = plan.rows.filter((r) => r.category.source === "default" && (r.action === "create" || r.action === "update")).length;
  const autoCount = plan.rows.filter((r) => r.category.source === "auto" && r.action === "create").length;
  const toImport = plan.summary.create + plan.summary.update;
  const visibleRows = useMemo(() => plan.rows.filter((r) => matchesFilter(r, filter)), [plan.rows, filter]);

  /* ---------------- file intake ---------------- */

  const loadWorkbook = useCallback((wb: Workbook, meta: { name: string; size: number }) => {
    const withData = wb.sheets.findIndex((s) => !s.hidden && s.rows.some((r) => r.some((c) => c !== null && c !== "")));
    const idx = withData === -1 ? 0 : withData;
    const target = wb.sheets[idx];
    if (!target || target.rows.length < 2) {
      throw new ImportFileError("This sheet has no product rows. Make sure the first row has column names and the rows below have products.");
    }
    const h = detectHeader(target.rows);
    setWorkbook(wb);
    setSheetIndex(idx);
    setHeader(h);
    setMapping(h.mapping);
    setOverrides({});
    setFilter("all");
    setFile(meta);
    setStep("review");
  }, []);

  const handleFile = useCallback(
    async (f: File) => {
      setReadError(null);
      setReading(true);
      try {
        const buf = await f.arrayBuffer();
        const wb = await readSpreadsheet(buf, f.name);
        loadWorkbook(wb, { name: f.name, size: f.size });
      } catch (err) {
        setReadError(err instanceof ImportFileError ? err.message : "We couldn't read that file. Save it as .xlsx or .csv and try again.");
        if (!(err instanceof ImportFileError)) console.error(err);
      } finally {
        setReading(false);
      }
    },
    [loadWorkbook],
  );

  const handlePaste = useCallback(
    (text: string) => {
      setReadError(null);
      try {
        loadWorkbook(readPastedText(text), { name: "Pasted cells", size: text.length });
      } catch (err) {
        setReadError(err instanceof ImportFileError ? err.message : "That paste doesn't look like a table.");
      }
    },
    [loadWorkbook],
  );

  const changeSheet = (i: number) => {
    if (!workbook) return;
    const h = detectHeader(workbook.sheets[i].rows);
    setSheetIndex(i);
    setHeader(h);
    setMapping(h.mapping);
    setOverrides({});
  };

  const onOverride = useCallback((index: number, patch: RowOverride) => {
    setOverrides((o) => ({ ...o, [index]: { ...o[index], ...patch } }));
  }, []);

  /* ---------------- run / undo ---------------- */

  const runImport = async () => {
    stopRef.current = false;
    setStep("importing");
    const createdCategoryIds: string[] = [];
    const catMap = new Map<string, string>();
    const res: ImportResult = { createdIds: [], previous: [], createdCategoryIds, added: 0, updated: 0, skipped: plan.summary.skip, failed: [], stopped: false };
    const byIndex = new Map(plan.rows.map((r) => [r.draft.index, r]));

    try {
      if (plan.summary.newCategories.length) {
        setProgress({ done: 0, total: toImport, label: "Creating categories…" });
        for (const name of plan.summary.newCategories) {
          const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (existing) {
            catMap.set(name.toLowerCase(), existing.id);
            continue;
          }
          const c = await addCategory(name, "Tag");
          catMap.set(name.toLowerCase(), c.id);
          createdCategoryIds.push(c.id);
        }
      }

      const ops = planToOps(plan, catMap);
      const before = new Map(products.map((p) => [p.id, p]));
      setProgress({ done: 0, total: ops.length, label: "Saving products…" });

      for (let i = 0; i < ops.length; i += CHUNK) {
        if (stopRef.current) {
          res.stopped = true;
          break;
        }
        const chunk = ops.slice(i, i + CHUNK);
        let results;
        try {
          results = await batchProducts(chunk);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Network error";
          chunk.forEach((op) => {
            const row = byIndex.get(op.ref);
            res.failed.push({ rowNumber: row?.draft.rowNumber ?? 0, name: row?.draft.product.name ?? "", error: msg });
          });
          setProgress((p) => ({ ...p, done: Math.min(p.total, i + chunk.length) }));
          continue;
        }
        results.forEach((r, k) => {
          const op = chunk[k];
          const row = byIndex.get(op.ref);
          if (!r.ok) {
            res.failed.push({ rowNumber: row?.draft.rowNumber ?? 0, name: row?.draft.product.name ?? "", error: r.error });
            return;
          }
          if (op.op === "create") {
            res.createdIds.push(r.id);
            res.added++;
          } else if (op.op === "update") {
            const prev = before.get(op.id);
            if (prev) res.previous.push(prev);
            res.updated++;
          }
        });
        setProgress((p) => ({ ...p, done: Math.min(p.total, i + chunk.length) }));
      }
    } catch (err) {
      toast({ tone: "error", title: "Import stopped", description: err instanceof Error ? err.message : undefined });
    }

    setResult(res);
    setStep("done");
  };

  const undo = async (r: ImportResult) => {
    const ops: BatchOp[] = undoOps(r.createdIds, r.previous);
    let failed = 0;
    for (let i = 0; i < ops.length; i += 200) {
      try {
        const results = await batchProducts(ops.slice(i, i + 200));
        failed += results.filter((x) => !x.ok).length;
      } catch {
        failed += Math.min(200, ops.length - i);
      }
    }
    for (const id of r.createdCategoryIds) {
      await deleteCategory(id).catch(() => {});
    }
    await refresh().catch(() => {});
    toast({
      tone: failed ? "error" : "success",
      title: failed ? "Undo partly failed" : "Import undone",
      description: failed ? `${failed} change(s) couldn't be reverted.` : `${r.added} removed · ${r.updated} restored`,
    });
  };

  const undoNow = async () => {
    if (!result) return;
    const ok = await confirm({
      title: "Undo this import?",
      message: `${result.added} new product(s) will be removed and ${result.updated} updated product(s) restored.`,
      confirmLabel: "Undo import",
      tone: "danger",
    });
    if (!ok) return;
    setUndoing(true);
    await undo(result);
    setUndoing(false);
    onClose();
  };

  const finish = () => {
    if (result && (result.added || result.updated)) {
      const r = result;
      toast({
        title: `Imported ${r.added + r.updated} product${r.added + r.updated === 1 ? "" : "s"}`,
        description: [r.added && `${r.added} added`, r.updated && `${r.updated} updated`].filter(Boolean).join(" · "),
        action: { label: "Undo", onClick: () => undo(r) },
        duration: 10000,
      });
    }
    onClose();
  };

  /* ---------------- sheet chrome ---------------- */

  const dirty = step === "review";
  const requestClose = useCallback(async () => {
    if (step === "importing") return;
    if (step === "done") return finish();
    if (dirty) {
      const ok = await confirm({
        title: "Discard this import?",
        message: "Nothing has been imported yet. You can upload the file again any time.",
        confirmLabel: "Discard",
        tone: "danger",
      });
      if (!ok) return;
    }
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, dirty, confirm, onClose, result]);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => sheetRef.current?.focus());
    return () => {
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector('[role="alertdialog"]')) requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, requestClose]);

  // paste cells straight from Excel / Google Sheets while on the upload step
  useEffect(() => {
    if (!open || step !== "upload") return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const text = e.clipboardData?.getData("text/plain") ?? "";
      if (text.includes("\t") || text.split("\n").length > 2) {
        e.preventDefault();
        handlePaste(text);
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [open, step, handlePaste]);

  const stepIndex = step === "upload" ? 0 : step === "review" ? 1 : 2;

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={requestClose} aria-hidden />
          <m.div
            ref={sheetRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
            initial={{ opacity: 0, y: reduce ? 0 : 60, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.985, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative flex h-[94dvh] w-full max-w-6xl flex-col overflow-hidden rounded-t-[30px] border border-hairline bg-page shadow-lift outline-none sm:h-[min(92dvh,920px)] sm:rounded-[30px]"
          >
            {/* Header */}
            <header className="flex items-center gap-4 border-b border-hairline px-4 py-3 sm:px-6 sm:py-4">
              <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-500/10 text-brand-500 dark:text-brand-300 sm:grid">
                <FileSpreadsheet className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="import-title" className="text-[17px] font-semibold tracking-tight text-content">
                  Import products
                </h2>
                <ol className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold" aria-label="Progress">
                  {STEPS.map((s, i) => (
                    <li key={s.key} className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          "relative rounded-full px-2 py-0.5 transition-colors duration-300",
                          i === stepIndex ? "text-page" : i < stepIndex ? "text-content2" : "text-faint",
                        )}
                        aria-current={i === stepIndex ? "step" : undefined}
                      >
                        {i === stepIndex && (
                          <m.span layoutId="import-step" className="absolute inset-0 rounded-full bg-content" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
                        )}
                        <span className="relative">{s.label}</span>
                      </span>
                      {i < STEPS.length - 1 && <span className="h-px w-3 bg-hairline-strong" aria-hidden />}
                    </li>
                  ))}
                </ol>
              </div>
              <button type="button" onClick={requestClose} className="icon-btn" aria-label="Close importer" disabled={step === "importing"}>
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Body */}
            <div className="relative min-h-0 flex-1">
              <AnimatePresence mode="wait" initial={false}>
                <m.div
                  key={step}
                  initial={{ opacity: 0, x: reduce ? 0 : 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduce ? 0 : -16, transition: { duration: 0.14 } }}
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  className="absolute inset-0 overflow-y-auto"
                >
                  {step === "upload" && (
                    <UploadStep reading={reading} error={readError} onFile={handleFile} onPaste={handlePaste} />
                  )}

                  {step === "review" && workbook && header && sheet && (
                    <div className="space-y-4 p-4 sm:p-6">
                      {/* file chip */}
                      <div className="flex flex-wrap items-center gap-3 rounded-[22px] border border-hairline bg-surface-solid p-3 pl-4">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-content">{file?.name}</p>
                          <p className="text-[12px] text-faint">
                            {workbook.format.toUpperCase()} · {file && file.size > 1024 ? `${(file.size / 1024).toFixed(file.size > 1024 * 1024 ? 0 : 1)} KB` : `${file?.size ?? 0} bytes`} ·{" "}
                            {plan.summary.rows} rows{sheet.truncated ? " (first 10,000)" : ""}
                          </p>
                        </div>
                        {workbook.sheets.length > 1 && (
                          <select
                            value={sheetIndex}
                            onChange={(e) => changeSheet(Number(e.target.value))}
                            className="input !min-h-[2.4rem] !w-auto cursor-pointer !rounded-full !py-0 text-[13px] font-semibold"
                            aria-label="Sheet"
                          >
                            {workbook.sheets.map((s, i) => (
                              <option key={i} value={i}>
                                {s.name}
                                {s.hidden ? " (hidden)" : ""}
                              </option>
                            ))}
                          </select>
                        )}
                        <Button variant="quiet" className="!min-h-[2.4rem] !px-3 text-[13px]" onClick={() => setStep("upload")} icon={<RotateCcw className="h-4 w-4" />}>
                          Change file
                        </Button>
                      </div>

                      {/* summary tiles */}
                      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                        <SummaryTile label="Ready to add" value={plan.summary.create} tone="emerald" active={filter === "ready"} onClick={() => setFilter(filter === "ready" ? "all" : "ready")} />
                        <SummaryTile label="Will update" value={plan.summary.update} tone="sky" active={filter === "update"} onClick={() => setFilter(filter === "update" ? "all" : "update")} />
                        <SummaryTile
                          label="Need a look"
                          value={plan.summary.error + plan.summary.withWarnings}
                          sub={plan.summary.error ? `${plan.summary.error} can't import` : undefined}
                          tone="amber"
                          active={filter === "issues"}
                          onClick={() => setFilter(filter === "issues" ? "all" : "issues")}
                        />
                        <SummaryTile label="Skipped" value={plan.summary.skip} tone="zinc" active={filter === "skipped"} onClick={() => setFilter(filter === "skipped" ? "all" : "skipped")} />
                      </div>

                      {/* options */}
                      <section className="grid gap-4 rounded-[22px] border border-hairline bg-surface-solid p-4 sm:p-5 lg:grid-cols-3">
                        <div>
                          <p className="text-[13.5px] font-semibold text-content">If a product already exists</p>
                          <p className="mb-2.5 text-[12px] text-muted">Matched by ID, SKU or exact name.</p>
                          <Segmented
                            label="Existing products"
                            value={duplicateMode}
                            onChange={setDuplicateMode}
                            options={[
                              { value: "update", label: "Update" },
                              { value: "skip", label: "Skip" },
                              { value: "create", label: "Add new" },
                            ]}
                          />
                        </div>
                        <label className="flex cursor-pointer items-start justify-between gap-3">
                          <span>
                            <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-content">
                              <Sparkles className="h-4 w-4 text-brand-400" /> Auto-sort into categories
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-muted">
                              Reads product names — “iPad case” goes to Accessories. {autoDetect && autoCount > 0 && <b className="font-semibold text-content2">{autoCount} sorted.</b>}
                            </span>
                          </span>
                          <Switch checked={autoDetect} onChange={setAutoDetect} label="Auto-sort into categories" />
                        </label>
                        <div>
                          <p className="text-[13.5px] font-semibold text-content">Default category</p>
                          <p className="mb-2.5 text-[12px] text-muted">
                            {defaultCount ? `${defaultCount} row${defaultCount === 1 ? "" : "s"} will go here.` : "For rows without a category."}
                          </p>
                          <select
                            value={defaultCategoryId ?? ""}
                            onChange={(e) => setDefaultCategoryId(e.target.value || null)}
                            className="input !min-h-[2.5rem] cursor-pointer !py-0 text-[13.5px]"
                            aria-label="Default category"
                          >
                            <option value="">None — flag as error</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {unknownCats.length > 0 && (
                          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl border border-dashed border-hairline-strong p-3.5 lg:col-span-3">
                            <span>
                              <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-content">
                                <Layers className="h-4 w-4 text-brand-400" /> Create {unknownCats.length} new categor{unknownCats.length === 1 ? "y" : "ies"} from the file
                              </span>
                              <span className="mt-0.5 block text-[12px] text-muted">
                                {unknownCats.slice(0, 6).join(", ")}
                                {unknownCats.length > 6 ? ` +${unknownCats.length - 6} more` : ""} — otherwise those rows use auto-sort or the default.
                              </span>
                            </span>
                            <Switch checked={createMissing} onChange={setCreateMissing} label="Create new categories" />
                          </label>
                        )}
                      </section>

                      <MappingPanel header={header} mapping={mapping} onChange={(next) => { setMapping(next); setOverrides({}); }} />

                      {/* rows */}
                      <section className="overflow-hidden rounded-[22px] border border-hairline bg-surface-solid">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3">
                          <Segmented
                            label="Filter rows"
                            value={filter}
                            onChange={setFilter}
                            className="w-full sm:w-auto"
                            options={[
                              { value: "all", label: "All" },
                              { value: "ready", label: "New" },
                              { value: "update", label: "Updates" },
                              { value: "issues", label: "Issues" },
                              { value: "skipped", label: "Skipped" },
                            ]}
                          />
                          <p className="text-[12px] text-faint">Click a name, price or stock to fix it here.</p>
                        </div>
                        <div className="hidden grid-cols-[auto_minmax(0,1fr)_11rem_8.5rem_5.5rem_6.5rem] gap-x-3 border-b border-hairline px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint md:grid">
                          <span className="w-[62px]" />
                          <span>Product</span>
                          <span>Category</span>
                          <span className="text-right">Price</span>
                          <span className="text-center">Stock</span>
                          <span className="text-right">Action</span>
                        </div>
                        <ReviewTable rows={visibleRows} categories={categories} currency={settings.currencySymbol} onOverride={onOverride} />
                      </section>
                    </div>
                  )}

                  {step === "importing" && (
                    <div className="grid h-full place-items-center p-6">
                      <div className="w-full max-w-sm text-center">
                        <BrandLoader size={64} label="Importing" />
                        <p className="mt-6 text-[17px] font-semibold text-content">{progress.label || "Importing…"}</p>
                        <p className="tabular mt-1 text-sm text-muted">
                          {progress.done} of {progress.total}
                        </p>
                        <div className="mt-5 h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
                          <div
                            className="h-full origin-left rounded-full bg-gradient-to-r from-brand-500 to-cyber-400 transition-transform duration-500 ease-spring"
                            style={{ transform: `scaleX(${progress.total ? progress.done / progress.total : 0})` }}
                          />
                        </div>
                        <Button variant="quiet" className="mt-6" onClick={() => (stopRef.current = true)}>
                          Stop after this batch
                        </Button>
                      </div>
                    </div>
                  )}

                  {step === "done" && result && (
                    <DoneStep
                      result={result}
                      errorRows={plan.rows
                        .filter((r) => r.action === "error")
                        .map((r) => ({
                          rowNumber: r.draft.rowNumber,
                          name: r.draft.product.name,
                          problems: r.issues.filter((i) => i.level === "error").map((i) => i.message).join("; "),
                        }))}
                    />
                  )}
                </m.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            {step === "review" && (
              <footer className="flex items-center justify-between gap-3 border-t border-hairline bg-page/90 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
                <p className="hidden text-[12.5px] text-muted sm:block">
                  {plan.summary.error > 0 ? `${plan.summary.error} row${plan.summary.error === 1 ? "" : "s"} with errors will be skipped.` : "Everything looks good."}
                </p>
                <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                  <Button variant="ghost" onClick={() => setStep("upload")} icon={<ArrowLeft className="h-4 w-4" />}>
                    Back
                  </Button>
                  <Button onClick={runImport} disabled={toImport === 0}>
                    Import {toImport} product{toImport === 1 ? "" : "s"}
                  </Button>
                </div>
              </footer>
            )}
            {step === "done" && result && (
              <footer className="flex items-center justify-end gap-2 border-t border-hairline px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                {(result.added > 0 || result.updated > 0) && (
                  <Button variant="ghost" onClick={undoNow} loading={undoing} loadingText="Undoing…" icon={<RotateCcw className="h-4 w-4" />}>
                    Undo import
                  </Button>
                )}
                <Button onClick={finish} disabled={undoing}>
                  Done
                </Button>
              </footer>
            )}
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

/* ---------------- steps & pieces ---------------- */

function UploadStep({
  reading,
  error,
  onFile,
  onPaste,
}: {
  reading: boolean;
  error: string | null;
  onFile: (f: File) => void;
  onPaste: (text: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const depth = useRef(0);

  const pick = () => inputRef.current?.click();

  return (
    <div className="mx-auto flex min-h-full max-w-3xl flex-col justify-center p-4 sm:p-8">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a spreadsheet: drop a file here or press Enter to choose one"
        onClick={pick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          depth.current++;
          setDrag(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => {
          depth.current = Math.max(0, depth.current - 1);
          if (depth.current === 0) setDrag(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          depth.current = 0;
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) onFile(f);
        }}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center overflow-hidden rounded-[30px] border-2 border-dashed px-6 py-12 text-center transition-all duration-500 ease-spring focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/25 sm:py-16",
          drag ? "scale-[1.01] border-brand-500 bg-brand-500/[0.07] shadow-glow" : "border-hairline-strong bg-surface-solid hover:border-brand-400/60",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_0%,rgba(124,58,237,0.12),transparent)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <m.span
          animate={drag ? { y: -8, scale: 1.08, rotate: -4 } : { y: 0, scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          className="relative grid h-20 w-20 place-items-center rounded-[26px] bg-gradient-to-br from-brand-400 to-brand-700 text-white shadow-glow"
        >
          <UploadCloud className="h-9 w-9" strokeWidth={1.6} />
        </m.span>
        <h3 className="relative mt-6 text-[22px] font-semibold tracking-[-0.02em] text-content">
          {drag ? "Drop to upload" : "Drop your spreadsheet here"}
        </h3>
        <p className="relative mt-1.5 text-[14.5px] text-muted">CSV, XLS or XLSX · up to 15 MB · thousands of rows</p>
        <span className="btn-primary relative mt-6 pointer-events-none">
          <FileSpreadsheet className="h-4 w-4" /> Choose file
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />

        <AnimatePresence>
          {reading && (
            <m.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 grid place-items-center bg-surface-solid/90 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center gap-4">
                <BrandLoader size={52} label="Reading file" />
                <p className="text-sm font-semibold text-content">Reading your file…</p>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {error && (
          <m.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mt-4 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/[0.07] px-4 py-3"
          >
            <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-rose-500" />
            <p className="text-[14px] text-content2">{error}</p>
          </m.div>
        )}
      </AnimatePresence>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={downloadTemplate}
          className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-solid p-4 text-left transition hover:border-hairline-strong hover:bg-surface-2"
        >
          <Download className="h-5 w-5 shrink-0 text-brand-500 dark:text-brand-300" />
          <span>
            <span className="block text-[14px] font-semibold text-content">Download template</span>
            <span className="block text-[12.5px] text-muted">A ready-made CSV with the right columns.</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => setPasteOpen((v) => !v)}
          aria-expanded={pasteOpen}
          className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-solid p-4 text-left transition hover:border-hairline-strong hover:bg-surface-2"
        >
          <ClipboardPaste className="h-5 w-5 shrink-0 text-brand-500 dark:text-brand-300" />
          <span>
            <span className="block text-[14px] font-semibold text-content">Paste from Sheets / Excel</span>
            <span className="block text-[12.5px] text-muted">Copy the cells (with headers) and paste — or press ⌘/Ctrl+V.</span>
          </span>
        </button>
      </div>

      <AnimatePresence>
        {pasteOpen && (
          <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-2xl border border-hairline bg-surface-solid p-3">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={"Product Title\tSelling Price\tStock Qty\niPhone 13 case\t16200\t4"}
                className="input min-h-[120px] resize-y font-mono text-[12.5px]"
                aria-label="Pasted cells"
              />
              <div className="mt-2 flex justify-end">
                <Button onClick={() => onPaste(pasteText)} disabled={!pasteText.trim()}>
                  Continue
                </Button>
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>

      <p className="mt-6 text-center text-[12.5px] leading-relaxed text-faint">
        Columns like <b className="font-semibold text-muted">Product Title, Selling Price, Stock Qty, Collections, Featured Brand, Main Image</b> are recognised automatically —
        including Shopify &amp; WooCommerce exports. Your file is read in your browser; only the products you approve are sent.
      </p>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  sub,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  sub?: string;
  tone: "emerald" | "sky" | "amber" | "zinc";
  active: boolean;
  onClick: () => void;
}) {
  const dot = { emerald: "bg-emerald-500", sky: "bg-sky-500", amber: "bg-amber-500", zinc: "bg-zinc-400" }[tone];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-[20px] border bg-surface-solid p-3.5 text-left transition-all duration-300 ease-spring active:scale-[0.98]",
        active ? "border-brand-400/60 shadow-glow" : "border-hairline hover:border-hairline-strong",
      )}
    >
      <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-muted">
        <span className={cn("h-2 w-2 rounded-full", dot)} />
        {label}
      </span>
      <m.span key={value} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="tabular mt-1 block text-[26px] font-semibold tracking-[-0.03em] text-content">
        {value}
      </m.span>
      {sub && <span className="block text-[11.5px] font-medium text-rose-500">{sub}</span>}
    </button>
  );
}

function DoneStep({
  result,
  errorRows,
}: {
  result: ImportResult;
  errorRows: { rowNumber: number; name: string; problems: string }[];
}) {
  const failedRows = [...errorRows, ...result.failed.map((f) => ({ rowNumber: f.rowNumber, name: f.name, problems: f.error }))];
  const ok = result.failed.length === 0 && !result.stopped;
  return (
    <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center p-6 text-center">
      <SuccessMark ok={ok} />
      <h3 className="mt-6 text-[26px] font-semibold tracking-[-0.03em] text-content">
        {result.stopped ? "Import stopped" : ok ? "Import complete" : "Imported with a few issues"}
      </h3>
      <p className="mt-1.5 text-[15px] text-muted">
        Your storefront is already showing the {result.added + result.updated ? "changes" : "results"}.
      </p>
      <dl className="mt-7 grid w-full grid-cols-2 gap-2.5 sm:grid-cols-4">
        {[
          { k: "Added", v: result.added, c: "text-emerald-600 dark:text-emerald-400" },
          { k: "Updated", v: result.updated, c: "text-sky-600 dark:text-sky-400" },
          { k: "Skipped", v: result.skipped, c: "text-muted" },
          { k: "Not imported", v: failedRows.length, c: failedRows.length ? "text-rose-500" : "text-muted" },
        ].map((s, i) => (
          <m.div
            key={s.k}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.25 + i * 0.06 } }}
            className="rounded-2xl border border-hairline bg-surface-solid p-3"
          >
            <dt className="text-[12px] font-medium text-faint">{s.k}</dt>
            <dd className={cn("tabular text-[24px] font-semibold tracking-tight", s.c)}>{s.v}</dd>
          </m.div>
        ))}
      </dl>
      {failedRows.length > 0 && (
        <button type="button" onClick={() => downloadIssuesCsv(failedRows)} className="btn-ghost mt-6">
          <Download className="h-4 w-4" /> Download rows to fix (CSV)
        </button>
      )}
    </div>
  );
}

function SuccessMark({ ok }: { ok: boolean }) {
  return (
    <m.span
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 16 }}
      className={cn("grid h-24 w-24 place-items-center rounded-full", ok ? "bg-emerald-500/12 text-emerald-500" : "bg-amber-500/12 text-amber-500")}
    >
      <svg viewBox="0 0 52 52" className="h-14 w-14" aria-hidden>
        <m.circle cx="26" cy="26" r="23" fill="none" stroke="currentColor" strokeWidth="3" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.55, ease: "easeOut" }} />
        {ok ? (
          <m.path d="M15 27l7 7 15-16" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.4, ease: "easeOut" }} />
        ) : (
          <m.path d="M26 15v14M26 36v1" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.45, duration: 0.35 }} />
        )}
      </svg>
    </m.span>
  );
}
