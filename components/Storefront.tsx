"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, PackageOpen, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn, effectivePrice, discountPercent } from "@/lib/utils";
import { Hero } from "./Hero";
import { ProductCard } from "./ProductCard";
import { ProductModal } from "./ProductModal";
import { Filters, type FilterState } from "./Filters";
import { Pagination } from "./Pagination";
import { Icon } from "./Icon";

const PAGE_SIZE = 9;
const MIN_SEARCH = 3;

type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "name", label: "Name A–Z" },
];

export function Storefront() {
  const { products, categories, settings } = useStore();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);

  // Products scoped to the active category only (drives brand list + price bounds)
  const categoryProducts = useMemo(
    () =>
      category === "all"
        ? products
        : products.filter((p) => p.categoryId === category),
    [products, category],
  );

  const brands = useMemo(
    () =>
      Array.from(new Set(categoryProducts.map((p) => p.brand))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [categoryProducts],
  );

  const priceBounds = useMemo<[number, number]>(() => {
    if (categoryProducts.length === 0) return [0, 1000000];
    const prices = categoryProducts.map(effectivePrice);
    return [Math.min(...prices), Math.max(...prices)];
  }, [categoryProducts]);

  const [filters, setFilters] = useState<FilterState>({
    brands: [],
    maxPrice: priceBounds[1],
    inStockOnly: false,
    onSaleOnly: false,
  });

  // When the category changes, reset dependent filters
  useEffect(() => {
    setFilters({
      brands: [],
      maxPrice: priceBounds[1],
      inStockOnly: false,
      onSaleOnly: false,
    });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const resetFilters = () =>
    setFilters({
      brands: [],
      maxPrice: priceBounds[1],
      inStockOnly: false,
      onSaleOnly: false,
    });

  // Full filtering pipeline
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searchActive = q.length >= MIN_SEARCH;

    let list = categoryProducts.filter((p) => {
      if (filters.brands.length && !filters.brands.includes(p.brand)) return false;
      if (filters.inStockOnly && p.quantity <= 0) return false;
      if (filters.onSaleOnly && discountPercent(p) <= 0) return false;
      if (effectivePrice(p) > filters.maxPrice) return false;
      if (searchActive) {
        const cat = categories.find((c) => c.id === p.categoryId)?.name ?? "";
        const haystack =
          `${p.name} ${p.brand} ${p.description ?? ""} ${cat}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "price-asc":
          return effectivePrice(a) - effectivePrice(b);
        case "price-desc":
          return effectivePrice(b) - effectivePrice(a);
        case "name":
          return a.name.localeCompare(b.name);
        case "featured":
        default:
          return (
            Number(b.featured ?? false) - Number(a.featured ?? false) ||
            b.createdAt - a.createdAt
          );
      }
    });
    return list;
  }, [categoryProducts, categories, filters, query, sort]);

  // Reset to page 1 whenever the result set inputs change
  useEffect(() => setPage(1), [query, sort, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (current - 1) * PAGE_SIZE,
    current * PAGE_SIZE,
  );

  const shopRef = useRef<HTMLDivElement>(null);
  const goToPage = (p: number) => {
    setPage(p);
    shopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const catById = (id: string) => categories.find((c) => c.id === id);
  const searchTooShort = query.trim().length > 0 && query.trim().length < MIN_SEARCH;

  return (
    <>
      <Hero query={query} setQuery={setQuery} productCount={products.length} />

      {/* Category strip */}
      <section id="categories" className="mx-auto mt-14 max-w-7xl px-4">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-bold text-content">Shop by category</h2>
            <p className="text-sm text-muted">Find exactly what you're after.</p>
          </div>
        </div>
        <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
          <CategoryPill
            active={category === "all"}
            onClick={() => setCategory("all")}
            icon="LayoutGrid"
            label="All products"
            count={products.length}
          />
          {categories.map((c) => (
            <CategoryPill
              key={c.id}
              active={category === c.id}
              onClick={() => setCategory(c.id)}
              icon={c.icon}
              label={c.name}
              count={products.filter((p) => p.categoryId === c.id).length}
            />
          ))}
        </div>
      </section>

      {/* Catalog */}
      <section id="shop" ref={shopRef} className="mx-auto mt-10 max-w-7xl scroll-mt-24 px-4 pb-20">
        {/* Toolbar */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5 text-brand-400" />
            <h2 className="text-lg font-bold text-content">
              {category === "all" ? "All products" : catById(category)?.name}
            </h2>
            <span className="chip">{filtered.length} results</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileFilters(true)}
              className="btn-ghost lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </button>
            <label className="relative">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="input cursor-pointer appearance-none pr-9 !py-2.5"
                aria-label="Sort products"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-faint">
                ▾
              </span>
            </label>
          </div>
        </div>

        {searchTooShort && (
          <p className="mb-4 rounded-xl border border-hairline bg-surface-2 px-4 py-2.5 text-sm text-muted">
            Keep typing — search activates from {MIN_SEARCH} characters.
          </p>
        )}

        <div className="flex gap-6">
          {/* Sidebar filters (desktop) */}
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24">
              <Filters
                brands={brands}
                priceBounds={priceBounds}
                state={filters}
                setState={setFilters}
                onReset={resetFilters}
              />
            </div>
          </aside>

          {/* Grid */}
          <div className="min-w-0 flex-1">
            {pageItems.length === 0 ? (
              <EmptyState onReset={() => { setQuery(""); setCategory("all"); resetFilters(); }} />
            ) : (
              <motion.div
                layout
                className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
              >
                <AnimatePresence mode="popLayout">
                  {pageItems.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      category={catById(p.categoryId)}
                      onView={setSelected}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            <Pagination page={current} totalPages={totalPages} onChange={goToPage} />
          </div>
        </div>
      </section>

      {/* Mobile filters sheet */}
      <AnimatePresence>
        {mobileFilters && (
          <motion.div
            className="fixed inset-0 z-[90] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm"
              onClick={() => setMobileFilters(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="absolute left-0 top-0 h-full w-[85%] max-w-sm overflow-y-auto bg-page p-4 no-scrollbar"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-bold text-content">Filters</h3>
                <button
                  onClick={() => setMobileFilters(false)}
                  className="btn-ghost !px-2.5 !py-2"
                  aria-label="Close filters"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Filters
                brands={brands}
                priceBounds={priceBounds}
                state={filters}
                setState={setFilters}
                onReset={resetFilters}
              />
              <button
                onClick={() => setMobileFilters(false)}
                className="btn-primary mt-4 w-full"
              >
                Show {filtered.length} results
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ProductModal
        product={selected}
        category={selected ? catById(selected.categoryId) : undefined}
        onClose={() => setSelected(null)}
      />
    </>
  );
}

function CategoryPill({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex shrink-0 items-center gap-2.5 rounded-2xl border px-4 py-3 text-sm font-semibold transition-all",
        active
          ? "border-brand-400/50 bg-brand-500/15 text-content shadow-glow"
          : "border-hairline bg-surface-2 text-content2 hover:border-brand-400/30 hover:bg-surface-hover",
      )}
    >
      <span
        className={cn(
          "grid h-8 w-8 place-items-center rounded-xl transition",
          active
            ? "bg-brand-500 text-white"
            : "bg-surface-hover text-brand-400 group-hover:bg-brand-500/20",
        )}
      >
        <Icon name={icon} className="h-4 w-4" />
      </span>
      <span className="whitespace-nowrap">{label}</span>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px] font-bold",
          active ? "bg-white/20 text-white" : "bg-surface-hover text-faint",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="grid place-items-center rounded-2xl glass px-6 py-20 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-surface-hover">
        <PackageOpen className="h-8 w-8 text-brand-400" />
      </div>
      <h3 className="text-lg font-bold text-content">No products found</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Try a different search, category or loosen your filters to see more.
      </p>
      <button onClick={onReset} className="btn-primary mt-5">
        Clear everything
      </button>
    </div>
  );
}
