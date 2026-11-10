"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, m, useDragControls } from "framer-motion";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product, Spec } from "@/lib/types";
import { ProductImage } from "@/components/ProductImage";
import { Button } from "@/components/ui/Button";
import { Switch } from "@/components/ui/Switch";
import { useToast } from "@/components/ui/Toaster";
import { useConfirm } from "@/components/ui/Confirm";

interface FormShape {
  name: string;
  categoryId: string;
  brand: string;
  price: string;
  salePrice: string;
  quantity: string;
  description: string;
  images: string; // newline separated
  featured: boolean;
  sku: string;
  specs: Spec[];
}

function toForm(p?: Product | null, defaultCat = ""): FormShape {
  return {
    name: p?.name ?? "",
    categoryId: p?.categoryId ?? defaultCat,
    brand: p?.brand ?? "",
    price: p ? String(p.price) : "",
    salePrice: p?.salePrice ? String(p.salePrice) : "",
    quantity: p ? String(p.quantity) : "1",
    description: p?.description ?? "",
    images: (p?.images ?? []).join("\n"),
    featured: p?.featured ?? false,
    sku: p?.sku ?? "",
    specs: p?.specs ?? [],
  };
}

type Errors = Partial<Record<"name" | "categoryId" | "price" | "salePrice", string>>;

export function ProductForm({ product, open, onClose }: { product: Product | null; open: boolean; onClose: () => void }) {
  const { categories, addProduct, updateProduct } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const drag = useDragControls();
  const [form, setForm] = useState<FormShape>(() => toForm(product, categories[0]?.id));
  const [initial, setInitial] = useState(form);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const f = toForm(product, categories[0]?.id);
      setForm(f);
      setInitial(f);
      setErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initial), [form, initial]);

  const requestClose = async () => {
    if (saving) return;
    if (dirty) {
      const ok = await confirm({
        title: "Discard changes?",
        message: "Your edits to this product haven't been saved.",
        confirmLabel: "Discard",
        tone: "danger",
      });
      if (!ok) return;
    }
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") requestClose();
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  });

  const set = <K extends keyof FormShape>(key: K, value: FormShape[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key in errors) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const images = form.images
    .split(/\n|,(?=\s*https?:)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const submit = async () => {
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Give the product a name.";
    if (!form.categoryId) next.categoryId = "Choose a category.";
    const price = Number(form.price);
    if (!form.price || !Number.isFinite(price) || price <= 0) next.price = "Enter a price above 0.";
    const salePrice = form.salePrice ? Number(form.salePrice) : undefined;
    if (salePrice !== undefined && (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price)) {
      next.salePrice = "Sale price must be lower than the price.";
    }
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`pf-${Object.keys(next)[0]}`)?.focus();
      return;
    }

    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      brand: form.brand.trim() || "Generic",
      price,
      salePrice: salePrice && salePrice > 0 ? salePrice : product ? null : undefined,
      quantity: Math.max(0, Math.floor(Number(form.quantity) || 0)),
      description: form.description.trim(),
      images,
      featured: form.featured,
      sku: form.sku.trim(),
      specs: form.specs.filter((s) => s.label.trim() && s.value.trim()),
    };

    setSaving(true);
    try {
      if (product) {
        await updateProduct(product.id, payload as Partial<Product> & { salePrice?: number | null });
        toast({ title: "Changes saved", description: payload.name });
      } else {
        await addProduct({ ...payload, salePrice: payload.salePrice ?? undefined, description: payload.description || undefined, sku: payload.sku || undefined });
        toast({ title: "Product added", description: payload.name });
      }
      onClose();
    } catch (err) {
      toast({ tone: "error", title: "Couldn't save", description: err instanceof Error ? err.message : "Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
        >
          <div className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={requestClose} aria-hidden />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pf-title"
            initial={{ opacity: 0, y: 50, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98, transition: { duration: 0.18 } }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 700) requestClose();
            }}
            className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border border-hairline bg-page shadow-lift sm:rounded-[30px]"
          >
            <div
              className="flex items-center justify-between border-b border-hairline px-5 pb-3 pt-3 sm:px-6 sm:pt-5"
              onPointerDown={(e) => {
                if (window.matchMedia("(max-width: 639px)").matches) drag.start(e);
              }}
              style={{ touchAction: "none" }}
            >
              <div>
                <span className="mx-auto mb-2 block h-1.5 w-10 rounded-full bg-hairline-strong sm:hidden" aria-hidden />
                <h2 id="pf-title" className="text-lg font-semibold tracking-tight text-content">
                  {product ? "Edit product" : "Add product"}
                </h2>
              </div>
              <button onClick={requestClose} className="icon-btn" aria-label="Close" type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product name" required error={errors.name} className="sm:col-span-2" htmlFor="pf-name">
                  <input
                    id="pf-name"
                    className="input"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. iPhone 15 Pro Max 256GB"
                    maxLength={200}
                  />
                </Field>

                <Field label="Category" required error={errors.categoryId} htmlFor="pf-categoryId">
                  <select id="pf-categoryId" className="input cursor-pointer" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                    {categories.length === 0 && <option value="">No categories — add one first</option>}
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Brand" htmlFor="pf-brand">
                  <input id="pf-brand" className="input" value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. Apple" maxLength={80} />
                </Field>

                <Field label="Price" required error={errors.price} htmlFor="pf-price">
                  <input id="pf-price" className="input tabular" type="number" inputMode="decimal" min={0} value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="0" />
                </Field>

                <Field label="Sale price" hint="Optional — shows as a deal" error={errors.salePrice} htmlFor="pf-salePrice">
                  <input id="pf-salePrice" className="input tabular" type="number" inputMode="decimal" min={0} value={form.salePrice} onChange={(e) => set("salePrice", e.target.value)} placeholder="Discounted price" />
                </Field>

                <Field label="Units in stock" htmlFor="pf-quantity">
                  <input id="pf-quantity" className="input tabular" type="number" inputMode="numeric" min={0} value={form.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="0" />
                </Field>

                <Field label="SKU" hint="Optional — matches rows when you re-import" htmlFor="pf-sku">
                  <input id="pf-sku" className="input" value={form.sku} onChange={(e) => set("sku", e.target.value)} placeholder="e.g. IP15PM-256" maxLength={64} />
                </Field>

                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-hairline px-4 py-3 sm:col-span-2">
                  <span>
                    <span className="block text-[14px] font-semibold text-content">Feature on storefront</span>
                    <span className="block text-[12.5px] text-muted">Shows in the hero spotlight and sorts first.</span>
                  </span>
                  <Switch checked={form.featured} onChange={(v) => set("featured", v)} label="Featured" />
                </label>

                <Field label="Description" hint="Optional" className="sm:col-span-2" htmlFor="pf-description">
                  <textarea
                    id="pf-description"
                    className="input min-h-[96px] resize-y"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="What makes it great? Condition, warranty, what's in the box…"
                    maxLength={5000}
                  />
                </Field>

                <Field label="Image links" hint="One per line — the first is the cover." className="sm:col-span-2" htmlFor="pf-images">
                  <textarea
                    id="pf-images"
                    className="input min-h-[76px] resize-y font-mono text-[12.5px]"
                    value={form.images}
                    onChange={(e) => set("images", e.target.value)}
                    placeholder="https://…/photo.jpg"
                  />
                  {images.length > 0 && (
                    <div className="mt-2 flex gap-2 overflow-x-auto no-scrollbar">
                      {images.slice(0, 6).map((src, i) => (
                        <div key={`${src}-${i}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-hairline bg-[var(--img-bg)]">
                          <ProductImage src={src} alt={`Preview ${i + 1}`} fit="contain" compact className="absolute inset-0" />
                          {i === 0 && <span className="absolute bottom-1 left-1 rounded-md bg-zinc-900/80 px-1.5 text-[10px] font-semibold text-white">Cover</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </Field>

                <div className="sm:col-span-2">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="label mb-0">Specs</span>
                    <button
                      type="button"
                      onClick={() => set("specs", [...form.specs, { label: "", value: "" }])}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold text-brand-500 transition hover:bg-brand-500/10 dark:text-brand-300"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add spec
                    </button>
                  </div>
                  <AnimatePresence initial={false}>
                    {form.specs.map((spec, i) => (
                      <m.div
                        key={i}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="flex items-center gap-2 pb-2">
                          <GripVertical className="h-4 w-4 shrink-0 text-faint" aria-hidden />
                          <input
                            className="input"
                            placeholder="Label (e.g. Storage)"
                            value={spec.label}
                            maxLength={60}
                            onChange={(e) => {
                              const next = [...form.specs];
                              next[i] = { ...next[i], label: e.target.value };
                              set("specs", next);
                            }}
                          />
                          <input
                            className="input"
                            placeholder="Value (e.g. 256GB)"
                            value={spec.value}
                            maxLength={200}
                            onChange={(e) => {
                              const next = [...form.specs];
                              next[i] = { ...next[i], value: e.target.value };
                              set("specs", next);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => set("specs", form.specs.filter((_, j) => j !== i))}
                            className="icon-btn shrink-0"
                            aria-label="Remove spec"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </m.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-hairline bg-page/90 px-5 py-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] backdrop-blur sm:px-6">
              <span className="hidden text-[12px] text-faint sm:block">⌘/Ctrl + Enter to save</span>
              <div className="flex flex-1 justify-end gap-2 sm:flex-none">
                <Button variant="ghost" onClick={requestClose} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={submit} loading={saving} loadingText="Saving…">
                  {product ? "Save changes" : "Add product"}
                </Button>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  className,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {label}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-[12.5px] font-medium text-rose-500" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-[12px] text-faint">{hint}</p>
      )}
    </div>
  );
}
