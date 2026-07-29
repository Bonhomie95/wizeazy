"use client";

import { motion } from "framer-motion";
import { Search, Sparkles, ArrowRight, ShieldCheck, Truck, BadgeCheck } from "lucide-react";
import { useStore } from "@/lib/store";

export function Hero({
  query,
  setQuery,
  productCount,
}: {
  query: string;
  setQuery: (v: string) => void;
  productCount: number;
}) {
  const { settings } = useStore();

  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32">
      {/* decorative orbs */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-cyber-500/10 blur-3xl" />

      <div className="mx-auto max-w-7xl px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="chip mx-auto mb-5 border-brand-400/30 !text-brand-500 dark:!text-brand-200">
            <Sparkles className="h-3.5 w-3.5" />
            Authentic gadgets · unbeatable prices
          </span>

          <h1 className="text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-content sm:text-6xl">
            The smartest way to shop{" "}
            <span className="text-gradient">phones, laptops & tech</span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-base text-muted sm:text-lg">
            {settings.tagline}
          </p>

          {/* Search */}
          <div className="mx-auto mt-8 flex max-w-xl items-center gap-2 rounded-2xl glass p-2 shadow-card focus-within:border-brand-400/50">
            <div className="flex flex-1 items-center gap-2 pl-2">
              <Search className="h-5 w-5 shrink-0 text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products or categories…"
                className="w-full bg-transparent py-2.5 text-sm text-content placeholder:text-faint focus:outline-none"
                aria-label="Search products"
              />
            </div>
            <a href="#shop" className="btn-primary shrink-0">
              Explore <ArrowRight className="h-4 w-4" />
            </a>
          </div>
          <p className="mt-2 text-xs text-faint">
            Type at least 3 characters to filter · {productCount} products in stock
          </p>

          {/* Trust badges */}
          <div className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-4 w-4 text-brand-400" /> 100% Genuine products
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 text-brand-400" /> Fast nationwide delivery
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-brand-400" /> Warranty on every device
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
