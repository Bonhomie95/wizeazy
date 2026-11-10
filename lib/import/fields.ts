import type { CellValue } from "./types";

/**
 * Target fields an import can fill, with the header aliases we recognise.
 * Covers the Wizeazy template, the "custom import template" (Handle /
 * Product Title / Selling Price / Stock Qty / Collections / Main Image …),
 * plus Shopify, WooCommerce and typical POS exports.
 */

export type FieldKey =
  | "name"
  | "price"
  | "salePrice"
  | "compareAtPrice"
  | "quantity"
  | "category"
  | "brand"
  | "description"
  | "shortDescription"
  | "image"
  | "images"
  | "sku"
  | "featured"
  | "specs"
  | "weight"
  | "handle"
  | "id";

export interface FieldDef {
  key: FieldKey;
  label: string;
  required?: boolean;
  /** essential fields are always visible in the mapping panel */
  essential?: boolean;
  hint?: string;
  aliases: string[];
  /** headers matching this are never auto-mapped to the field by fuzzy match */
  deny?: RegExp;
}

export const FIELDS: FieldDef[] = [
  {
    key: "name",
    label: "Product name",
    required: true,
    essential: true,
    aliases: ["product title", "product name", "title", "name", "item name", "item title", "item", "product", "listing title"],
    deny: /\b(brand|category|collection|vendor|file|image|sku|handle|customer|supplier)\b/,
  },
  {
    key: "price",
    label: "Price",
    required: true,
    essential: true,
    hint: "Selling price customers pay",
    aliases: ["selling price", "price", "variant price", "regular price", "unit price", "retail price", "sales price", "selling price ngn", "price ngn", "amount"],
    deny: /\b(cost|purchase|buying|wholesale|compare|old|was|original|tax|vat|shipping|delivery|weight|sale|discount|promo)\b/,
  },
  {
    key: "quantity",
    label: "Stock",
    essential: true,
    hint: "Units in stock",
    aliases: ["stock qty", "stock quantity", "stock", "quantity", "qty", "inventory", "inventory qty", "variant inventory qty", "quantity in stock", "units in stock", "units", "on hand", "available qty"],
    deny: /\b(min|max|minimum|maximum|reorder|sold|weight|status)\b/,
  },
  {
    key: "category",
    label: "Category",
    essential: true,
    hint: "Matched to your categories",
    aliases: ["category", "categories", "collections", "collection", "product category", "department", "category name", "section"],
  },
  {
    key: "brand",
    label: "Brand",
    essential: true,
    aliases: ["brand", "featured brand", "brand name", "manufacturer", "vendor", "make", "maker"],
  },
  {
    key: "image",
    label: "Main image",
    essential: true,
    hint: "Image link (https://…)",
    aliases: ["main image", "image", "image url", "image src", "image link", "cover image", "featured image", "primary image", "thumbnail", "photo", "picture", "img"],
    deny: /\b(alt|position|count|additional|other|extra|more)\b/,
  },
  {
    key: "salePrice",
    label: "Sale price",
    hint: "Discounted price (optional)",
    aliases: ["sale price", "discount price", "discounted price", "promo price", "promotional price", "offer price", "special price", "deal price"],
  },
  {
    key: "compareAtPrice",
    label: "Original price",
    hint: "Higher “was” price — the selling price becomes the deal",
    aliases: ["compare at price", "variant compare at price", "original price", "old price", "was price", "list price", "rrp", "msrp"],
  },
  {
    key: "description",
    label: "Description",
    aliases: ["description long", "long description", "description", "product description", "full description", "body html", "body", "details", "product details"],
    deny: /\b(short|summary|seo|meta)\b/,
  },
  {
    key: "shortDescription",
    label: "Short description",
    hint: "Used when there's no long description",
    aliases: ["description short", "short description", "summary", "excerpt", "subtitle"],
  },
  {
    key: "images",
    label: "More images",
    hint: "Extra image links, separated by commas or new lines",
    aliases: ["additional images", "more images", "other images", "extra images", "gallery", "gallery images", "images", "image urls", "photos"],
  },
  { key: "sku", label: "SKU", aliases: ["sku", "variant sku", "product code", "item code", "code", "model number", "part number", "mpn"] },
  { key: "featured", label: "Featured", hint: "yes / no", aliases: ["featured", "is featured", "highlight", "show in featured", "spotlight"] },
  { key: "specs", label: "Specs", hint: "“Storage: 256GB; Colour: Black”", aliases: ["specs", "specifications", "spec", "attributes", "features", "tech specs", "technical specifications"] },
  { key: "weight", label: "Weight (kg)", aliases: ["weight kg", "weight", "shipping weight"] },
  { key: "handle", label: "Handle", hint: "Groups rows that belong to one product", aliases: ["handle", "product handle", "parent handle", "url handle", "slug"] },
  { key: "id", label: "Wizeazy ID", hint: "From an export — updates that exact product", aliases: ["wizeazy id", "product id", "id"] },
];

export const FIELD_BY_KEY = Object.fromEntries(FIELDS.map((f) => [f.key, f])) as Record<FieldKey, FieldDef>;

export type ColumnMapping = Partial<Record<FieldKey, number | null>>;

export interface ColumnInfo {
  index: number;
  label: string;
  sample: string;
}

export interface SpecColumn {
  col: number;
  label: string;
}

export interface OptionPair {
  label: string;
  typeCol: number;
  valueCol: number;
}

export interface HeaderInfo {
  headerRow: number;
  columns: ColumnInfo[];
  mapping: ColumnMapping;
  specColumns: SpecColumn[];
  optionPairs: OptionPair[];
}

export function normHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function columnLetter(i: number): string {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Score how well a normalised header matches a field (0 = no match). */
function scoreHeader(header: string, field: FieldDef): number {
  if (!header) return 0;
  let best = 0;
  field.aliases.forEach((alias, idx) => {
    let s = 0;
    if (header === alias) s = 100 - idx;
    else if (field.deny?.test(header)) s = 0;
    else if (header.startsWith(alias + " ")) s = 60 - idx;
    else if (header.endsWith(" " + alias)) s = 40 - idx;
    else if (` ${header} `.includes(` ${alias} `)) s = 20 - idx;
    if (s > best) best = s;
  });
  return best;
}

const cellString = (v: CellValue | undefined): string =>
  v === null || v === undefined ? "" : String(v).trim();

const SPEC_RE = /^\s*spec(?:s|ification)?\s*[:\-–—]\s*(.+)$/i;
const SPEC_SUFFIX_RE = /^(.+?)\s*\((?:spec|specification)\)\s*$/i;
const OPTION_RE = /^(?:option|attribute)\s*(\d+)\s*(type|name|value|values)$/;

/** Builds the field→column mapping for a header row. */
export function autoMap(headers: string[]): {
  mapping: ColumnMapping;
  specColumns: SpecColumn[];
  optionPairs: OptionPair[];
} {
  const norm = headers.map(normHeader);
  const special = new Set<number>();

  // Spec columns ("Spec: Storage") and option pairs ("Option1 Type"/"Option1 Value")
  const specColumns: SpecColumn[] = [];
  const optionParts = new Map<string, { typeCol?: number; valueCol?: number }>();
  headers.forEach((raw, col) => {
    const spec = SPEC_RE.exec(raw) ?? SPEC_SUFFIX_RE.exec(raw);
    if (spec && spec[1].trim()) {
      specColumns.push({ col, label: spec[1].trim() });
      special.add(col);
      return;
    }
    const opt = OPTION_RE.exec(norm[col]);
    if (opt) {
      const entry = optionParts.get(opt[1]) ?? {};
      if (opt[2] === "type" || opt[2] === "name") entry.typeCol = col;
      else entry.valueCol = col;
      optionParts.set(opt[1], entry);
      special.add(col);
    }
  });
  const optionPairs: OptionPair[] = [];
  for (const [n, p] of optionParts) {
    if (p.typeCol !== undefined && p.valueCol !== undefined) {
      optionPairs.push({ label: `Option ${n}`, typeCol: p.typeCol, valueCol: p.valueCol });
    }
  }

  // Greedy best-score assignment so each column feeds at most one field.
  const candidates: { field: FieldDef; col: number; score: number; order: number }[] = [];
  FIELDS.forEach((field, order) => {
    norm.forEach((h, col) => {
      if (special.has(col)) return;
      const score = scoreHeader(h, field);
      if (score >= 18) candidates.push({ field, col, score, order });
    });
  });
  candidates.sort((a, b) => b.score - a.score || a.order - b.order || a.col - b.col);

  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  for (const c of candidates) {
    if (mapping[c.field.key] !== undefined || used.has(c.col)) continue;
    mapping[c.field.key] = c.col;
    used.add(c.col);
  }
  return { mapping, specColumns, optionPairs };
}

/** Finds the header row (skipping title rows above it) and maps columns. */
export function detectHeader(rows: CellValue[][]): HeaderInfo {
  let headerRow = -1;
  let bestHits = 0;
  const scan = Math.min(rows.length, 20);
  for (let r = 0; r < scan; r++) {
    const cells = (rows[r] ?? []).map((v) => (typeof v === "string" ? normHeader(v) : ""));
    const hits = new Set<FieldKey>();
    for (const h of cells) {
      for (const f of FIELDS) if (scoreHeader(h, f) >= 40) hits.add(f.key);
    }
    if (hits.size > bestHits) {
      bestHits = hits.size;
      headerRow = r;
    }
  }
  if (headerRow === -1) {
    headerRow = rows.findIndex((r) => (r ?? []).filter((v) => cellString(v) !== "").length >= 2);
    if (headerRow === -1) headerRow = Math.max(0, rows.findIndex((r) => (r ?? []).some((v) => cellString(v) !== "")));
  }

  const header = rows[headerRow] ?? [];
  const width = Math.max(header.length, ...rows.slice(headerRow + 1, headerRow + 200).map((r) => r?.length ?? 0));
  const seen = new Map<string, number>();
  const labels: string[] = [];
  const columns: ColumnInfo[] = [];
  for (let c = 0; c < width; c++) {
    let label = cellString(header[c]) || `Column ${columnLetter(c)}`;
    const count = (seen.get(label) ?? 0) + 1;
    seen.set(label, count);
    if (count > 1) label = `${label} (${count})`;
    labels.push(cellString(header[c]));
    let sample = "";
    for (let r = headerRow + 1; r < Math.min(rows.length, headerRow + 60) && !sample; r++) {
      sample = cellString(rows[r]?.[c]);
    }
    columns.push({ index: c, label, sample: sample.length > 48 ? `${sample.slice(0, 47)}…` : sample });
  }

  return { headerRow, columns, ...autoMap(labels) };
}
