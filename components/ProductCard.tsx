"use client";

import { motion } from "framer-motion";
import { Eye, Star } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  buildWhatsAppLink,
  cn,
  discountPercent,
  effectivePrice,
  formatPrice,
  stockStatus,
} from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { Icon } from "./Icon";
import { WhatsAppIcon } from "./SocialIcons";

export function ProductCard({
  product,
  category,
  onView,
}: {
  product: Product;
  category?: Category;
  onView: (p: Product) => void;
}) {
  const { settings } = useStore();
  const stock = stockStatus(product);
  const discount = discountPercent(product);
  const soldOut = product.quantity <= 0;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group relative flex flex-col overflow-hidden rounded-2xl glass shadow-card transition-all duration-300 hover:border-brand-400/40 hover:shadow-glow"
    >
      {/* Media */}
      <button
        onClick={() => onView(product)}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-[var(--img-bg)]"
        aria-label={`View ${product.name}`}
      >
        <ProductImage
          src={product.images[0]}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/70 via-transparent to-transparent opacity-70" />

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {product.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-500/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              <Star className="h-3 w-3" fill="currentColor" /> Featured
            </span>
          )}
          {discount > 0 && (
            <span className="rounded-full bg-cyber-500/90 px-2.5 py-1 text-[11px] font-bold text-ink-950 backdrop-blur">
              -{discount}%
            </span>
          )}
        </div>

        {soldOut && (
          <div className="absolute inset-0 grid place-items-center bg-ink-950/60 backdrop-blur-[2px]">
            <span className="rounded-full border border-white/20 bg-ink-900/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-200">
              Sold out
            </span>
          </div>
        )}

        {/* Hover quick-view */}
        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex translate-y-2 items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white opacity-0 backdrop-blur transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
          <Eye className="h-3.5 w-3.5" /> Quick view
        </span>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {category && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-brand-300">
              <Icon name={category.icon} className="h-3.5 w-3.5" />
              {category.name}
            </span>
          )}
          <span className="text-[11px] font-medium text-faint">{product.brand}</span>
        </div>

        <button
          onClick={() => onView(product)}
          className="text-left text-[15px] font-semibold leading-snug text-content transition hover:text-brand-500 dark:hover:text-brand-200"
        >
          {product.name}
        </button>

        <div className="mt-2 flex items-center gap-1.5">
          <StockDot tone={stock.tone} />
          <span
            className={cn(
              "text-xs font-medium",
              stock.tone === "out"
                ? "text-rose-600 dark:text-rose-300"
                : stock.tone === "low"
                  ? "text-amber-600 dark:text-amber-300"
                  : "text-emerald-600 dark:text-emerald-300",
            )}
          >
            {stock.label}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-4">
          <div className="leading-none">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-extrabold text-content">
                {formatPrice(effectivePrice(product), settings)}
              </span>
            </div>
            {discount > 0 && (
              <span className="text-xs font-medium text-faint line-through">
                {formatPrice(product.price, settings)}
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
          <a
            href={buildWhatsAppLink(product, settings)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("btn-whatsapp !py-2 text-[13px]", soldOut && "pointer-events-none opacity-50")}
            aria-disabled={soldOut}
          >
            <WhatsAppIcon className="h-4 w-4" />
            Buy now
          </a>
          <button
            onClick={() => onView(product)}
            className="btn-ghost !px-3 !py-2"
            aria-label={`View details for ${product.name}`}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function StockDot({ tone }: { tone: "in" | "low" | "out" }) {
  return (
    <span
      className={cn(
        "relative flex h-2 w-2",
        tone === "out" && "opacity-70",
      )}
    >
      {tone !== "out" && (
        <span
          className={cn(
            "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
            tone === "in" ? "bg-emerald-400" : "bg-amber-400",
          )}
        />
      )}
      <span
        className={cn(
          "relative inline-flex h-2 w-2 rounded-full",
          tone === "in" && "bg-emerald-400",
          tone === "low" && "bg-amber-400",
          tone === "out" && "bg-rose-400",
        )}
      />
    </span>
  );
}
