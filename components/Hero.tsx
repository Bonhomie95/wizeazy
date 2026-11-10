"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion, type PanInfo } from "framer-motion";
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Command, Search, ShieldCheck, Truck } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Category, Product } from "@/lib/types";
import { buildWhatsAppLink, cn, discountPercent, effectivePrice, formatPrice } from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { Icon } from "./Icon";
import { WhatsAppIcon } from "./SocialIcons";

export function Hero({
  query,
  setQuery,
  productCount,
  inStock,
  featured,
  categories,
  onView,
  onPickCategory,
}: {
  query: string;
  setQuery: (v: string) => void;
  productCount: number;
  inStock: number;
  featured: Product[];
  categories: Category[];
  onView: (p: Product) => void;
  onPickCategory: (id: string) => void;
}) {
  const { settings } = useStore();
  const quick = categories.slice(0, 4);

  return (
    <section className="relative overflow-hidden pb-8 pt-28 sm:pt-32 lg:pb-16">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 lg:grid-cols-[1.05fr_1fr] lg:gap-8">
        {/* Copy */}
        <div className="min-w-0 text-center lg:text-left">
          <p className="rise eyebrow justify-center lg:justify-start" style={{ ["--rise-delay" as string]: "40ms" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="tabular">{inStock}</span> devices in stock now
          </p>

          <h1 className="rise mt-5 text-balance text-[clamp(2.6rem,7vw,5.4rem)] font-semibold leading-[0.98] tracking-[-0.045em] text-content">
            The gadgets you want.
            <br />
            <span className="serif-accent relative inline-block pr-2 text-[1.06em] text-brand-500 dark:text-brand-300">
              One chat away.
              <svg
                viewBox="0 0 300 20"
                preserveAspectRatio="none"
                className="absolute -bottom-2 left-0 h-3 w-full text-[#25D366]"
                aria-hidden
              >
                <path
                  d="M3 14C60 5 130 3 297 11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                  pathLength={1}
                  className="hero-squiggle"
                />
              </svg>
            </span>
          </h1>

          <p
            className="rise mx-auto mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-muted lg:mx-0"
            style={{ ["--rise-delay" as string]: "120ms" }}
          >
            {settings.tagline}
          </p>

          {/* Search */}
          <div className="rise mx-auto mt-8 max-w-xl lg:mx-0" style={{ ["--rise-delay" as string]: "180ms" }}>
            <label
              htmlFor="store-search"
              className="group flex items-center gap-3 rounded-full border border-hairline bg-surface-solid/80 p-1.5 pl-5 shadow-soft backdrop-blur-xl transition-[box-shadow,border-color] duration-300 focus-within:border-brand-400/60 focus-within:shadow-[0_0_0_6px_rgba(124,58,237,0.12)]"
            >
              <Search className="h-5 w-5 shrink-0 text-muted transition-colors group-focus-within:text-brand-400" />
              <input
                id="store-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                }}
                placeholder={`Search ${productCount} products…`}
                className="w-0 min-w-0 flex-1 bg-transparent py-2.5 text-[16px] text-content placeholder:text-faint focus:outline-none [&::-webkit-search-cancel-button]:hidden"
                aria-label="Search products"
                autoComplete="off"
              />
              <kbd className="mr-1 hidden items-center gap-0.5 rounded-lg border border-hairline px-2 py-1 text-[11px] font-medium text-faint md:inline-flex">
                <Command className="h-3 w-3" />K
              </kbd>
              <a href="#shop" className="btn-primary shrink-0 !min-h-[2.75rem] !px-5">
                Shop <ArrowRight className="h-4 w-4" />
              </a>
            </label>
            {quick.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 lg:justify-start">
                <span className="text-xs font-medium text-faint">Popular:</span>
                {quick.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPickCategory(c.id)}
                    className="chip transition hover:border-hairline-strong hover:text-content active:scale-95"
                  >
                    <Icon name={c.icon} className="h-3.5 w-3.5" />
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div
            className="rise mx-auto mt-9 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[13px] font-medium text-muted lg:justify-start"
            style={{ ["--rise-delay" as string]: "260ms" }}
          >
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-brand-400" /> 100% genuine
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-brand-400" /> Fast nationwide delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-400" /> Warranty included
            </span>
          </div>
        </div>

        {/* Stage */}
        {featured.length > 0 && <FeaturedStage products={featured} onView={onView} />}
      </div>
    </section>
  );
}

/* ---------------- Featured product stage ---------------- */

const AUTOPLAY_MS = 4800;

function FeaturedStage({ products, onView }: { products: Product[]; onView: (p: Product) => void }) {
  const { settings, categories } = useStore();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref);
  const count = products.length;

  const go = useCallback(
    (delta: number) => {
      setDir(delta > 0 ? 1 : -1);
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (paused || reduce || !visible || count < 2) return;
    const t = window.setInterval(() => {
      if (document.visibilityState === "visible") go(1);
    }, AUTOPLAY_MS);
    return () => window.clearInterval(t);
  }, [paused, reduce, visible, count, go]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(-1);
  };

  const current = products[index];
  const discount = discountPercent(current);
  const cat = categories.find((c) => c.id === current.categoryId);

  return (
    <div
      ref={ref}
      className="rise relative mx-auto w-full min-w-0 max-w-[520px] pt-6"
      style={{ ["--rise-delay" as string]: "160ms" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured products"
    >
      {/* spotlight */}
      <div className="pointer-events-none absolute inset-x-[-14%] top-[2%] -z-10 aspect-square rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.28),rgba(124,58,237,0.08)_55%,transparent)]" />
      <div className="pointer-events-none absolute inset-[6%] -z-10 rounded-full border border-dashed border-hairline-strong opacity-60 animate-spin-slow" />

      {/* stacked cards behind */}
      <div className="relative aspect-[4/4.6] w-full sm:aspect-[4/4.2]">
        {[2, 1].map((depth) =>
          count > depth ? (
            <div
              key={depth}
              aria-hidden
              className="absolute inset-0 rounded-[32px] border border-hairline bg-surface-solid shadow-soft transition-transform duration-700 ease-spring"
              style={{ transform: `translateY(${-depth * 22}px) scale(${1 - depth * 0.045})`, opacity: 1 - depth * 0.28 }}
            />
          ) : null,
        )}

        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <m.article
            key={current.id}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 60, rotate: d * 2.5, scale: 0.96 }),
              center: { opacity: 1, x: 0, rotate: 0, scale: 1 },
              exit: (d: number) => ({ opacity: 0, x: d * -80, rotate: d * -3, scale: 0.94, transition: { duration: 0.28 } }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            drag={count > 1 ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={onDragEnd}
            className="absolute inset-0 flex cursor-grab touch-pan-y flex-col overflow-hidden rounded-[32px] border border-hairline bg-surface-solid shadow-lift active:cursor-grabbing"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}: ${current.name}`}
          >
            <div className="relative flex-1 overflow-hidden bg-[var(--img-bg)]">
              <button
                type="button"
                onClick={() => onView(current)}
                className="absolute inset-0"
                aria-label={`View ${current.name}`}
              >
                <ProductImage src={current.images[0]} alt={current.name} fit="contain" priority className="absolute inset-0" />
              </button>
              <div className="pointer-events-none absolute left-4 top-4 flex gap-2">
                {cat && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-[12px] font-semibold text-zinc-800 backdrop-blur">
                    <Icon name={cat.icon} className="h-3.5 w-3.5" />
                    {cat.name}
                  </span>
                )}
                {discount > 0 && (
                  <span className="rounded-full bg-deal-600 px-2.5 py-1.5 text-[12px] font-bold text-white">−{discount}%</span>
                )}
              </div>
            </div>
            <div className="flex items-end justify-between gap-4 p-5">
              <div className="min-w-0">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-faint">{current.brand}</p>
                <p className="mt-1 line-clamp-1 text-[19px] font-semibold tracking-tight text-content">{current.name}</p>
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="tabular text-[22px] font-semibold tracking-tight text-content">
                    {formatPrice(effectivePrice(current), settings)}
                  </span>
                  {discount > 0 && (
                    <s className="tabular text-sm text-faint">{formatPrice(current.price, settings)}</s>
                  )}
                </p>
              </div>
              <a
                href={buildWhatsAppLink(current, settings)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn("btn-whatsapp shrink-0", current.quantity <= 0 && "pointer-events-none opacity-50")}
                onPointerDownCapture={(e) => e.stopPropagation()}
              >
                <WhatsAppIcon className="h-4 w-4" /> Buy
              </a>
            </div>
          </m.article>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className="mt-6 flex items-center justify-center gap-3">
          <button type="button" className="icon-btn" onClick={() => go(-1)} aria-label="Previous featured product">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-0.5" role="tablist" aria-label="Choose featured product">
            {products.map((p, i) => (
              <button
                key={p.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Show ${p.name}`}
                onClick={() => {
                  setDir(i > index ? 1 : -1);
                  setIndex(i);
                }}
                className="group grid h-7 min-w-7 place-items-center px-1"
              >
                <span
                  className={cn(
                    "block h-1.5 rounded-full transition-all duration-500 ease-spring",
                    i === index ? "w-7 bg-content" : "w-1.5 bg-hairline-strong group-hover:bg-muted",
                  )}
                />
              </button>
            ))}
          </div>
          <button type="button" className="icon-btn" onClick={() => go(1)} aria-label="Next featured product">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function useInView(ref: React.RefObject<HTMLElement>) {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}
