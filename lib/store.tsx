"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Category, Product, StoreData, StoreSettings } from "./types";
import { seedSettings } from "./seed";
import type { BatchOp } from "./import/plan";

export type BatchResult =
  | { ref: number; ok: true; id: string; product?: Product }
  | { ref: number; ok: false; error: string };

interface StoreContextValue extends StoreData {
  hydrated: boolean;
  loadError: string | null;
  // products
  addProduct: (p: Omit<Product, "id" | "createdAt">) => Promise<Product>;
  updateProduct: (id: string, patch: Partial<Product> & { salePrice?: number | null }) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
  /** Bulk create/update/delete in one request (max 250 ops). */
  batchProducts: (ops: BatchOp[]) => Promise<BatchResult[]>;
  // categories
  addCategory: (name: string, icon?: string) => Promise<Category>;
  updateCategory: (id: string, patch: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  // settings
  updateSettings: (patch: Partial<StoreSettings>) => Promise<StoreSettings>;
  // misc
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    });
  } catch {
    throw new Error("You seem to be offline. Check your connection and try again.");
  }
  if (res.status === 401) throw new Error("Your admin session expired. Log in again to continue.");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

const EMPTY: StoreData = { products: [], categories: [], settings: seedSettings };

/**
 * `initialData` comes from the server render, so the very first paint shows
 * the real catalogue (no demo-data flash, no loading spinner, SEO-friendly).
 * Without it (e.g. the database was briefly unreachable) we fetch on mount.
 */
export function StoreProvider({
  children,
  initialData,
}: {
  children: React.ReactNode;
  initialData?: StoreData | null;
}) {
  const [data, setData] = useState<StoreData>(initialData ?? EMPTY);
  const [hydrated, setHydrated] = useState(Boolean(initialData));
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [products, categories, settings] = await Promise.all([
      request<Product[]>("/api/products"),
      request<Category[]>("/api/categories"),
      request<StoreSettings>("/api/settings"),
    ]);
    setData({ products, categories, settings });
  }, []);

  useEffect(() => {
    if (initialData) return;
    refresh()
      .then(() => setLoadError(null))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load store data."))
      .finally(() => setHydrated(true));
  }, [initialData, refresh]);

  const addProduct = useCallback(async (p: Omit<Product, "id" | "createdAt">) => {
    const product = await request<Product>("/api/products", { method: "POST", body: JSON.stringify(p) });
    setData((d) => ({ ...d, products: [product, ...d.products] }));
    return product;
  }, []);

  const updateProduct = useCallback(async (id: string, patch: Partial<Product> & { salePrice?: number | null }) => {
    const updated = await request<Product>(`/api/products/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    setData((d) => ({ ...d, products: d.products.map((p) => (p.id === id ? updated : p)) }));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await request(`/api/products/${encodeURIComponent(id)}`, { method: "DELETE" });
    setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }));
  }, []);

  const batchProducts = useCallback(async (ops: BatchOp[]) => {
    const { results } = await request<{ results: BatchResult[] }>("/api/products/batch", {
      method: "POST",
      body: JSON.stringify({ ops }),
    });
    setData((d) => {
      const created: Product[] = [];
      const updated = new Map<string, Product>();
      const deleted = new Set<string>();
      results.forEach((r, i) => {
        if (!r.ok) return;
        const op = ops[i];
        if (op?.op === "create" && r.product) created.push(r.product);
        else if (op?.op === "update" && r.product) updated.set(r.id, r.product);
        else if (op?.op === "delete") deleted.add(r.id);
      });
      const products = d.products
        .filter((p) => !deleted.has(p.id))
        .map((p) => updated.get(p.id) ?? p);
      return { ...d, products: [...created, ...products] };
    });
    return results;
  }, []);

  const addCategory = useCallback(async (name: string, icon = "Tag") => {
    const category = await request<Category>("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name, icon }),
    });
    setData((d) => ({ ...d, categories: [...d.categories, category] }));
    return category;
  }, []);

  const updateCategory = useCallback(async (id: string, patch: Partial<Category>) => {
    const updated = await request<Category>(`/api/categories/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    setData((d) => ({ ...d, categories: d.categories.map((c) => (c.id === id ? updated : c)) }));
    return updated;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await request(`/api/categories/${encodeURIComponent(id)}`, { method: "DELETE" });
    setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<StoreSettings>) => {
    const settings = await request<StoreSettings>("/api/settings", { method: "PUT", body: JSON.stringify(patch) });
    setData((d) => ({ ...d, settings }));
    return settings;
  }, []);

  const value = useMemo<StoreContextValue>(
    () => ({
      ...data,
      hydrated,
      loadError,
      addProduct,
      updateProduct,
      deleteProduct,
      batchProducts,
      addCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      refresh,
    }),
    [data, hydrated, loadError, addProduct, updateProduct, deleteProduct, batchProducts, addCategory, updateCategory, deleteCategory, updateSettings, refresh],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
