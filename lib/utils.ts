import type { Product, StoreSettings } from "./types";

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatPrice(value: number, settings: StoreSettings) {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value);
  return `${settings.currencySymbol}${formatted}`;
}

export function effectivePrice(p: Product) {
  return p.salePrice && p.salePrice < p.price ? p.salePrice : p.price;
}

export function discountPercent(p: Product) {
  if (!p.salePrice || p.salePrice >= p.price) return 0;
  return Math.round(((p.price - p.salePrice) / p.price) * 100);
}

export function stockStatus(p: Product): {
  label: string;
  tone: "in" | "low" | "out";
} {
  if (p.quantity <= 0) return { label: "Out of stock", tone: "out" };
  if (p.quantity <= 3) return { label: `Only ${p.quantity} left`, tone: "low" };
  return { label: "In stock", tone: "in" };
}

export function buildWhatsAppLink(p: Product, settings: StoreSettings) {
  const price = formatPrice(effectivePrice(p), settings);
  const msg =
    `Hi ${settings.storeName}! 👋 I'm interested in the *${p.name}* ` +
    `(${price}). Is it available?`;
  return `https://wa.me/${settings.whatsapp}?text=${encodeURIComponent(msg)}`;
}

export function socialLinks(settings: StoreSettings) {
  return {
    whatsapp: `https://wa.me/${settings.whatsapp}`,
    instagram: `https://instagram.com/${settings.instagram}`,
    snapchat: `https://snapchat.com/add/${settings.snapchat}`,
    telegram: `https://t.me/${settings.telegram}`,
  };
}

export function uid(prefix = "id") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
