import type { Spec } from "../types";
import type { ColumnMapping, FieldKey, HeaderInfo } from "./fields";
import type { CellValue, Sheet } from "./types";

/**
 * Turns raw spreadsheet rows into validated product drafts.
 * Pure + deterministic, so the preview and the final import always agree.
 */

export type IssueLevel = "error" | "warning" | "info";

export interface Issue {
  level: IssueLevel;
  field?: FieldKey;
  message: string;
}

export interface DraftProduct {
  id?: string;
  name: string;
  price: number | null;
  salePrice?: number;
  /** null = the file didn't say (new products get 0, updates keep their stock) */
  quantity: number | null;
  brand?: string;
  categoryNames: string[];
  description?: string;
  images: string[];
  sku?: string;
  featured?: boolean;
  specs: Spec[];
  handle?: string;
}

export type DraftStatus = "ok" | "warning" | "error" | "empty" | "merged";

export interface DraftRow {
  index: number;
  /** Row number as the admin sees it in Excel (1-based, header included). */
  rowNumber: number;
  product: DraftProduct;
  /** Fields that had a value in the file — used for partial updates. */
  provided: FieldKey[];
  issues: Issue[];
  status: DraftStatus;
  mergedInto?: number;
  /** Raw text of editable cells, used to seed inline editors. */
  raw: { name: string; price: string; quantity: string };
}

/** Inline edits made in the review table, keyed by DraftRow.index. */
export interface RowOverride {
  name?: string;
  price?: string;
  quantity?: string;
  categoryId?: string;
  exclude?: boolean;
}

export const MAX = {
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
} as const;

/* ------------------------------------------------------------------ */
/* Cell parsers                                                        */
/* ------------------------------------------------------------------ */

export function cellText(v: CellValue | undefined): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return "";
    return Number.isInteger(v) ? String(v) : String(Number(v.toPrecision(15)));
  }
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  let s = v.replace(/ /g, " ").trim();
  // undo our own CSV formula-escaping ('=…, '+…) so exports round-trip
  if (/^'[=+\-@]/.test(s)) s = s.slice(1);
  return s;
}

export const collapse = (s: string) => s.replace(/\s+/g, " ").trim();

export type ParsedNumber = { ok: true; value: number | null } | { ok: false; raw: string };

/** Understands ₦15,750 · N15k · 1.250.000,50 · 15 750 · "NGN 15750.00". */
export function parseMoney(v: CellValue | undefined): ParsedNumber {
  if (typeof v === "number") return Number.isFinite(v) ? { ok: true, value: v } : { ok: false, raw: String(v) };
  if (typeof v === "boolean") return { ok: false, raw: String(v) };
  const raw = cellText(v);
  if (!raw) return { ok: true, value: null };

  let s = raw.toLowerCase().replace(/[\s'_  ]/g, "");
  s = s.replace(/^(ngn|naira|usd|gbp|eur|ghs|kes|zar|n|₦|\$|£|€|¢)+/, "").replace(/(ngn|naira|usd|only|each|\/=|=)+$/, "");
  let mult = 1;
  const suffix = /^([\d.,]+)(k|m|b)$/.exec(s);
  if (suffix) {
    s = suffix[1];
    mult = suffix[2] === "k" ? 1e3 : suffix[2] === "m" ? 1e6 : 1e9;
  }
  if (!/^-?[\d.,]+$/.test(s)) return { ok: false, raw };

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    s = lastComma > lastDot ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (lastComma !== -1) {
    s = /^-?\d{1,3}(,\d{3})+$/.test(s) ? s.replace(/,/g, "") : /^-?\d+,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (lastDot !== -1 && /^-?\d{1,3}(\.\d{3}){2,}$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s) * mult;
  return Number.isFinite(n) ? { ok: true, value: Math.round(n * 100) / 100 } : { ok: false, raw };
}

export function parseQuantity(v: CellValue | undefined):
  | { ok: true; value: number | null; note?: string }
  | { ok: false; raw: string } {
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return { ok: false, raw: String(v) };
    if (v < 0) return { ok: false, raw: String(v) };
    return Number.isInteger(v) ? { ok: true, value: v } : { ok: true, value: Math.floor(v), note: `rounded down from ${v}` };
  }
  const raw = cellText(v);
  if (!raw) return { ok: true, value: null };
  const s = raw.toLowerCase();
  if (/^(out of stock|sold out|none|nil|n\/a|na|-|0)$/.test(s)) return { ok: true, value: 0 };
  const m = /^(\d[\d,\s]*)(\.0+)?\s*(pcs?|pieces?|units?|qty|nos?|items?|left)?\.?$/.exec(s);
  if (m) return { ok: true, value: Number(m[1].replace(/[,\s]/g, "")) };
  return { ok: false, raw };
}

export function parseBool(v: CellValue | undefined): boolean | undefined | "invalid" {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  const s = cellText(v).toLowerCase();
  if (!s) return undefined;
  if (/^(y|yes|true|1|x|✓|✔|featured|on|show)$/.test(s)) return true;
  if (/^(n|no|false|0|off|hide|-)$/.test(s)) return false;
  return "invalid";
}

/** Converts common "share" links into direct image URLs. */
export function directImageUrl(url: string): { url: string; note?: string } {
  const drive =
    /^https?:\/\/drive\.google\.com\/(?:file\/d\/([\w-]{10,})|open\?id=([\w-]{10,})|uc\?(?:[^#]*&)?id=([\w-]{10,}))/i.exec(url);
  if (drive) {
    const id = drive[1] ?? drive[2] ?? drive[3];
    return { url: `https://lh3.googleusercontent.com/d/${id}`, note: "Google Drive link converted to a direct image link" };
  }
  if (/^https?:\/\/(www\.)?dropbox\.com\//i.test(url)) {
    const next = url.replace(/([?&])dl=[01]/, "$1raw=1");
    return { url: next.includes("raw=1") ? next : `${next}${next.includes("?") ? "&" : "?"}raw=1` };
  }
  return { url };
}

/** Splits a cell into image URLs, keeping commas that live inside a URL (e.g. Cloudinary). */
export function splitImageCell(text: string): string[] {
  return text
    .split(/[\s;|]+|,(?=\s*(?:https?:)?\/\/)|,(?=\s*www\.)/i)
    .map((t) => t.trim().replace(/^["'<([]+|["'>)\],]+$/g, ""))
    .filter(Boolean);
}

export function normaliseImageUrl(token: string): { url?: string; note?: string; invalid?: string } {
  let t = token;
  if (t.startsWith("//")) t = `https:${t}`;
  else if (!/^[a-z][a-z0-9+.-]*:/i.test(t) && /^[\w-]+(\.[\w-]+)+\//.test(t)) t = `https://${t}`;
  let u: URL;
  try {
    u = new URL(t);
  } catch {
    return { invalid: token };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { invalid: token };
  if (t.length > MAX.url) return { invalid: `${token.slice(0, 40)}…` };
  return directImageUrl(u.toString());
}

function stripHtml(s: string): string {
  if (!/<[a-z!/][\s\S]*>/i.test(s)) return s;
  return s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function cleanDescription(s: string): string {
  return stripHtml(s)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseSpecText(text: string): Spec[] {
  return text
    .split(/[;\n|]+/)
    .map((part) => {
      const m = /^\s*([^:=]{1,60})\s*[:=]\s*(.+)$/.exec(part);
      return m ? { label: collapse(m[1]), value: collapse(m[2]) } : null;
    })
    .filter((s): s is Spec => Boolean(s && s.label && s.value));
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n);

/* ------------------------------------------------------------------ */
/* Row → draft                                                         */
/* ------------------------------------------------------------------ */

export function buildDrafts(
  sheet: Sheet,
  header: HeaderInfo,
  mapping: ColumnMapping,
  overrides: Record<number, RowOverride> = {},
): DraftRow[] {
  const dataRows = sheet.rows.slice(header.headerRow + 1);
  const drafts: DraftRow[] = [];

  dataRows.forEach((cells, index) => {
    const at = (key: FieldKey): CellValue | undefined => {
      const col = mapping[key];
      return col === null || col === undefined ? undefined : cells?.[col];
    };
    const ov = overrides[index] ?? {};
    const issues: Issue[] = [];
    const provided = new Set<FieldKey>();
    const product: DraftProduct = { name: "", price: null, quantity: null, categoryNames: [], images: [], specs: [] };
    const rowNumber = header.headerRow + index + 2;

    const allEmpty = !cells || cells.every((c) => cellText(c) === "");
    const rawName = ov.name ?? cellText(at("name"));
    const rawPrice = ov.price ?? cellText(at("price"));
    const rawQty = ov.quantity ?? cellText(at("quantity"));
    const raw = { name: rawName, price: rawPrice, quantity: rawQty };

    if (allEmpty && ov.name === undefined && ov.price === undefined) {
      drafts.push({ index, rowNumber, product, provided: [], issues: [], status: "empty", raw });
      return;
    }

    // name
    let name = collapse(rawName);
    if (name.length > MAX.name) {
      name = name.slice(0, MAX.name).trim();
      issues.push({ level: "warning", field: "name", message: `Name shortened to ${MAX.name} characters` });
    }
    product.name = name;
    if (name) provided.add("name");

    // price (+ sale / compare-at)
    const price = ov.price !== undefined ? parseMoney(ov.price) : parseMoney(at("price"));
    if (!price.ok) {
      issues.push({ level: "error", field: "price", message: `Price “${price.raw}” isn't a number` });
    } else if (price.value === null) {
      issues.push({ level: "error", field: "price", message: "Missing price" });
    } else if (price.value <= 0) {
      issues.push({ level: "error", field: "price", message: "Price must be more than 0" });
    } else if (price.value > MAX.price) {
      issues.push({ level: "error", field: "price", message: "Price looks too large" });
    } else {
      product.price = price.value;
      provided.add("price");
    }

    const compare = parseMoney(at("compareAtPrice"));
    if (compare.ok && compare.value && product.price && compare.value > product.price) {
      product.salePrice = product.price;
      product.price = compare.value;
      provided.add("salePrice");
    }
    const sale = parseMoney(at("salePrice"));
    if (!sale.ok) {
      issues.push({ level: "warning", field: "salePrice", message: `Sale price “${sale.raw}” ignored (not a number)` });
    } else if (sale.value !== null && sale.value > 0 && product.price) {
      if (sale.value < product.price) {
        product.salePrice = sale.value;
        provided.add("salePrice");
      } else {
        issues.push({ level: "warning", field: "salePrice", message: "Sale price ignored — it isn't lower than the price" });
      }
    }

    // stock
    const qty = ov.quantity !== undefined ? parseQuantity(ov.quantity) : parseQuantity(at("quantity"));
    if (!qty.ok) {
      issues.push({ level: "error", field: "quantity", message: `Stock “${qty.raw}” isn't a whole number` });
    } else if (qty.value !== null) {
      if (qty.value > MAX.quantity) {
        issues.push({ level: "error", field: "quantity", message: "Stock looks too large" });
      } else {
        product.quantity = qty.value;
        provided.add("quantity");
        if (qty.note) issues.push({ level: "warning", field: "quantity", message: `Stock ${qty.note}` });
      }
    }

    // brand
    const brand = collapse(cellText(at("brand"))).slice(0, MAX.brand);
    if (brand) {
      product.brand = brand;
      provided.add("brand");
    }

    // category names (comma lists, taxonomy paths "A > B > C")
    const cat = cellText(at("category"));
    if (cat) {
      product.categoryNames = cat
        .split(/[,;|\n]+/)
        .flatMap((part) => {
          const path = part.split(/\s*>\s*|\s*\/\s*/).map(collapse).filter(Boolean);
          return path.reverse(); // most specific first
        })
        .filter((v, i, arr) => v && arr.indexOf(v) === i)
        .slice(0, 8);
      if (product.categoryNames.length) provided.add("category");
    }

    // description (long → short fallback)
    let desc = cleanDescription(cellText(at("description")));
    if (!desc) desc = cleanDescription(cellText(at("shortDescription")));
    if (desc) {
      if (desc.length > MAX.description) {
        desc = desc.slice(0, MAX.description).trim();
        issues.push({ level: "warning", field: "description", message: `Description shortened to ${fmt(MAX.description)} characters` });
      }
      product.description = desc;
      provided.add("description");
    }

    // images
    const tokens = [...splitImageCell(cellText(at("image"))), ...splitImageCell(cellText(at("images")))];
    const bad: string[] = [];
    const notes = new Set<string>();
    for (const t of tokens) {
      const r = normaliseImageUrl(t);
      if (r.invalid) bad.push(r.invalid.length > 32 ? `${r.invalid.slice(0, 31)}…` : r.invalid);
      else if (r.url && !product.images.includes(r.url)) product.images.push(r.url);
      if (r.note) notes.add(r.note);
    }
    if (bad.length) {
      issues.push({ level: "warning", field: "image", message: `Ignored ${bad.length === 1 ? "image" : `${bad.length} images`} that ${bad.length === 1 ? "isn't a link" : "aren't links"}: ${bad.slice(0, 2).map((b) => `“${b}”`).join(", ")}` });
    }
    if (product.images.length > MAX.images) {
      issues.push({ level: "warning", field: "images", message: `Kept the first ${MAX.images} images` });
      product.images = product.images.slice(0, MAX.images);
    }
    notes.forEach((n) => issues.push({ level: "info", field: "image", message: n }));
    if (product.images.length) provided.add("image");

    // sku / id / handle
    const sku = collapse(cellText(at("sku"))).slice(0, MAX.sku);
    if (sku) {
      product.sku = sku;
      provided.add("sku");
    }
    const id = cellText(at("id"));
    if (/^[\w-]{1,64}$/.test(id)) product.id = id;
    const handle = collapse(cellText(at("handle")));
    if (handle) product.handle = handle.toLowerCase();

    // featured
    const featured = parseBool(at("featured"));
    if (featured === "invalid") {
      issues.push({ level: "warning", field: "featured", message: `Featured “${cellText(at("featured"))}” ignored — use yes or no` });
    } else if (featured !== undefined) {
      product.featured = featured;
      provided.add("featured");
    }

    // specs: Specs column, Spec: X columns, Option pairs, weight
    const specs: Spec[] = [...parseSpecText(cellText(at("specs")))];
    for (const sc of header.specColumns) {
      const value = collapse(cellText(cells?.[sc.col]));
      if (value) specs.push({ label: sc.label, value });
    }
    for (const op of header.optionPairs) {
      const label = collapse(cellText(cells?.[op.typeCol]));
      const value = collapse(cellText(cells?.[op.valueCol]));
      if (label && value && !/^(title|default title)$/i.test(label)) specs.push({ label, value });
    }
    const weight = parseMoney(at("weight"));
    if (weight.ok && weight.value && weight.value > 0) specs.push({ label: "Weight", value: `${fmt(weight.value)} kg` });
    const seenSpec = new Set<string>();
    product.specs = specs
      .map((s) => ({ label: s.label.slice(0, MAX.specLabel), value: s.value.slice(0, MAX.specValue) }))
      .filter((s) => {
        const k = s.label.toLowerCase();
        if (seenSpec.has(k)) return false;
        seenSpec.add(k);
        return true;
      })
      .slice(0, MAX.specs);
    if (product.specs.length) provided.add("specs");

    if (!name) {
      // Handle-only rows (Shopify-style extra image rows) are merged below.
      if (!product.handle || (!product.images.length && !product.specs.length)) {
        issues.unshift({ level: "error", field: "name", message: "Missing product name" });
      }
    }

    const status: DraftStatus = issues.some((i) => i.level === "error")
      ? "error"
      : issues.some((i) => i.level === "warning")
        ? "warning"
        : "ok";
    drafts.push({ index, rowNumber, product, provided: Array.from(provided), issues, status, raw });
  });

  mergeContinuationRows(drafts);
  flagDuplicates(drafts);
  return drafts;
}

/** Rows with no name but the same handle as a product row above add their images/specs to it. */
function mergeContinuationRows(drafts: DraftRow[]) {
  const lastByHandle = new Map<string, DraftRow>();
  for (const d of drafts) {
    if (d.status === "empty") continue;
    const h = d.product.handle;
    if (d.product.name) {
      if (h) lastByHandle.set(h, d);
      continue;
    }
    const parent = h ? lastByHandle.get(h) : undefined;
    if (!parent || (!d.product.images.length && !d.product.specs.length)) continue;
    for (const img of d.product.images) {
      if (!parent.product.images.includes(img) && parent.product.images.length < MAX.images) parent.product.images.push(img);
    }
    for (const s of d.product.specs) {
      if (!parent.product.specs.some((p) => p.label.toLowerCase() === s.label.toLowerCase())) parent.product.specs.push(s);
    }
    if (parent.product.images.length && !parent.provided.includes("image")) parent.provided.push("image");
    d.status = "merged";
    d.mergedInto = parent.index;
    d.issues = [{ level: "info", message: `Extra details added to row ${parent.rowNumber}` }];
  }
}

export const nameKey = (s: string) => collapse(s).toLowerCase();

function flagDuplicates(drafts: DraftRow[]) {
  const byName = new Map<string, DraftRow>();
  const bySku = new Map<string, DraftRow>();
  for (const d of drafts) {
    if (d.status === "empty" || d.status === "merged" || d.status === "error") continue;
    const sku = d.product.sku?.toLowerCase();
    const firstSku = sku ? bySku.get(sku) : undefined;
    const key = nameKey(d.product.name);
    const firstName = byName.get(key);
    if (firstSku) {
      d.issues.push({ level: "warning", field: "sku", message: `Same SKU as row ${firstSku.rowNumber}` });
    } else if (firstName) {
      d.issues.push({ level: "warning", field: "name", message: `Same name as row ${firstName.rowNumber}` });
    }
    if (sku && !firstSku) bySku.set(sku, d);
    if (!firstName) byName.set(key, d);
    if ((firstSku || firstName) && d.status === "ok") d.status = "warning";
  }
}
