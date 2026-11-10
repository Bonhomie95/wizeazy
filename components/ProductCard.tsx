"use client";

import { forwardRef } from "react";
import { m } from "framer-motion";
import { Eye, Star } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import { useReveal } from "@/lib/reveal";
import { buildWhatsAppLink, cn, discountPercent, effectivePrice, formatPrice, stockStatus } from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { WhatsAppIcon } from "./SocialIcons";

export const ProductCard = forwardRef<
  HTMLElement,
  { product: Product; category?: Category; onView: (p: Product) => void; index?: number }
>(function ProductCard({ product, category, onView, index = 0 }, forwardedRef) {
  const { settings } = useStore();
  const stock = stockStatus(product);
  const discount = discountPercent(product);
  const soldOut = product.quantity <= 0;
  const revealRef = useReveal<HTMLDivElement>((index % 3) * 70);

  return (
    <m.article
      ref={forwardedRef}
      layout="position"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      className="h-full"
    >
      <div
        ref={revealRef}
        data-reveal="shown"
        className="group relative flex h-full flex-col overflow-hidden rounded-[26px] border border-hairline bg-surface-solid shadow-[var(--shadow-sm)] transition-[transform,box-shadow,border-color] duration-500 ease-spring hover:-translate-y-1.5 hover:border-hairline-strong hover:shadow-lift"
      >
        {/* Media stage */}
        <button
          type="button"
          onClick={() => onView(product)}
          className="relative block aspect-square w-full overflow-hidden bg-[var(--img-bg)]"
          aria-label={`View ${product.name}`}
        >
          <ProductImage
            src={product.images[0]}
            alt={product.name}
            fit="contain"
            className="absolute inset-0 transition-transform duration-700 ease-spring group-hover:scale-[1.06]"
          />

          <div className="absolute left-3 top-3 flex flex-wrap items-start gap-1.5">
            {discount > 0 && (
              <span className="rounded-full bg-deal-600 px-2.5 py-1 text-[11px] font-bold tracking-wide text-white shadow-sm">
                −{discount}%
              </span>
            )}
            {product.featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-zinc-800 shadow-sm backdrop-blur">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Featured
              </span>
            )}
          </div>

          {soldOut && (
            <div className="absolute inset-0 grid place-items-center bg-white/55 backdrop-blur-[2px] dark:bg-black/45">
              <span className="rounded-full bg-zinc-900 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                Sold out
              </span>
            </div>
          )}

          <span className="pointer-events-none absolute inset-x-3 bottom-3 flex translate-y-3 items-center justify-center gap-1.5 rounded-full bg-zinc-900/85 py-2 text-xs font-semibold text-white opacity-0 backdrop-blur transition-all duration-500 ease-spring group-hover:translate-y-0 group-hover:opacity-100">
            <Eye className="h-3.5 w-3.5" /> Quick look
          </span>
        </button>

        {/* Body */}
        <div className="flex flex-1 flex-col p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-[12px] font-medium text-faint">
            <span className="truncate">{product.brand}</span>
            {category && (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{category.name}</span>
              </>
            )}
          </p>
          <h3 className="mt-1">
            <button
              type="button"
              onClick={() => onView(product)}
              className="line-clamp-2 text-left text-[15.5px] font-semibold leading-snug tracking-[-0.01em] text-content transition-colors hover:text-brand-500 dark:hover:text-brand-300"
            >
              {product.name}
            </button>
          </h3>

          <div className="mt-auto flex items-end justify-between gap-2 pt-4">
            <div className="leading-none">
              <span className="tabular text-[20px] font-semibold tracking-[-0.02em] text-content">
                {formatPrice(effectivePrice(product), settings)}
              </span>
              {discount > 0 && (
                <s className="tabular mt-1 block text-xs font-medium text-faint">{formatPrice(product.price, settings)}</s>
              )}
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                stock.tone === "out" && "bg-rose-500/10 text-rose-600 dark:text-rose-300",
                stock.tone === "low" && "bg-amber-500/12 text-amber-700 dark:text-amber-300",
                stock.tone === "in" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  stock.tone === "out" ? "bg-rose-500" : stock.tone === "low" ? "bg-amber-500" : "bg-emerald-500",
                )}
              />
              {stock.label}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
            <a
              href={buildWhatsAppLink(product, settings)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("btn-whatsapp !min-h-[2.6rem]", soldOut && "pointer-events-none opacity-50")}
              aria-disabled={soldOut}
              tabIndex={soldOut ? -1 : undefined}
            >
              <WhatsAppIcon className="h-4 w-4" />
              {soldOut ? "Sold out" : "Buy now"}
            </a>
            <button
              type="button"
              onClick={() => onView(product)}
              className="icon-btn !h-[2.6rem] !w-[2.6rem]"
              aria-label={`Quick look at ${product.name}`}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </m.article>
  );
});
