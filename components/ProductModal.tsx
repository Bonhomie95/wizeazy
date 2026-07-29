"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Package } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import {
  buildWhatsAppLink,
  cn,
  discountPercent,
  effectivePrice,
  formatPrice,
  socialLinks,
  stockStatus,
} from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { Icon } from "./Icon";
import {
  WhatsAppIcon,
  InstagramIcon,
  SnapchatIcon,
  TelegramIcon,
} from "./SocialIcons";

export function ProductModal({
  product,
  category,
  onClose,
}: {
  product: Product | null;
  category?: Category;
  onClose: () => void;
}) {
  const { settings } = useStore();
  const [active, setActive] = useState(0);

  useEffect(() => setActive(0), [product?.id]);

  useEffect(() => {
    if (!product) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [product, onClose]);

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-md"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-3xl glass-strong shadow-card sm:rounded-3xl no-scrollbar"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-xl border border-hairline bg-surface-2 text-content2 backdrop-blur transition hover:bg-surface-hover hover:text-content"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid gap-0 md:grid-cols-2">
              {/* Gallery */}
              <div className="p-4 sm:p-6">
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[var(--img-bg)]">
                  <ProductImage
                    src={product.images[active]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  {discountPercent(product) > 0 && (
                    <span className="absolute left-3 top-3 rounded-full bg-cyber-500/90 px-2.5 py-1 text-xs font-bold text-ink-950">
                      -{discountPercent(product)}%
                    </span>
                  )}
                </div>
                {product.images.length > 1 && (
                  <div className="mt-3 flex gap-2">
                    {product.images.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={cn(
                          "relative h-16 w-16 overflow-hidden rounded-xl border transition",
                          i === active
                            ? "border-brand-400 ring-2 ring-brand-400/40"
                            : "border-hairline opacity-70 hover:opacity-100",
                        )}
                        aria-label={`Image ${i + 1}`}
                      >
                        <ProductImage
                          src={src}
                          alt={`${product.name} ${i + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col p-4 pt-0 sm:p-6 md:pt-16">
                {category && (
                  <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-full border border-brand-400/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-600 dark:text-brand-200">
                    <Icon name={category.icon} className="h-3.5 w-3.5" />
                    {category.name}
                  </span>
                )}
                <h2 className="text-2xl font-extrabold leading-tight text-content">
                  {product.name}
                </h2>
                <p className="mt-1 text-sm text-muted">by {product.brand}</p>

                <div className="mt-4 flex items-end gap-3">
                  <span className="text-3xl font-extrabold text-content">
                    {formatPrice(effectivePrice(product), settings)}
                  </span>
                  {discountPercent(product) > 0 && (
                    <span className="pb-1 text-base font-medium text-faint line-through">
                      {formatPrice(product.price, settings)}
                    </span>
                  )}
                </div>

                <StockRow product={product} />

                {product.description && (
                  <p className="mt-4 text-sm leading-relaxed text-content2">
                    {product.description}
                  </p>
                )}

                {product.specs && product.specs.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {product.specs.map((s, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-hairline bg-surface-2 px-3 py-2"
                      >
                        <div className="text-[11px] uppercase tracking-wide text-faint">
                          {s.label}
                        </div>
                        <div className="text-sm font-semibold text-content">
                          {s.value}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Buy actions */}
                <div className="mt-6">
                  <a
                    href={buildWhatsAppLink(product, settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "btn-whatsapp w-full text-[15px]",
                      product.quantity <= 0 && "pointer-events-none opacity-50",
                    )}
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    {product.quantity <= 0 ? "Currently unavailable" : "Buy now on WhatsApp"}
                  </a>
                  <p className="mt-2 text-center text-xs text-faint">
                    or reach us on your favourite app
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <ContactBtn
                      href={socialLinks(settings).instagram}
                      label="Instagram"
                    >
                      <InstagramIcon className="h-4 w-4" />
                    </ContactBtn>
                    <ContactBtn
                      href={socialLinks(settings).snapchat}
                      label="Snapchat"
                    >
                      <SnapchatIcon className="h-4 w-4" />
                    </ContactBtn>
                    <ContactBtn
                      href={socialLinks(settings).telegram}
                      label="Telegram"
                    >
                      <TelegramIcon className="h-4 w-4" />
                    </ContactBtn>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function StockRow({ product }: { product: Product }) {
  const stock = stockStatus(product);
  return (
    <div className="mt-3 flex items-center gap-3 text-sm">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          stock.tone === "in" && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
          stock.tone === "low" && "bg-amber-500/15 text-amber-600 dark:text-amber-300",
          stock.tone === "out" && "bg-rose-500/15 text-rose-600 dark:text-rose-300",
        )}
      >
        {stock.tone === "out" ? (
          <Package className="h-3.5 w-3.5" />
        ) : (
          <Check className="h-3.5 w-3.5" />
        )}
        {stock.label}
      </span>
      {product.quantity > 0 && (
        <span className="text-xs text-faint">
          {product.quantity} unit{product.quantity > 1 ? "s" : ""} available
        </span>
      )}
    </div>
  );
}

function ContactBtn({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-xs font-medium text-content2 transition hover:bg-surface-hover hover:text-content"
    >
      {children}
      {label}
    </a>
  );
}
