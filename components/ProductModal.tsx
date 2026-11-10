"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useDragControls } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Package, Share2, X } from "lucide-react";
import type { Category, Product } from "@/lib/types";
import { useStore } from "@/lib/store";
import { buildWhatsAppLink, cn, discountPercent, effectivePrice, formatPrice, socialLinks, stockStatus } from "@/lib/utils";
import { ProductImage } from "./ProductImage";
import { Icon } from "./Icon";
import { WhatsAppIcon, InstagramIcon, SnapchatIcon, TelegramIcon } from "./SocialIcons";

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
  const [copied, setCopied] = useState(false);
  const drag = useDragControls();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setActive(0);
    setCopied(false);
  }, [product?.id]);

  useEffect(() => {
    if (!product) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setActive((i) => Math.min(i + 1, product.images.length - 1));
      if (e.key === "ArrowLeft") setActive((i) => Math.max(i - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => closeRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prevFocus?.focus?.();
    };
  }, [product, onClose]);

  const share = async () => {
    if (!product) return;
    const text = `${product.name} — ${formatPrice(effectivePrice(product), settings)} at ${settings.storeName}`;
    try {
      if (navigator.share) await navigator.share({ title: product.name, text, url: window.location.href });
      else {
        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <AnimatePresence>
      {product && (
        <m.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.2 } }}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden />
          <m.div
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 700) onClose();
            }}
            className="relative z-10 max-h-[94dvh] w-full max-w-5xl overflow-y-auto rounded-t-[32px] border border-hairline bg-page shadow-lift sm:rounded-[32px] no-scrollbar"
          >
            {/* drag handle (mobile) */}
            <div
              className="sticky top-0 z-20 flex justify-center pb-1 pt-2.5 sm:hidden"
              onPointerDown={(e) => drag.start(e)}
              style={{ touchAction: "none" }}
            >
              <span className="h-1.5 w-10 rounded-full bg-hairline-strong" />
            </div>

            <div className="absolute right-4 top-4 z-20 flex gap-2">
              <button onClick={share} className="icon-btn bg-surface-solid/80 backdrop-blur" aria-label="Share product" type="button">
                {copied ? <Check className="h-[18px] w-[18px] text-emerald-500" /> : <Share2 className="h-[18px] w-[18px]" />}
              </button>
              <button ref={closeRef} onClick={onClose} className="icon-btn bg-surface-solid/80 backdrop-blur" aria-label="Close" type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid md:grid-cols-[1.1fr_1fr]">
              {/* Gallery */}
              <div className="p-4 pt-2 sm:p-6">
                <div className="relative aspect-square w-full overflow-hidden rounded-[26px] bg-[var(--img-bg)]">
                  <AnimatePresence mode="wait" initial={false}>
                    <m.div
                      key={active}
                      className="absolute inset-0"
                      initial={{ opacity: 0, scale: 1.03 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.25 }}
                    >
                      <ProductImage src={product.images[active]} alt={product.name} fit="contain" priority className="absolute inset-0" />
                    </m.div>
                  </AnimatePresence>
                  {discountPercent(product) > 0 && (
                    <span className="absolute left-4 top-4 rounded-full bg-deal-600 px-3 py-1.5 text-xs font-bold text-white">
                      −{discountPercent(product)}%
                    </span>
                  )}
                  {product.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous image"
                        disabled={active === 0}
                        onClick={() => setActive((i) => Math.max(0, i - 1))}
                        className="icon-btn absolute left-3 top-1/2 -translate-y-1/2 !bg-white/80 !text-zinc-800 disabled:!opacity-0"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next image"
                        disabled={active === product.images.length - 1}
                        onClick={() => setActive((i) => Math.min(product.images.length - 1, i + 1))}
                        className="icon-btn absolute right-3 top-1/2 -translate-y-1/2 !bg-white/80 !text-zinc-800 disabled:!opacity-0"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
                {product.images.length > 1 && (
                  <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
                    {product.images.map((src, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setActive(i)}
                        className={cn(
                          "relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 bg-[var(--img-bg)] transition",
                          i === active ? "border-brand-500" : "border-transparent opacity-60 hover:opacity-100",
                        )}
                        aria-label={`Image ${i + 1}`}
                        aria-current={i === active}
                      >
                        <ProductImage src={src} alt={`${product.name} ${i + 1}`} fit="contain" compact className="absolute inset-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="flex flex-col p-5 pt-0 sm:p-8 md:pt-16">
                {category && (
                  <span className="chip mb-3 w-fit">
                    <Icon name={category.icon} className="h-3.5 w-3.5" />
                    {category.name}
                  </span>
                )}
                <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-faint">{product.brand}</p>
                <h2 className="mt-1 text-balance text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-[1.08] tracking-[-0.03em] text-content">
                  {product.name}
                </h2>

                <div className="mt-5 flex items-end gap-3">
                  <span className="tabular text-[2rem] font-semibold leading-none tracking-[-0.03em] text-content">
                    {formatPrice(effectivePrice(product), settings)}
                  </span>
                  {discountPercent(product) > 0 && (
                    <s className="tabular pb-0.5 text-base font-medium text-faint">{formatPrice(product.price, settings)}</s>
                  )}
                </div>

                <StockRow product={product} />

                {product.description && (
                  <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-content2">{product.description}</p>
                )}

                {product.specs && product.specs.length > 0 && (
                  <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline">
                    {product.specs.map((s, i) => (
                      <div key={i} className="bg-surface-solid px-4 py-3">
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-faint">{s.label}</dt>
                        <dd className="mt-0.5 text-sm font-semibold text-content">{s.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                <div className="sticky bottom-0 -mx-5 mt-8 border-t border-hairline bg-page/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
                  <a
                    href={buildWhatsAppLink(product, settings)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn("btn-whatsapp w-full !min-h-[3.25rem] text-[15px]", product.quantity <= 0 && "pointer-events-none opacity-50")}
                  >
                    <WhatsAppIcon className="h-5 w-5" />
                    {product.quantity <= 0 ? "Currently unavailable" : "Buy now on WhatsApp"}
                  </a>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <ContactBtn href={socialLinks(settings).instagram} label="Instagram">
                      <InstagramIcon className="h-4 w-4" />
                    </ContactBtn>
                    <ContactBtn href={socialLinks(settings).snapchat} label="Snapchat">
                      <SnapchatIcon className="h-4 w-4" />
                    </ContactBtn>
                    <ContactBtn href={socialLinks(settings).telegram} label="Telegram">
                      <TelegramIcon className="h-4 w-4" />
                    </ContactBtn>
                  </div>
                </div>
              </div>
            </div>
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function StockRow({ product }: { product: Product }) {
  const stock = stockStatus(product);
  return (
    <div className="mt-4 flex items-center gap-3 text-sm">
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          stock.tone === "in" && "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
          stock.tone === "low" && "bg-amber-500/12 text-amber-700 dark:text-amber-300",
          stock.tone === "out" && "bg-rose-500/12 text-rose-700 dark:text-rose-300",
        )}
      >
        {stock.tone === "out" ? <Package className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
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

function ContactBtn({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="btn-ghost !min-h-[2.75rem] !px-3 text-[13px]" aria-label={`Ask on ${label}`}>
      {children}
      <span className="hidden sm:inline">{label}</span>
    </a>
  );
}
