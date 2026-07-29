"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product, Spec } from "@/lib/types";
import { ProductImage } from "@/components/ProductImage";

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
  specs: Spec[];
}

function toForm(p?: Product | null, defaultCat = ""): FormShape {
  return {
    name: p?.name ?? "",
    categoryId: p?.categoryId ?? defaultCat,
    brand: p?.brand ?? "",
    price: p ? String(p.price) : "",
    salePrice: p?.salePrice ? String(p.salePrice) : "",
    quantity: p ? String(p.quantity) : "0",
    description: p?.description ?? "",
    images: (p?.images ?? []).join("\n"),
    featured: p?.featured ?? false,
    specs: p?.specs ?? [],
  };
}

export function ProductForm({
  product,
  open,
  onClose,
}: {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}) {
  const { categories, addProduct, updateProduct } = useStore();
  const [form, setForm] = useState<FormShape>(() => toForm(product, categories[0]?.id));
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setForm(toForm(product, categories[0]?.id));
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, product]);

  const set = <K extends keyof FormShape>(key: K, value: FormShape[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return setError("Product name is required.");
    if (!form.categoryId) return setError("Please choose a category.");
    const price = Number(form.price);
    if (!price || price <= 0) return setError("Enter a valid price.");
    const quantity = Math.max(0, Math.floor(Number(form.quantity) || 0));
    const salePrice = form.salePrice ? Number(form.salePrice) : undefined;

    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId,
      brand: form.brand.trim() || "Generic",
      price,
      salePrice: salePrice && salePrice > 0 ? salePrice : undefined,
      quantity,
      description: form.description.trim() || undefined,
      images: form.images
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      featured: form.featured,
      specs: form.specs.filter((s) => s.label.trim() && s.value.trim()),
    };

    setSaving(true);
    setError("");
    try {
      if (product) await updateProduct(product.id, payload);
      else await addProduct(payload);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto p-0 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink-950/80 backdrop-blur-md" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 my-0 w-full max-w-2xl rounded-t-3xl glass-strong p-6 shadow-card sm:my-4 sm:rounded-3xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-content">
                {product ? "Edit product" : "Add product"}
              </h2>
              <button onClick={onClose} className="btn-ghost !px-2.5 !py-2" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Product name" className="sm:col-span-2">
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. iPhone 15 Pro Max"
                />
              </Field>

              <Field label="Category">
                <select
                  className="input cursor-pointer"
                  value={form.categoryId}
                  onChange={(e) => set("categoryId", e.target.value)}
                >
                  {categories.length === 0 && <option value="">No categories</option>}
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Brand">
                <input
                  className="input"
                  value={form.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="e.g. Apple"
                />
              </Field>

              <Field label="Price">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="0"
                />
              </Field>

              <Field label="Sale price (optional)">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.salePrice}
                  onChange={(e) => set("salePrice", e.target.value)}
                  placeholder="Discounted price"
                />
              </Field>

              <Field label="Quantity in stock">
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  placeholder="0"
                />
              </Field>

              <Field label="Featured">
                <button
                  type="button"
                  onClick={() => set("featured", !form.featured)}
                  className="input flex items-center justify-between cursor-pointer"
                >
                  <span className="text-content2">Show in featured</span>
                  <span
                    className={`relative h-5 w-9 rounded-full transition ${
                      form.featured ? "bg-brand-500" : "bg-surface-hover"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                        form.featured ? "left-[18px]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
              </Field>

              <Field label="Description (optional)" className="sm:col-span-2">
                <textarea
                  className="input min-h-[80px] resize-y"
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Short selling description…"
                />
              </Field>

              <Field
                label="Image URLs (one per line)"
                className="sm:col-span-2"
                hint="First image is the cover. Leave blank for a placeholder."
              >
                <textarea
                  className="input min-h-[70px] resize-y font-mono text-xs"
                  value={form.images}
                  onChange={(e) => set("images", e.target.value)}
                  placeholder="https://…/photo.jpg"
                />
                {form.images.trim() && (
                  <div className="mt-2 flex gap-2">
                    {form.images
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .slice(0, 4)
                      .map((src, i) => (
                        <div
                          key={i}
                          className="h-14 w-14 overflow-hidden rounded-lg border border-hairline"
                        >
                          <ProductImage src={src} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                        </div>
                      ))}
                  </div>
                )}
              </Field>

              {/* Specs */}
              <div className="sm:col-span-2">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="label mb-0">Specs (optional)</span>
                  <button
                    type="button"
                    onClick={() => set("specs", [...form.specs, { label: "", value: "" }])}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add spec
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {form.specs.map((spec, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="input !py-2"
                        placeholder="Label (e.g. Storage)"
                        value={spec.label}
                        onChange={(e) => {
                          const next = [...form.specs];
                          next[i] = { ...next[i], label: e.target.value };
                          set("specs", next);
                        }}
                      />
                      <input
                        className="input !py-2"
                        placeholder="Value (e.g. 256GB)"
                        value={spec.value}
                        onChange={(e) => {
                          const next = [...form.specs];
                          next[i] = { ...next[i], value: e.target.value };
                          set("specs", next);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => set("specs", form.specs.filter((_, j) => j !== i))}
                        className="btn-ghost !px-2.5 !py-2 shrink-0"
                        aria-label="Remove spec"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-500 dark:text-rose-300">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} className="btn-ghost" disabled={saving}>
                Cancel
              </button>
              <button onClick={submit} className="btn-primary disabled:opacity-60" disabled={saving}>
                {saving ? "Saving…" : product ? "Save changes" : "Add product"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <span className="label">{label}</span>
      {children}
      {hint && <p className="mt-1 text-[11px] text-faint">{hint}</p>}
    </div>
  );
}
