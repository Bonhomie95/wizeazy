"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Boxes,
  Layers,
  Loader2,
  Lock,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Settings2,
  Trash2,
  TriangleAlert,
  Zap,
} from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import {
  cn,
  discountPercent,
  effectivePrice,
  formatPrice,
} from "@/lib/utils";
import { ProductImage } from "@/components/ProductImage";
import { ProductForm } from "@/components/admin/ProductForm";
import { Icon, iconChoices } from "@/components/Icon";
import { ThemeToggle } from "@/components/ThemeToggle";

type Tab = "products" | "categories" | "settings";

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // On mount, silently check whether a valid session cookie already exists
  // so returning admins aren't asked to re-enter the password every visit.
  useEffect(() => {
    fetch("/api/admin/session")
      .then((res) => res.json())
      .then((data) => setAuthed(Boolean(data?.authed)))
      .catch(() => setAuthed(false))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return (
      <main className="grid min-h-dvh place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-400" />
      </main>
    );
  }

  if (!authed) return <Gate onSuccess={() => setAuthed(true)} />;
  return <Dashboard onLogout={() => setAuthed(false)} />;
}

/* ---------------- Password gate ---------------- */
function Gate({ onSuccess }: { onSuccess: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Incorrect password. Try again.");
        return;
      }
      onSuccess();
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-3xl glass-strong p-8 shadow-card">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <Lock className="h-6 w-6 text-white" />
          </span>
          <h1 className="text-xl font-extrabold text-content">Admin access</h1>
          <p className="mt-1 text-sm text-muted">
            Enter your password to manage the store.
          </p>
        </div>
        <form onSubmit={submit}>
          <input
            autoFocus
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError("");
            }}
            placeholder="Password"
            className="input text-center"
          />
          {error && (
            <p className="mt-2 text-center text-sm text-rose-500 dark:text-rose-300">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary mt-4 w-full disabled:opacity-60" disabled={loading}>
            {loading ? "Checking…" : "Unlock dashboard"}
          </button>
        </form>
        <Link
          href="/"
          className="mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-muted transition hover:text-content"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to store
        </Link>
      </div>
    </main>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("products");
  const { products, categories } = useStore();

  const lowStock = products.filter((p) => p.quantity > 0 && p.quantity <= 3).length;
  const outStock = products.filter((p) => p.quantity <= 0).length;

  const stats = [
    { label: "Products", value: products.length, icon: Boxes },
    { label: "Categories", value: categories.length, icon: Layers },
    { label: "Low stock", value: lowStock, icon: TriangleAlert },
    { label: "Out of stock", value: outStock, icon: TriangleAlert },
  ];

  const tabs: { key: Tab; label: string; icon: typeof Boxes }[] = [
    { key: "products", label: "Products", icon: Boxes },
    { key: "categories", label: "Categories", icon: Layers },
    { key: "settings", label: "Settings", icon: Settings2 },
  ];

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      onLogout();
    }
  };

  return (
    <div className="min-h-dvh">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-hairline bg-page/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <Zap className="h-4 w-4 text-white" fill="currentColor" />
            </span>
            <div>
              <p className="text-sm font-extrabold leading-none text-content">
                Wizeazy Admin
              </p>
              <p className="text-[11px] text-faint">Store management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/" className="btn-ghost !py-2 text-xs">
              <ArrowLeft className="h-4 w-4" /> View store
            </Link>
            <button onClick={logout} className="btn-ghost !py-2 text-xs">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl glass p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted">{s.label}</span>
                <s.icon
                  className={cn(
                    "h-4 w-4",
                    s.label === "Out of stock" && s.value > 0
                      ? "text-rose-400"
                      : s.label === "Low stock" && s.value > 0
                        ? "text-amber-400"
                        : "text-brand-400",
                  )}
                />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-content">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-1.5 rounded-2xl glass p-1.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                tab === t.key
                  ? "bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-glow"
                  : "text-content2 hover:bg-surface-hover",
              )}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === "products" && <ProductsTab />}
          {tab === "categories" && <CategoriesTab />}
          {tab === "settings" && <SettingsTab />}
        </div>
      </main>
    </div>
  );
}

/* ---------------- Products tab ---------------- */
function ProductsTab() {
  const { products, categories, deleteProduct, settings } = useStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = query
      ? products.filter((p) =>
          `${p.name} ${p.brand}`.toLowerCase().includes(query),
        )
      : products;
    return [...list].sort((a, b) => b.createdAt - a.createdAt);
  }, [products, q]);

  const catName = (id: string) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setFormOpen(true);
  };
  const remove = async (p: Product) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct(p.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete product.");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="input sm:max-w-xs"
        />
        <button onClick={openNew} className="btn-primary">
          <Plus className="h-4 w-4" /> Add product
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl glass">
        {/* header row (desktop) */}
        <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-hairline px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-faint sm:grid">
          <span>Product</span>
          <span className="w-28">Category</span>
          <span className="w-28 text-right">Price</span>
          <span className="w-20 text-center">Stock</span>
          <span className="w-20 text-right">Actions</span>
        </div>

        {filtered.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-muted">
            No products yet. Click “Add product” to create your first listing.
          </p>
        )}

        <div className="divide-y divide-[color:var(--hairline)]">
          {filtered.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 gap-3 px-4 py-3 transition hover:bg-surface-2 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center sm:gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-hairline">
                  <ProductImage
                    src={p.images[0]}
                    alt={p.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-content">{p.name}</p>
                  <p className="text-xs text-faint">
                    {p.brand}
                    {discountPercent(p) > 0 && (
                      <span className="ml-2 text-cyber-500">-{discountPercent(p)}%</span>
                    )}
                    {p.featured && <span className="ml-2 text-brand-400">★ Featured</span>}
                  </p>
                </div>
              </div>

              <span className="w-28 truncate text-xs text-muted">{catName(p.categoryId)}</span>

              <span className="w-28 text-left text-sm font-semibold text-content sm:text-right">
                {formatPrice(effectivePrice(p), settings)}
              </span>

              <div className="w-20 sm:text-center">
                <span
                  className={cn(
                    "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
                    p.quantity <= 0
                      ? "bg-rose-500/15 text-rose-500 dark:text-rose-300"
                      : p.quantity <= 3
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-300"
                        : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
                  )}
                >
                  {p.quantity}
                </span>
              </div>

              <div className="flex w-20 justify-start gap-1.5 sm:justify-end">
                <button
                  onClick={() => openEdit(p)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-hairline bg-surface-2 text-content2 transition hover:bg-surface-hover hover:text-content"
                  aria-label={`Edit ${p.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => remove(p)}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 transition hover:bg-rose-500/20 dark:text-rose-300"
                  aria-label={`Delete ${p.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProductForm product={editing} open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}

/* ---------------- Categories tab ---------------- */
function CategoriesTab() {
  const { categories, products, addCategory, updateCategory, deleteCategory } =
    useStore();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Tag");

  const add = async () => {
    if (!name.trim()) return;
    try {
      await addCategory(name, icon);
      setName("");
      setIcon("Tag");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add category.");
    }
  };

  const remove = async (id: string, label: string) => {
    const count = products.filter((p) => p.categoryId === id).length;
    const msg =
      count > 0
        ? `Delete "${label}"? ${count} product(s) will become uncategorised.`
        : `Delete "${label}"?`;
    if (!window.confirm(msg)) return;
    try {
      await deleteCategory(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Add form */}
      <div className="rounded-2xl glass p-5 lg:sticky lg:top-24 lg:self-start">
        <h3 className="mb-4 text-sm font-bold text-content">Add category</h3>
        <span className="label">Name</span>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Smart Home"
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <span className="label mt-4">Icon</span>
        <div className="grid grid-cols-6 gap-1.5">
          {iconChoices.map((name) => (
            <button
              key={name}
              onClick={() => setIcon(name)}
              className={cn(
                "grid aspect-square place-items-center rounded-lg border transition",
                icon === name
                  ? "border-brand-400 bg-brand-500/15 text-brand-300"
                  : "border-hairline bg-surface-2 text-content2 hover:bg-surface-hover",
              )}
              aria-label={name}
            >
              <Icon name={name} className="h-4 w-4" />
            </button>
          ))}
        </div>
        <button onClick={add} className="btn-primary mt-4 w-full">
          <Plus className="h-4 w-4" /> Add category
        </button>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2.5">
        {categories.length === 0 && (
          <p className="rounded-2xl glass px-4 py-10 text-center text-sm text-muted">
            No categories yet.
          </p>
        )}
        {categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-2xl glass p-3"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-hover text-brand-400">
                <Icon name={c.icon} className="h-5 w-5" />
              </span>
              <CategoryNameInput
                value={c.name}
                onCommit={(next) => updateCategory(c.id, { name: next })}
              />
              <span className="chip shrink-0">{count} items</span>
              <button
                onClick={() => remove(c.id, c.name)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-500 transition hover:bg-rose-500/20 dark:text-rose-300"
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryNameInput({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
  };

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
      className="flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-sm font-semibold text-content transition hover:border-hairline focus:border-brand-400/50 focus:bg-surface-2 focus:outline-none"
    />
  );
}

/* ---------------- Settings tab ---------------- */
function SettingsTab() {
  const { settings, updateSettings, refresh } = useStore();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [resetting, setResetting] = useState(false);

  const commitField = async (key: keyof typeof settings, value: string) => {
    try {
      await updateSettings({ [key]: value });
      setSaved(true);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes.");
    }
  };

  const field = (
    key: keyof typeof settings,
    label: string,
    placeholder = "",
    hint = "",
  ) => (
    <SettingsField
      label={label}
      placeholder={placeholder}
      hint={hint}
      value={settings[key]}
      onCommit={(next) => commitField(key, next)}
    />
  );

  const resetStore = async () => {
    if (
      !window.confirm(
        "Reset everything to the original demo data? This cannot be undone.",
      )
    )
      return;
    setResetting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to reset store data.");
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset store data.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl glass p-5">
        <h3 className="mb-4 text-sm font-bold text-content">Store details</h3>
        <div className="grid gap-4">
          {field("storeName", "Store name", "Wizeazy")}
          {field("tagline", "Tagline", "Short store description")}
          <div className="grid grid-cols-2 gap-4">
            {field("currencySymbol", "Currency symbol", "₦")}
            {field("currency", "Currency code", "NGN")}
          </div>
        </div>
      </div>

      <div className="rounded-2xl glass p-5">
        <h3 className="mb-1 text-sm font-bold text-content">Contact channels</h3>
        <p className="mb-4 text-xs text-muted">
          These power the “Buy now” and contact buttons across the store.
        </p>
        <div className="grid gap-4">
          {field(
            "whatsapp",
            "WhatsApp number",
            "2348012345678",
            "International format, digits only (no + or spaces).",
          )}
          {field("instagram", "Instagram handle", "wizeazy", "Without the @.")}
          {field("snapchat", "Snapchat handle", "wizeazy", "Without the @.")}
          {field("telegram", "Telegram handle", "wizeazy", "Without the @.")}
        </div>
      </div>

      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 lg:col-span-2">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-bold text-content">Reset store data</h3>
            <p className="text-xs text-muted">
              Restore the original demo products, categories and settings. Your
              changes will be lost.
            </p>
          </div>
          <button
            onClick={resetStore}
            disabled={resetting}
            className="btn-ghost shrink-0 !text-rose-500 disabled:opacity-60 dark:!text-rose-300"
          >
            <RotateCcw className="h-4 w-4" /> {resetting ? "Resetting…" : "Reset to defaults"}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-center text-xs text-rose-500 dark:text-rose-300 lg:col-span-2">
          {error}
        </p>
      )}
      {!error && saved && (
        <p className="text-center text-xs text-emerald-600 dark:text-emerald-300 lg:col-span-2">
          Changes are saved automatically.
        </p>
      )}
    </div>
  );
}

function SettingsField({
  label,
  placeholder,
  hint,
  value,
  onCommit,
}: {
  label: string;
  placeholder: string;
  hint: string;
  value: string;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <div>
      <span className="label">{label}</span>
      <input
        className="input"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
      />
      {hint && <p className="mt-1 text-[11px] text-faint">{hint}</p>}
    </div>
  );
}
