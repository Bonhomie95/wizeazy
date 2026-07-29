"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Category, Product, StoreData, StoreSettings } from "./types";
import { getSeedData } from "./seed";

interface StoreContextValue extends StoreData {
  hydrated: boolean;
  loadError: string | null;
  // products
  addProduct: (p: Omit<Product, "id" | "createdAt">) => Promise<Product>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<Product>;
  deleteProduct: (id: string) => Promise<void>;
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
  const res = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  // Seed data is shown instantly on first paint; it's replaced the moment
  // the real data arrives from the API (backed by MongoDB).
  const [data, setData] = useState<StoreData>(() => getSeedData());
  const [hydrated, setHydrated] = useState(false);
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
    refresh()
      .then(() => setLoadError(null))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load store data."))
      .finally(() => setHydrated(true));
  }, [refresh]);

  const addProduct = useCallback(async (p: Omit<Product, "id" | "createdAt">) => {
    const product = await request<Product>("/api/products", {
      method: "POST",
      body: JSON.stringify(p),
    });
    setData((d) => ({ ...d, products: [product, ...d.products] }));
    return product;
  }, []);

  const updateProduct = useCallback(async (id: string, patch: Partial<Product>) => {
    const updated = await request<Product>(`/api/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    setData((d) => ({
      ...d,
      products: d.products.map((p) => (p.id === id ? updated : p)),
    }));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await request(`/api/products/${id}`, { method: "DELETE" });
    setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) }));
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
    const updated = await request<Category>(`/api/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    });
    setData((d) => ({
      ...d,
      categories: d.categories.map((c) => (c.id === id ? updated : c)),
    }));
    return updated;
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    await request(`/api/categories/${id}`, { method: "DELETE" });
    setData((d) => ({ ...d, categories: d.categories.filter((c) => c.id !== id) }));
  }, []);

  const updateSettings = useCallback(async (patch: Partial<StoreSettings>) => {
    const settings = await request<StoreSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(patch),
    });
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
      addCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      refresh,
    }),
    [
      data,
      hydrated,
      loadError,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      updateSettings,
      refresh,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}
