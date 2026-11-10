"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, PackageOpen, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Product } from "@/lib/types";
import { cn, discountPercent, effectivePrice } from "@/lib/utils";
import { Hero } from "./Hero";
import { ProductCard } from "./ProductCard";
import { ProductModal } from "./ProductModal";
import { Filters, type FilterState } from "./Filters";
import { Pagination } from "./Pagination";
import { Icon } from "./Icon";
import { Reveal } from "./ui/Reveal";
import { BrandLoader } from "./brand/Logo";

const PAGE_SIZE = 12;
const MIN_SEARCH = 2;

type SortKey = "featured" | "newest" | "price-asc" | "price-desc" | "name";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "featured", label: "Featured" },
  { key: "newest", label: "Newest" },
  { key: "price-asc", label: "Price: low to high" },
  { key: "price-desc", label: "Price: high to low" },
  { key: "name", label: "Name A–Z" },
];

export function Storefront() {
  const { products, categories, hydrated, loadError, refresh } = useStore();

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("featured");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);

  const categoryProducts = useMemo(
    () => (category === "all" ? products : products.filter((p) => p.categoryId === category)),
    [products, category],
  );

  const brands = useMemo(
    () => Array.from(new Set(categoryProducts.map((p) => p.brand))).sort((a, b) => a.localeCompare(b)),
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

  useEffect(() => {
    setFilters({ brands: [], maxPrice: priceBounds[1], inStockOnly: false, onSaleOnly: false });
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, priceBounds[1]]);

  const resetFilters = () => setFilters({ brands: [], maxPrice: priceBounds[1], inStockOnly: false, onSaleOnly: false });

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) map.set(p.categoryId, (map.get(p.categoryId) ?? 0) + 1);
    return map;
  }, [products]);

  const featured = useMemo(() => {
    const list = products.filter((p) => p.featured && p.quantity > 0);
    const pool = list.length >= 3 ? list : [...list, ...products.filter((p) => !p.featured && p.quantity > 0)];
    return pool.slice(0, 5);
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const searchActive = q.length >= MIN_SEARCH;
    const terms = q.split(/\s+/).filter(Boolean);
    const catName = new Map(categories.map((c) => [c.id, c.name.toLowerCase()]));

    const list = categoryProducts.filter((p) => {
      if (filters.brands.length && !filters.brands.includes(p.brand)) return false;
      if (filters.inStockOnly && p.quantity <= 0) return false;
      if (filters.onSaleOnly && discountPercent(p) <= 0) return false;
      if (effectivePrice(p) > filters.maxPrice) return false;
      if (searchActive) {
        const haystack = `${p.name} ${p.brand} ${p.sku ?? ""} ${p.description ?? ""} ${catName.get(p.categoryId) ?? ""}`.toLowerCase();
        if (!terms.every((t) => haystack.includes(t))) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "price-asc":
          return effectivePrice(a) - effectivePrice(b);
        case "price-desc":
          return effectivePrice(b) - effectivePrice(a);
        case "name":
          return a.name.localeCompare(b.name);
        default:
          return (
            Number(b.featured ?? false) - Number(a.featured ?? false) ||
            Number(b.quantity > 0) - Number(a.quantity > 0) ||
            b.createdAt - a.createdAt
          );
      }
    });
  }, [categoryProducts, categories, filters, query, sort]);

  useEffect(() => setPage(1), [query, sort, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, totalPages);
  const pageItems = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  const shopRef = useRef<HTMLDivElement>(null);
  const goToPage = (p: number) => {
    setPage(p);
    shopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const pickCategory = (id: string) => {
    setCategory(id);
    requestAnimationFrame(() => shopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const catById = (id: string) => categories.find((c) => c.id === id);
  const inStock = products.filter((p) => p.quantity > 0).length;
  const activeFilters =
    filters.brands.length + Number(filters.inStockOnly) + Number(filters.onSaleOnly) + Number(filters.maxPrice < priceBounds[1]);

  return (
    <>
      <Hero
        query={query}
        setQuery={setQuery}
        productCount={products.length}
        inStock={inStock}
        featured={featured}
        categories={categories}
        onView={setSelected}
        onPickCategory={pickCategory}
      />

      <BrandMarquee brands={Array.from(new Set(products.map((p) => p.brand))).filter((b) => b && b !== "Generic")} />

      {/* Category shelf */}
      <section id="categories" className="mx-auto mt-14 max-w-7xl scroll-mt-24 px-4">
        <Reveal className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Browse</p>
            <h2 className="section-title mt-2">
              Shop by <span className="serif-accent">category</span>
            </h2>
          </div>
          <ShelfArrows targetId="category-shelf" />
        </Reveal>
        <Reveal delay={80}>
          <div
            id="category-shelf"
            className="no-scrollbar -mx-4 flex snap-x snap-proximity scroll-px-4 gap-3 overflow-x-auto scroll-smooth px-4 pb-3 [mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)]"
          >
            <CategoryTile active={category === "all"} onClick={() => pickCategory("all")} icon="LayoutGrid" label="Everything" count={products.length} />
            {categories.map((c) => (
              <CategoryTile
                key={c.id}
                active={category === c.id}
                onClick={() => pickCategory(c.id)}
                icon={c.icon}
                label={c.name}
                count={counts.get(c.id) ?? 0}
              />
            ))}
          </div>
        </Reveal>
      </section>

      {/* Catalog */}
      <section id="shop" ref={shopRef} className="mx-auto mt-16 max-w-7xl scroll-mt-24 px-4 pb-24">
        <Reveal className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="eyebrow">
              <span className="tabular">{filtered.length}</span> {filtered.length === 1 ? "result" : "results"}
            </p>
            <h2 className="section-title mt-2">{category === "all" ? "All products" : catById(category)?.name}</h2>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setMobileFilters(true)} className="btn-ghost lg:hidden" type="button">
              <SlidersHorizontal className="h-4 w-4" /> Filters
              {activeFilters > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[11px] text-white">{activeFilters}</span>
              )}
            </button>
            <label className="relative">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="input cursor-pointer appearance-none !rounded-full pr-10 font-medium"
              >
                {SORTS.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            </label>
          </div>
        </Reveal>

        {query.trim().length > 0 && query.trim().length < MIN_SEARCH && (
          <p className="mb-4 rounded-2xl border border-hairline bg-surface-2 px-4 py-3 text-sm text-muted">
            Keep typing — search starts at {MIN_SEARCH} characters.
          </p>
        )}

        <div className="flex gap-8">
          <aside className="hidden w-64 shrink-0 lg:block">
            <div className="sticky top-24">
              <Filters brands={brands} priceBounds={priceBounds} state={filters} setState={setFilters} onReset={resetFilters} />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            {!hydrated ? (
              <GridSkeleton />
            ) : loadError && products.length === 0 ? (
              <ErrorState message={loadError} onRetry={() => refresh().catch(() => {})} />
            ) : pageItems.length === 0 ? (
              <EmptyState
                onReset={() => {
                  setQuery("");
                  setCategory("all");
                  resetFilters();
                }}
              />
            ) : (
              <m.div layout className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3">
                <AnimatePresence mode="popLayout" initial={false}>
                  {pageItems.map((p, i) => (
                    <ProductCard key={p.id} product={p} category={catById(p.categoryId)} onView={setSelected} index={i} />
                  ))}
                </AnimatePresence>
              </m.div>
            )}

            <Pagination page={current} totalPages={totalPages} onChange={goToPage} />
          </div>
        </div>
      </section>

      {/* Mobile filters sheet */}
      <AnimatePresence>
        {mobileFilters && (
          <m.div className="fixed inset-0 z-[90] lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={() => setMobileFilters(false)} />
            <m.div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.22 } }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 120 || info.velocity.y > 600) setMobileFilters(false);
              }}
              className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[30px] border-t border-hairline bg-page p-4 pb-[max(1rem,env(safe-area-inset-bottom))] no-scrollbar"
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-hairline-strong" aria-hidden />
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold tracking-tight text-content">Filters</h3>
                <button onClick={() => setMobileFilters(false)} className="icon-btn" aria-label="Close filters" type="button">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <Filters brands={brands} priceBounds={priceBounds} state={filters} setState={setFilters} onReset={resetFilters} />
              <button onClick={() => setMobileFilters(false)} className="btn-primary mt-4 w-full" type="button">
                Show {filtered.length} results
              </button>
            </m.div>
          </m.div>
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

function BrandMarquee({ brands }: { brands: string[] }) {
  if (brands.length < 4) return null;
  const items = [...brands, ...brands];
  return (
    <div className="marquee mx-auto mt-6 max-w-7xl overflow-hidden px-4 py-4" aria-label="Brands we carry">
      <div
        className="marquee__track flex w-max items-center gap-12"
        style={{ ["--marquee-duration" as string]: `${Math.max(24, brands.length * 4)}s` }}
      >
        {items.map((b, i) => (
          <span
            key={`${b}-${i}`}
            aria-hidden={i >= brands.length}
            className="whitespace-nowrap text-[clamp(1.25rem,2.6vw,1.75rem)] font-semibold tracking-[-0.03em] text-faint transition-colors hover:text-content"
          >
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

function ShelfArrows({ targetId }: { targetId: string }) {
  const scroll = (dir: number) => {
    const el = document.getElementById(targetId);
    el?.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.7), behavior: "smooth" });
  };
  return (
    <div className="hidden gap-2 sm:flex">
      <button type="button" className="icon-btn" onClick={() => scroll(-1)} aria-label="Scroll categories left">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" className="icon-btn" onClick={() => scroll(1)} aria-label="Scroll categories right">
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}

function CategoryTile({
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
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group flex w-[118px] shrink-0 snap-start flex-col items-center gap-3 rounded-[26px] p-2 text-center outline-none transition active:scale-95 sm:w-[132px]"
    >
      <span
        className={cn(
          "relative grid aspect-square w-full place-items-center rounded-[24px] border transition-all duration-500 ease-spring",
          active
            ? "border-brand-400/60 bg-brand-500/10 shadow-glow"
            : "border-hairline bg-surface-solid group-hover:-translate-y-1 group-hover:border-hairline-strong group-hover:shadow-soft",
        )}
      >
        <Icon
          name={icon}
          className={cn(
            "h-9 w-9 transition-transform duration-500 ease-spring group-hover:scale-110",
            active ? "text-brand-500 dark:text-brand-300" : "text-content",
          )}
          strokeWidth={1.4}
        />
      </span>
      <span className="leading-tight">
        <span className={cn("block text-[13.5px] font-semibold", active ? "text-content" : "text-content2")}>{label}</span>
        <span className="tabular text-[12px] text-faint">{count} items</span>
      </span>
    </button>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-3" aria-busy="true" aria-label="Loading products">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[26px] border border-hairline bg-surface-solid">
          <div className="skeleton aspect-square rounded-none" />
          <div className="space-y-2 p-5">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-4 w-4/5" />
            <div className="skeleton mt-4 h-6 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid place-items-center rounded-[28px] border border-hairline bg-surface-solid px-6 py-20 text-center">
      <BrandLoader size={44} label="Reconnecting" />
      <h3 className="mt-6 text-lg font-semibold text-content">We couldn&apos;t load the store</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      <button onClick={onRetry} className="btn-primary mt-5" type="button">
        <RefreshCw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="grid place-items-center rounded-[28px] border border-dashed border-hairline-strong px-6 py-20 text-center">
      <div className="mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-surface-2">
        <PackageOpen className="h-8 w-8 text-brand-400" strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-content">Nothing matches that — yet</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">Try another search or loosen the filters. New stock lands every week.</p>
      <button onClick={onReset} className="btn-primary mt-5" type="button">
        Clear everything
      </button>
    </div>
  );
}
