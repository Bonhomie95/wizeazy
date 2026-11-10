import type { Product, Spec, StoreSettings } from "./types";

/**
 * Server-side input validation for every write endpoint.
 *
 * Whitelists fields (no mass-assignment: unknown keys are dropped, so a
 * request can't smuggle `_id`, `createdAt`, `$where` or dotted paths into
 * Mongo), coerces types and enforces length/size limits. Never trust the
 * client — the importer validates in the browser, and again here.
 */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export const ID_RE = /^[\w-]{1,64}$/;
export const isSafeId = (v: unknown): v is string => typeof v === "string" && ID_RE.test(v);

export const LIMITS = {
  name: 200,
  brand: 80,
  description: 5000,
  sku: 64,
  images: 10,
  url: 2048,
  specs: 30,
  specLabel: 60,
  specValue: 200,
  price: 1e11,
  quantity: 1e7,
  categoryName: 60,
} as const;

const collapse = (s: string) => s.replace(/\s+/g, " ").trim();
const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : NaN;
}

export function safeImageUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s || s.length > LIMITS.url) return null;
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function cleanSpecs(v: unknown): Spec[] {
  if (!Array.isArray(v)) return [];
  const out: Spec[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const label = collapse(str((item as Spec).label)).slice(0, LIMITS.specLabel);
    const value = collapse(str((item as Spec).value)).slice(0, LIMITS.specValue);
    if (label && value) out.push({ label, value });
    if (out.length >= LIMITS.specs) break;
  }
  return out;
}

export interface SanitizedProduct {
  set: Partial<Omit<Product, "id">>;
  unset: (keyof Product)[];
}

/**
 * mode "create": required fields enforced, defaults applied.
 * mode "patch": only the fields present are validated and returned.
 */
export function sanitizeProduct(body: unknown, mode: "create" | "patch"): Result<SanitizedProduct> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid product data." };
  const b = body as Record<string, unknown>;
  const has = (k: string) => Object.prototype.hasOwnProperty.call(b, k) && b[k] !== undefined;
  const set: SanitizedProduct["set"] = {};
  const unset: SanitizedProduct["unset"] = [];

  if (mode === "create" || has("name")) {
    const name = collapse(str(b.name)).slice(0, LIMITS.name);
    if (!name) return { ok: false, error: "Product name is required." };
    set.name = name;
  }
  if (mode === "create" || has("categoryId")) {
    if (!isSafeId(b.categoryId)) return { ok: false, error: "A category is required." };
    set.categoryId = b.categoryId;
  }
  if (mode === "create" || has("brand")) {
    set.brand = collapse(str(b.brand)).slice(0, LIMITS.brand) || "Generic";
  }
  if (mode === "create" || has("price")) {
    const price = num(b.price);
    if (price === null || Number.isNaN(price) || price < 0 || price > LIMITS.price) {
      return { ok: false, error: "Enter a valid price." };
    }
    set.price = Math.round(price * 100) / 100;
  }
  if (has("salePrice") || b.salePrice === null) {
    const sale = num(b.salePrice);
    const ref = set.price ?? null;
    if (sale === null || Number.isNaN(sale) || sale <= 0 || (ref !== null && sale >= ref)) {
      if (mode === "patch") unset.push("salePrice");
    } else if (sale <= LIMITS.price) {
      set.salePrice = Math.round(sale * 100) / 100;
    }
  }
  if (mode === "create" || has("quantity")) {
    const q = num(b.quantity);
    const quantity = q === null || Number.isNaN(q) ? 0 : Math.floor(q);
    if (quantity < 0 || quantity > LIMITS.quantity) return { ok: false, error: "Enter a valid stock quantity." };
    set.quantity = quantity;
  }
  if (has("description")) {
    const d = str(b.description).replace(/\r\n?/g, "\n").trim().slice(0, LIMITS.description);
    if (d) set.description = d;
    else if (mode === "patch") unset.push("description");
  }
  if (mode === "create" || has("images")) {
    const list = Array.isArray(b.images) ? b.images : [];
    const urls: string[] = [];
    for (const v of list) {
      const u = safeImageUrl(v);
      if (u && !urls.includes(u)) urls.push(u);
      if (urls.length >= LIMITS.images) break;
    }
    set.images = urls;
  }
  if (has("specs")) {
    const specs = cleanSpecs(b.specs);
    if (specs.length) set.specs = specs;
    else if (mode === "patch") unset.push("specs");
  }
  if (mode === "create" || has("featured")) set.featured = b.featured === true || b.featured === "true";
  if (has("sku")) {
    const sku = collapse(str(b.sku)).slice(0, LIMITS.sku);
    if (sku) set.sku = sku;
    else if (mode === "patch") unset.push("sku");
  }
  return { ok: true, value: { set, unset } };
}

/** For batch creates: accept a client createdAt only if it's plausible (keeps file order). */
export function sanitizeCreatedAt(v: unknown): number {
  const now = Date.now();
  return typeof v === "number" && Number.isFinite(v) && Math.abs(now - v) < 864e5 ? Math.floor(v) : now;
}

/* ---------------- Categories & settings ---------------- */

export function sanitizeCategory(body: unknown, mode: "create" | "patch"): Result<{ name?: string; icon?: string }> {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid request body." };
  const b = body as Record<string, unknown>;
  const out: { name?: string; icon?: string } = {};
  if (mode === "create" || b.name !== undefined) {
    const name = collapse(str(b.name)).slice(0, LIMITS.categoryName);
    if (!name) return { ok: false, error: "Category name is required." };
    out.name = name;
  }
  if (b.icon !== undefined) {
    const icon = str(b.icon);
    out.icon = /^[A-Za-z0-9]{1,40}$/.test(icon) ? icon : "Tag";
  }
  return { ok: true, value: out };
}

const SETTINGS_RULES: Record<keyof StoreSettings, (v: string) => string> = {
  storeName: (v) => collapse(v).slice(0, 60),
  tagline: (v) => collapse(v).slice(0, 200),
  currency: (v) => v.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3),
  currencySymbol: (v) => v.trim().slice(0, 4),
  whatsapp: (v) => v.replace(/\D/g, "").slice(0, 15),
  instagram: (v) => v.trim().replace(/^@+/, "").replace(/[^\w.]/g, "").slice(0, 40),
  snapchat: (v) => v.trim().replace(/^@+/, "").replace(/[^\w.-]/g, "").slice(0, 40),
  telegram: (v) => v.trim().replace(/^@+/, "").replace(/[^\w]/g, "").slice(0, 40),
};

export function sanitizeSettings(body: unknown): Result<Partial<StoreSettings>> {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "Invalid request body." };
  const out: Partial<StoreSettings> = {};
  for (const [key, rule] of Object.entries(SETTINGS_RULES) as [keyof StoreSettings, (v: string) => string][]) {
    const v = (body as Record<string, unknown>)[key];
    if (typeof v === "string") out[key] = rule(v);
  }
  if (Object.keys(out).length === 0) return { ok: false, error: "Nothing to update." };
  return { ok: true, value: out };
}

/** Reads a JSON body with a hard size cap (defends against memory exhaustion). */
export async function readJson(req: Request, maxBytes: number): Promise<Result<unknown>> {
  const declared = Number(req.headers.get("content-length") ?? "0");
  if (declared > maxBytes) return { ok: false, error: "Request is too large." };
  const text = await req.text();
  if (text.length > maxBytes) return { ok: false, error: "Request is too large." };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
}
