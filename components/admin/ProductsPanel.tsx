"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import {
  AlertTriangle,
  Boxes,
  Check,
  ChevronDown,
  Download,
  FileSpreadsheet,
  Minus,
  PackageX,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn, discountPercent, effectivePrice, formatPrice } from "@/lib/utils";
import { exportProductsCsv } from "@/lib/export";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useConfirm } from "@/components/ui/Confirm";
import { BrandLoader } from "@/components/brand/Logo";
import { ProductForm } from "./ProductForm";

// The importer (parsers + review UI) only downloads when it's opened.
const ImportSheet = dynamic(() => import("./import/ImportSheet").then((mod) => mod.ImportSheet), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/40 backdrop-blur-sm">
      <BrandLoader size={52} label="Opening importer" />
    </div>
  ),
});

type Filter = "all" | "low" | "out" | "featured";
type Sort = "newest" | "name" | "price-desc" | "price-asc" | "stock-asc";

const STEP = 60;

export function ProductsPanel() {
  const { products, categories, settings, deleteProduct, updateProduct, batchProducts } = useStore();
  const toast = useToast();
  const confirm = useConfirm();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [limit, setLimit] = useState(STEP);
  const [bulkBusy, setBulkBusy] = useState(false);

  const catName = useMemo(() => new Map(categories.map((c) => [c.id, c.name])), [categories]);

  const stats = useMemo(() => {
    let value = 0;
    let low = 0;
    let out = 0;
    let featured = 0;
    for (const p of products) {
      value += effectivePrice(p) * Math.max(0, p.quantity);
      if (p.quantity <= 0) out++;
      else if (p.quantity <= 3) low++;
      if (p.featured) featured++;
    }
    return { value, low, out, featured };
  }, [products]);

  const filtered = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = products.filter((p) => {
      if (filter === "low" && !(p.quantity > 0 && p.quantity <= 3)) return false;
      if (filter === "out" && p.quantity > 0) return false;
      if (filter === "featured" && !p.featured) return false;
      if (terms.length) {
        const hay = `${p.name} ${p.brand} ${p.sku ?? ""} ${catName.get(p.categoryId) ?? ""}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      switch (sort) {
        case "name":
          return a.name.localeCompare(b.name);
        case "price-desc":
          return effectivePrice(b) - effectivePrice(a);
        case "price-asc":
          return effectivePrice(a) - effectivePrice(b);
        case "stock-asc":
          return a.quantity - b.quantity;
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [products, q, filter, sort, catName]);

  useEffect(() => setLimit(STEP), [q, filter, sort]);

  // drop selections for products that no longer exist
  useEffect(() => {
    setSelected((s) => {
      const ids = new Set(products.map((p) => p.id));
      const next = new Set(Array.from(s).filter((id) => ids.has(id)));
      return next.size === s.size ? s : next;
    });
  }, [products]);

  // auto-load more rows as the sentinel scrolls into view
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || limit >= filtered.length) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setLimit((l) => l + STEP), { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [limit, filtered.length]);

  const visible = filtered.slice(0, limit);
  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggle = (id: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(filtered.map((p) => p.id)));

  const remove = async (p: Product) => {
    const ok = await confirm({
      title: `Delete “${p.name}”?`,
      message: "It will disappear from your store immediately. This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteProduct(p.id);
      toast({ title: "Product deleted", description: p.name });
    } catch (err) {
      toast({ tone: "error", title: "Couldn't delete", description: err instanceof Error ? err.message : undefined });
    }
  };

  const runBulk = async (label: string, ops: Parameters<typeof batchProducts>[0]) => {
    setBulkBusy(true);
    try {
      let ok = 0;
      let failed = 0;
      for (let i = 0; i < ops.length; i += 200) {
        const results = await batchProducts(ops.slice(i, i + 200));
        ok += results.filter((r) => r.ok).length;
        failed += results.filter((r) => !r.ok).length;
      }
      toast({
        tone: failed ? "error" : "success",
        title: `${label} ${ok} product${ok === 1 ? "" : "s"}`,
        description: failed ? `${failed} couldn't be changed.` : undefined,
      });
      setSelected(new Set());
    } catch (err) {
      toast({ tone: "error", title: "Bulk action failed", description: err instanceof Error ? err.message : undefined });
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    const ok = await confirm({
      title: `Delete ${ids.length} product${ids.length === 1 ? "" : "s"}?`,
      message: "They'll be removed from your store immediately. This can't be undone.",
      confirmLabel: `Delete ${ids.length}`,
      tone: "danger",
    });
    if (ok) await runBulk("Deleted", ids.map((id, i) => ({ op: "delete" as const, ref: i, id })));
  };

  const bulkPatch = (label: string, patch: Partial<Product>) =>
    runBulk(label, Array.from(selected).map((id, i) => ({ op: "update" as const, ref: i, id, patch })));

  const FILTERS: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: products.length },
    { key: "low", label: "Low stock", count: stats.low },
    { key: "out", label: "Out of stock", count: stats.out },
    { key: "featured", label: "Featured", count: stats.featured },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Boxes} label="Products" value={products.length.toLocaleString()} onClick={() => setFilter("all")} />
        <StatCard
          icon={Wallet}
          label="Stock value"
          value={formatPrice(stats.value, settings)}
          hint="price × units in stock"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low stock"
          value={String(stats.low)}
          tone={stats.low ? "amber" : undefined}
          onClick={() => setFilter("low")}
          active={filter === "low"}
        />
        <StatCard
          icon={PackageX}
          label="Out of stock"
          value={String(stats.out)}
          tone={stats.out ? "rose" : undefined}
          onClick={() => setFilter("out")}
          active={filter === "out"}
        />
      </div>

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, brand, SKU…"
            className="input !rounded-full !pl-11"
            aria-label="Search products"
            type="search"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button variant="ghost" onClick={() => setImportOpen(true)} icon={<FileSpreadsheet className="h-4 w-4" />} className="!px-3 sm:!px-5">
            Import
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              exportProductsCsv(filtered.length ? filtered : products, categories);
              toast({ title: "Export ready", description: `${(filtered.length ? filtered : products).length} products saved as CSV.` });
            }}
            icon={<Download className="h-4 w-4" />}
            className="!px-3 sm:!px-5"
          >
            Export
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            icon={<Plus className="h-4 w-4" />}
            className="!px-3 sm:!px-5"
          >
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">Add product</span>
          </Button>
        </div>
      </div>

      {/* Filters + sort */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={filter === f.key}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-[13px] font-semibold transition active:scale-95",
                filter === f.key
                  ? "border-transparent bg-content text-page"
                  : "border-hairline text-content2 hover:border-hairline-strong hover:text-content",
              )}
            >
              {f.label}
              <span className={cn("tabular text-[12px]", filter === f.key ? "opacity-70" : "text-faint")}>{f.count}</span>
            </button>
          ))}
        </div>
        <label className="relative">
          <span className="sr-only">Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="input !min-h-[2.4rem] cursor-pointer appearance-none !rounded-full !py-0 pr-9 text-[13px] font-semibold"
          >
            <option value="newest">Newest first</option>
            <option value="name">Name A–Z</option>
            <option value="price-desc">Price: high → low</option>
            <option value="price-asc">Price: low → high</option>
            <option value="stock-asc">Stock: low → high</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
        </label>
      </div>

      {/* List */}
      <div className="mt-4 overflow-hidden rounded-[24px] border border-hairline bg-surface-solid">
        <div className="sticky top-0 z-10 hidden grid-cols-[auto_minmax(0,1fr)_9rem_8rem_6.5rem_7.5rem] items-center gap-4 border-b border-hairline bg-surface-solid/95 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-faint backdrop-blur md:grid">
          <Checkbox checked={allVisibleSelected} onChange={toggleAll} label="Select all" />
          <span>Product</span>
          <span>Category</span>
          <span className="text-right">Price</span>
          <span className="text-center">Stock</span>
          <span className="text-right">Actions</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2">
              <Boxes className="h-7 w-7 text-brand-400" strokeWidth={1.5} />
            </span>
            <p className="mt-4 font-semibold text-content">{products.length ? "No products match" : "No products yet"}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">
              {products.length
                ? "Try a different search or filter."
                : "Add your first product, or import your whole catalogue from a CSV / Excel file."}
            </p>
            {!products.length && (
              <Button className="mt-5" variant="ghost" onClick={() => setImportOpen(true)} icon={<FileSpreadsheet className="h-4 w-4" />}>
                Import from spreadsheet
              </Button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--hairline)]">
            {visible.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                category={catName.get(p.categoryId) ?? "Uncategorised"}
                selected={selected.has(p.id)}
                onSelect={() => toggle(p.id)}
                onEdit={() => {
                  setEditing(p);
                  setFormOpen(true);
                }}
                onDelete={() => remove(p)}
                onToggleFeatured={async () => {
                  try {
                    await updateProduct(p.id, { featured: !p.featured });
                  } catch (err) {
                    toast({ tone: "error", title: "Couldn't update", description: err instanceof Error ? err.message : undefined });
                  }
                }}
                onStock={async (quantity) => {
                  try {
                    await updateProduct(p.id, { quantity });
                    toast({ title: "Stock updated", description: `${p.name}: ${quantity} in stock` });
                  } catch (err) {
                    toast({ tone: "error", title: "Couldn't update stock", description: err instanceof Error ? err.message : undefined });
                  }
                }}
                price={formatPrice(effectivePrice(p), settings)}
              />
            ))}
          </ul>
        )}
        {limit < filtered.length && (
          <div ref={sentinel} className="flex justify-center border-t border-hairline p-4">
            <button type="button" className="btn-quiet" onClick={() => setLimit((l) => l + STEP)}>
              Show more ({filtered.length - limit} left)
            </button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selected.size > 0 && (
          <m.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.16 } }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 mx-auto flex max-w-2xl flex-wrap items-center gap-2 rounded-[22px] glass-strong p-2 pl-4 shadow-lift lg:bottom-6 lg:left-[268px]"
            role="toolbar"
            aria-label="Bulk actions"
          >
            <span className="tabular mr-auto text-sm font-semibold text-content">{selected.size} selected</span>
            <label className="relative">
              <span className="sr-only">Move to category</span>
              <select
                disabled={bulkBusy}
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) bulkPatch(`Moved to ${catName.get(id)}:`, { categoryId: id });
                }}
                className="input !min-h-[2.5rem] cursor-pointer appearance-none !rounded-full !py-0 pr-8 text-[13px] font-semibold"
              >
                <option value="">Move to…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            </label>
            <Button variant="ghost" className="!min-h-[2.5rem] !px-3.5 text-[13px]" disabled={bulkBusy} onClick={() => bulkPatch("Featured", { featured: true })} icon={<Star className="h-4 w-4" />}>
              Feature
            </Button>
            <Button variant="danger" className="!min-h-[2.5rem] !px-3.5 text-[13px]" loading={bulkBusy} onClick={bulkDelete} icon={<Trash2 className="h-4 w-4" />}>
              Delete
            </Button>
            <button type="button" className="icon-btn !h-10 !w-10" onClick={() => setSelected(new Set())} aria-label="Clear selection">
              <X className="h-4 w-4" />
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <ProductForm product={editing} open={formOpen} onClose={() => setFormOpen(false)} />
      {importOpen && <ImportSheet open={importOpen} onClose={() => setImportOpen(false)} />}
    </div>
  );
}

/* ---------------- pieces ---------------- */

function StatCard({
  icon: IconCmp,
  label,
  value,
  hint,
  tone,
  onClick,
  active,
}: {
  icon: typeof Boxes;
  label: string;
  value: string;
  hint?: string;
  tone?: "amber" | "rose";
  onClick?: () => void;
  active?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group rounded-[22px] border bg-surface-solid p-4 text-left transition-all duration-300 ease-spring sm:p-5",
        active ? "border-brand-400/60 shadow-glow" : "border-hairline",
        onClick && "hover:-translate-y-0.5 hover:border-hairline-strong hover:shadow-soft active:scale-[0.98]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-muted">{label}</span>
        <span
          className={cn(
            "grid h-8 w-8 place-items-center rounded-xl",
            tone === "amber" ? "bg-amber-500/12 text-amber-500" : tone === "rose" ? "bg-rose-500/12 text-rose-500" : "bg-brand-500/10 text-brand-500 dark:text-brand-300",
          )}
        >
          <IconCmp className="h-4 w-4" />
        </span>
      </div>
      <p className="tabular mt-3 truncate text-[clamp(1.25rem,2.4vw,1.75rem)] font-semibold tracking-[-0.03em] text-content">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-faint">{hint}</p>}
    </Comp>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full -m-3 transition active:scale-90"
    >
      <span
        className={cn(
          "grid h-[22px] w-[22px] place-items-center rounded-[7px] border transition-all duration-200",
          checked ? "border-brand-600 bg-brand-600 text-white" : "border-hairline-strong bg-transparent",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

function ProductRow({
  product: p,
  category,
  price,
  selected,
  onSelect,
  onEdit,
  onDelete,
  onToggleFeatured,
  onStock,
}: {
  product: Product;
  category: string;
  price: string;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
  onStock: (qty: number) => Promise<void>;
}) {
  const discount = discountPercent(p);
  return (
    <li
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors md:grid-cols-[auto_minmax(0,1fr)_9rem_8rem_6.5rem_7.5rem]",
        selected ? "bg-brand-500/[0.06]" : "hover:bg-surface-2",
      )}
      style={{ contentVisibility: "auto", containIntrinsicSize: "72px" }}
    >
      <Checkbox checked={selected} onChange={onSelect} label={`Select ${p.name}`} />

      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onEdit}
          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-hairline bg-[var(--img-bg)]"
          aria-label={`Edit ${p.name}`}
        >
          <ProductImage src={p.images[0]} alt={p.name} fit="contain" compact className="absolute inset-0" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold text-content">{p.name}</p>
          <p className="flex items-center gap-1.5 truncate text-[12.5px] text-faint">
            <span className="truncate">{p.brand}</span>
            {p.sku && <span className="hidden truncate sm:inline">· {p.sku}</span>}
            {discount > 0 && <span className="font-semibold text-deal-600 dark:text-deal-400">−{discount}%</span>}
            <span className="md:hidden">· {category}</span>
          </p>
        </div>
      </div>

      <span className="hidden truncate text-[13px] text-muted md:block">{category}</span>

      <span className="tabular col-start-2 text-[14px] font-semibold text-content md:col-start-auto md:text-right">{price}</span>

      <div className="col-start-3 row-start-1 md:col-start-auto md:row-start-auto md:flex md:justify-center">
        <StockEditor value={p.quantity} onSave={onStock} />
      </div>

      <div className="col-start-3 flex justify-end gap-1 md:col-start-auto">
        <button
          type="button"
          onClick={onToggleFeatured}
          className={cn("icon-btn !h-9 !w-9 !border-transparent !bg-transparent", p.featured && "!text-amber-500")}
          aria-label={p.featured ? `Unfeature ${p.name}` : `Feature ${p.name}`}
          aria-pressed={Boolean(p.featured)}
          title={p.featured ? "Featured" : "Feature on storefront"}
        >
          <Star className={cn("h-4 w-4", p.featured && "fill-current")} />
        </button>
        <button type="button" onClick={onEdit} className="icon-btn !h-9 !w-9" aria-label={`Edit ${p.name}`}>
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="icon-btn !h-9 !w-9 hover:!border-rose-500/30 hover:!bg-rose-500/10 hover:!text-rose-500"
          aria-label={`Delete ${p.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

/** Tap the stock pill to edit it in place; − / + nudge, Enter saves, Esc cancels. */
function StockEditor({ value, onSave }: { value: number; onSave: (v: number) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(String(value)), [value]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = async () => {
    const n = Math.max(0, Math.floor(Number(draft)));
    setEditing(false);
    if (!Number.isFinite(n) || n === value) {
      setDraft(String(value));
      return;
    }
    setSaving(true);
    await onSave(n);
    setSaving(false);
  };

  const tone = value <= 0 ? "out" : value <= 3 ? "low" : "in";

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className={cn(
          "tabular inline-flex min-w-[3.25rem] items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold transition hover:ring-2 hover:ring-brand-400/30",
          tone === "out" && "bg-rose-500/12 text-rose-600 dark:text-rose-300",
          tone === "low" && "bg-amber-500/14 text-amber-700 dark:text-amber-300",
          tone === "in" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
        )}
        aria-label={`Stock: ${value}. Tap to edit`}
        title="Edit stock"
      >
        {saving ? <BrandLoader size={14} label="Saving" className="!h-3.5 !w-3.5" /> : value}
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-brand-400/50 bg-surface-solid p-0.5 shadow-soft">
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setDraft((d) => String(Math.max(0, Math.floor(Number(d) || 0) - 1)))}
        className="grid h-7 w-7 place-items-center rounded-full text-content2 hover:bg-surface-hover"
        aria-label="Decrease"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        ref={inputRef}
        value={draft}
        inputMode="numeric"
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(String(value));
            setEditing(false);
          }
        }}
        className="tabular w-10 bg-transparent text-center text-[13px] font-semibold text-content focus:outline-none"
        aria-label="Units in stock"
      />
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setDraft((d) => String(Math.floor(Number(d) || 0) + 1))}
        className="grid h-7 w-7 place-items-center rounded-full text-content2 hover:bg-surface-hover"
        aria-label="Increase"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
