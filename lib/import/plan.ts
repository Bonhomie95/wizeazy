import type { Category, Product, Spec } from "../types";
import { chooseCategory, type CategoryChoice, type CategoryOptions } from "./categorize";
import { nameKey, type DraftRow, type Issue, type RowOverride } from "./rows";

/**
 * Decides what happens to every row: create, update an existing product,
 * skip, or reject — before anything is sent to the server. The preview the
 * admin approves is exactly what gets executed.
 */

export type DuplicateMode = "update" | "skip" | "create";
export type RowAction = "create" | "update" | "skip" | "error" | "merged" | "empty";

export interface Change {
  label: string;
  from: string;
  to: string;
}

export interface PlannedRow {
  draft: DraftRow;
  action: RowAction;
  category: CategoryChoice;
  match?: Product;
  matchBy?: "id" | "sku" | "name";
  reason?: string;
  changes: Change[];
  issues: Issue[];
}

export interface PlanOptions extends CategoryOptions {
  duplicateMode: DuplicateMode;
}

export interface PlanSummary {
  rows: number;
  create: number;
  update: number;
  skip: number;
  error: number;
  merged: number;
  empty: number;
  withWarnings: number;
  newCategories: string[];
}

export interface Plan {
  rows: PlannedRow[];
  summary: PlanSummary;
}

const money = (n: number | undefined, symbol: string) =>
  n === undefined || n === null ? "—" : `${symbol}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(n)}`;

const specsKey = (specs: Spec[] | undefined) =>
  (specs ?? []).map((s) => `${s.label.toLowerCase()}=${s.value}`).join("|");

export function buildPlan(
  drafts: DraftRow[],
  existing: Product[],
  categories: Category[],
  opts: PlanOptions,
  overrides: Record<number, RowOverride> = {},
  currencySymbol = "₦",
): Plan {
  const byId = new Map(existing.map((p) => [p.id, p]));
  const bySku = new Map<string, Product[]>();
  const byName = new Map<string, Product[]>();
  for (const p of existing) {
    if (p.sku) bySku.set(p.sku.toLowerCase(), [...(bySku.get(p.sku.toLowerCase()) ?? []), p]);
    const k = nameKey(p.name);
    byName.set(k, [...(byName.get(k) ?? []), p]);
  }
  const claimed = new Set<string>();
  const catName = (id?: string | null) => categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  const rows: PlannedRow[] = drafts.map((draft) => {
    const issues = [...draft.issues];
    const ov = overrides[draft.index] ?? {};
    const base = { draft, changes: [] as Change[], issues };

    if (draft.status === "empty") return { ...base, action: "empty", category: { categoryId: null, source: "none" } };
    if (draft.status === "merged") return { ...base, action: "merged", category: { categoryId: null, source: "none" } };

    let category = chooseCategory(draft.product, categories, opts, ov.categoryId);

    if (draft.status === "error") return { ...base, action: "error", category };
    if (ov.exclude) return { ...base, action: "skip", category, reason: "Excluded" };

    // ---- find an existing product ----
    const p = draft.product;
    let match: Product | undefined;
    let matchBy: PlannedRow["matchBy"];
    const pick = (list?: Product[]) => list?.find((x) => !claimed.has(x.id));
    if (p.id && byId.has(p.id) && !claimed.has(p.id)) {
      match = byId.get(p.id);
      matchBy = "id";
    } else if (p.sku && pick(bySku.get(p.sku.toLowerCase()))) {
      match = pick(bySku.get(p.sku.toLowerCase()));
      matchBy = "sku";
    } else if (pick(byName.get(nameKey(p.name)))) {
      match = pick(byName.get(nameKey(p.name)));
      matchBy = "name";
    }

    if (match && opts.duplicateMode !== "create") {
      claimed.add(match.id);
      if (opts.duplicateMode === "skip") {
        return { ...base, action: "skip", category, match, matchBy, reason: "Already in your store" };
      }
      // Updates keep the product's current category unless the file/admin says otherwise.
      if (category.source === "auto" || category.source === "default" || category.source === "none") {
        category = { categoryId: match.categoryId, source: "existing" };
      }
      const changes = diff(match, draft, category, catName, currencySymbol);
      if (changes.length === 0) {
        return { ...base, action: "skip", category, match, matchBy, reason: "Already up to date" };
      }
      return { ...base, action: "update", category, match, matchBy, changes };
    }

    if (!category.categoryId && category.source !== "new") {
      issues.push({ level: "error", field: "category", message: "No category — pick one or set a default category" });
      return { ...base, action: "error", category };
    }
    if (p.quantity === null) {
      issues.push({ level: "warning", field: "quantity", message: "No stock given — added as 0 (out of stock)" });
    }
    if (!p.images.length) {
      issues.push({ level: "info", field: "image", message: "No image — a placeholder will show" });
    }
    return { ...base, action: "create", category, match, matchBy };
  });

  const summary: PlanSummary = {
    rows: rows.filter((r) => r.action !== "empty").length,
    create: 0,
    update: 0,
    skip: 0,
    error: 0,
    merged: 0,
    empty: 0,
    withWarnings: 0,
    newCategories: [],
  };
  const newCats = new Map<string, string>();
  for (const r of rows) {
    summary[r.action] += 1;
    if ((r.action === "create" || r.action === "update") && r.issues.some((i) => i.level === "warning")) summary.withWarnings++;
    if ((r.action === "create" || r.action === "update") && r.category.source === "new" && r.category.newName) {
      newCats.set(r.category.newName.toLowerCase(), r.category.newName);
    }
  }
  summary.newCategories = Array.from(newCats.values());
  return { rows, summary };
}

function diff(
  current: Product,
  draft: DraftRow,
  category: CategoryChoice,
  catName: (id?: string | null) => string,
  symbol: string,
): Change[] {
  const p = draft.product;
  const has = (k: string) => draft.provided.includes(k as never);
  const out: Change[] = [];
  if (has("name") && p.name !== current.name) out.push({ label: "Name", from: current.name, to: p.name });
  if (has("price") && p.price !== null && p.price !== current.price) {
    out.push({ label: "Price", from: money(current.price, symbol), to: money(p.price, symbol) });
  }
  if (has("salePrice") && p.salePrice !== (current.salePrice ?? undefined)) {
    out.push({ label: "Sale price", from: money(current.salePrice ?? undefined, symbol), to: money(p.salePrice, symbol) });
  }
  if (has("quantity") && p.quantity !== null && p.quantity !== current.quantity) {
    out.push({ label: "Stock", from: String(current.quantity), to: String(p.quantity) });
  }
  if (has("brand") && p.brand && p.brand !== current.brand) out.push({ label: "Brand", from: current.brand, to: p.brand });
  if ((category.source === "file" || category.source === "manual" || category.source === "new") && category.categoryId !== current.categoryId) {
    out.push({ label: "Category", from: catName(current.categoryId), to: category.newName ?? catName(category.categoryId) });
  }
  if (has("description") && p.description && p.description !== (current.description ?? "")) {
    out.push({ label: "Description", from: current.description ? "old text" : "—", to: "new text" });
  }
  if (has("image") && p.images.length && p.images.join("\n") !== current.images.join("\n")) {
    out.push({ label: "Images", from: String(current.images.length), to: String(p.images.length) });
  }
  if (has("specs") && p.specs.length && specsKey(p.specs) !== specsKey(current.specs)) {
    out.push({ label: "Specs", from: String(current.specs?.length ?? 0), to: String(p.specs.length) });
  }
  if (has("featured") && p.featured !== undefined && p.featured !== Boolean(current.featured)) {
    out.push({ label: "Featured", from: current.featured ? "Yes" : "No", to: p.featured ? "Yes" : "No" });
  }
  if (has("sku") && p.sku && p.sku !== current.sku) out.push({ label: "SKU", from: current.sku ?? "—", to: p.sku });
  return out;
}

/* ------------------------------------------------------------------ */
/* Plan → API operations                                               */
/* ------------------------------------------------------------------ */

export interface ProductPayload {
  name?: string;
  categoryId?: string;
  brand?: string;
  price?: number;
  salePrice?: number | null;
  quantity?: number;
  description?: string;
  images?: string[];
  specs?: Spec[];
  featured?: boolean;
  sku?: string;
  createdAt?: number;
}

export type BatchOp =
  | { op: "create"; ref: number; product: ProductPayload }
  | { op: "update"; ref: number; id: string; patch: ProductPayload; unset?: string[] }
  | { op: "delete"; ref: number; id: string };

/** `newCategoryIds` maps lower-cased new category names → ids created just before import. */
export function planToOps(plan: Plan, newCategoryIds: Map<string, string>): BatchOp[] {
  const ops: BatchOp[] = [];
  const now = Date.now();
  let order = 0;
  for (const r of plan.rows) {
    const p = r.draft.product;
    const categoryId =
      r.category.source === "new" && r.category.newName
        ? newCategoryIds.get(r.category.newName.toLowerCase())
        : r.category.categoryId ?? undefined;

    if (r.action === "create" && categoryId && p.price !== null) {
      ops.push({
        op: "create",
        ref: r.draft.index,
        product: {
          name: p.name,
          categoryId,
          brand: p.brand || "Generic",
          price: p.price,
          salePrice: p.salePrice,
          quantity: p.quantity ?? 0,
          description: p.description,
          images: p.images,
          specs: p.specs,
          featured: p.featured ?? false,
          sku: p.sku,
          // keep the spreadsheet's order when listing "newest first"
          createdAt: now - order++,
        },
      });
    } else if (r.action === "update" && r.match) {
      const has = (k: string) => r.draft.provided.includes(k as never);
      const patch: ProductPayload = {};
      if (has("name") && p.name) patch.name = p.name;
      if (has("price") && p.price !== null) patch.price = p.price;
      if (has("salePrice") && p.salePrice !== undefined) patch.salePrice = p.salePrice;
      if (has("quantity") && p.quantity !== null) patch.quantity = p.quantity;
      if (has("brand") && p.brand) patch.brand = p.brand;
      if (has("description") && p.description) patch.description = p.description;
      if (has("image") && p.images.length) patch.images = p.images;
      if (has("specs") && p.specs.length) patch.specs = p.specs;
      if (has("featured") && p.featured !== undefined) patch.featured = p.featured;
      if (has("sku") && p.sku) patch.sku = p.sku;
      if ((r.category.source === "file" || r.category.source === "manual" || r.category.source === "new") && categoryId) {
        patch.categoryId = categoryId;
      }
      ops.push({ op: "update", ref: r.draft.index, id: r.match.id, patch });
    }
  }
  return ops;
}

/** Ops that revert an import: delete what was created, restore what was updated. */
export function undoOps(created: string[], previous: Product[]): BatchOp[] {
  const ops: BatchOp[] = created.map((id, i) => ({ op: "delete", ref: i, id }));
  previous.forEach((p, i) => {
    const unset: string[] = [];
    if (p.salePrice === undefined || p.salePrice === null) unset.push("salePrice");
    if (!p.description) unset.push("description");
    if (!p.sku) unset.push("sku");
    if (!p.specs?.length) unset.push("specs");
    ops.push({
      op: "update",
      ref: created.length + i,
      id: p.id,
      patch: {
        name: p.name,
        categoryId: p.categoryId,
        brand: p.brand,
        price: p.price,
        ...(p.salePrice ? { salePrice: p.salePrice } : {}),
        quantity: p.quantity,
        ...(p.description ? { description: p.description } : {}),
        images: p.images,
        ...(p.specs?.length ? { specs: p.specs } : {}),
        featured: Boolean(p.featured),
        ...(p.sku ? { sku: p.sku } : {}),
      },
      unset,
    });
  });
  return ops;
}
