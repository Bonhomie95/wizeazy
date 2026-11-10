import type { AnyBulkWriteOperation, Db } from "mongodb";
import { getDb, isDbConfigured } from "./mongodb";
import { seedCategories, seedProducts, seedSettings } from "./seed";
import type { Category, Product, StoreData, StoreSettings } from "./types";
import { slugify, uid } from "./utils";

/**
 * Data layer for the store.
 *
 * If MONGODB_URI is configured, all reads/writes go straight to MongoDB.
 * The very first time the app talks to an empty database it auto-seeds it
 * with the demo catalogue, then never touches the seed again.
 *
 * Without MONGODB_URI it falls back to an in-memory copy of the seed so the
 * app works out of the box for previewing — dev-only, not for production.
 * The copy lives on globalThis so every route bundle shares the same data.
 */

const SETTINGS_KEY = "settings";

declare global {
  // eslint-disable-next-line no-var
  var _wizeazyMemoryStore: StoreData | undefined;
}

function freshMemory(): StoreData {
  return {
    products: seedProducts.map((p) => ({ ...p })),
    categories: seedCategories.map((c) => ({ ...c })),
    settings: { ...seedSettings },
  };
}

function getMemory(): StoreData {
  if (!globalThis._wizeazyMemoryStore) globalThis._wizeazyMemoryStore = freshMemory();
  return globalThis._wizeazyMemoryStore;
}

let seedCheckPromise: Promise<void> | null = null;

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("products").createIndex({ id: 1 }, { unique: true }),
    db.collection("products").createIndex({ categoryId: 1 }),
    db.collection("products").createIndex({ createdAt: -1 }),
    db.collection("categories").createIndex({ id: 1 }, { unique: true }),
  ]);
}

async function ensureSeeded(db: Db) {
  const productsCol = db.collection("products");
  const categoriesCol = db.collection("categories");
  const settingsCol = db.collection("settings");

  const [productCount, categoryCount, settingsDoc] = await Promise.all([
    productsCol.estimatedDocumentCount(),
    categoriesCol.estimatedDocumentCount(),
    settingsCol.findOne({ _key: SETTINGS_KEY }),
  ]);

  const tasks: Promise<unknown>[] = [];
  if (categoryCount === 0) {
    tasks.push(categoriesCol.insertMany(seedCategories.map((c) => ({ ...c }))));
  }
  if (productCount === 0) {
    tasks.push(productsCol.insertMany(seedProducts.map((p) => ({ ...p }))));
  }
  if (!settingsDoc) {
    tasks.push(settingsCol.insertOne({ _key: SETTINGS_KEY, ...seedSettings }));
  }
  if (tasks.length) await Promise.all(tasks);
}

async function getReadyDb(): Promise<Db> {
  const db = await getDb();
  if (!seedCheckPromise) {
    seedCheckPromise = ensureIndexes(db)
      .then(() => ensureSeeded(db))
      .catch((err) => {
        seedCheckPromise = null; // retry on the next request instead of caching the failure
        throw err;
      });
  }
  await seedCheckPromise;
  return db;
}

/** True once real MongoDB reads/writes are in effect (vs. the local seed fallback). */
export function usingDatabase(): boolean {
  return isDbConfigured();
}

export async function getStoreData(): Promise<StoreData> {
  if (!isDbConfigured()) {
    const m = getMemory();
    return { ...m, products: [...m.products].sort((a, b) => b.createdAt - a.createdAt) };
  }

  const db = await getReadyDb();
  const [products, categories, settingsDoc] = await Promise.all([
    db
      .collection<Product>("products")
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray(),
    db.collection<Category>("categories").find({}, { projection: { _id: 0 } }).toArray(),
    db
      .collection("settings")
      .findOne({ _key: SETTINGS_KEY }, { projection: { _id: 0, _key: 0 } }),
  ]);

  return {
    products,
    categories,
    settings: (settingsDoc as StoreSettings | null) ?? seedSettings,
  };
}

export async function getCategoryIds(): Promise<Set<string>> {
  if (!isDbConfigured()) return new Set(getMemory().categories.map((c) => c.id));
  const db = await getReadyDb();
  const docs = await db.collection<Category>("categories").find({}, { projection: { _id: 0, id: 1 } }).toArray();
  return new Set(docs.map((d) => d.id));
}

/* ---------------- Products ---------------- */

const stripUndefined = <T extends object>(o: T): Partial<T> =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;

export async function addProduct(
  input: Omit<Product, "id" | "createdAt"> & { createdAt?: number },
): Promise<Product> {
  const product = stripUndefined({
    ...input,
    id: uid("p"),
    createdAt: input.createdAt ?? Date.now(),
  }) as Product;
  if (!isDbConfigured()) {
    getMemory().products.unshift(product);
    return product;
  }
  const db = await getReadyDb();
  await db.collection("products").insertOne({ ...product });
  return product;
}

export async function updateProduct(
  id: string,
  patch: Partial<Product>,
  unset: (keyof Product)[] = [],
): Promise<Product | null> {
  const { id: _ignoreId, createdAt: _ignoreCreatedAt, ...rest } = patch;
  const safePatch = stripUndefined(rest);
  if (!isDbConfigured()) {
    const m = getMemory();
    const current = m.products.find((p) => p.id === id);
    if (!current) return null;
    const next = { ...current, ...safePatch } as Product;
    for (const k of unset) delete (next as unknown as Record<string, unknown>)[k];
    m.products = m.products.map((p) => (p.id === id ? next : p));
    return next;
  }
  const db = await getReadyDb();
  const update: Record<string, unknown> = {};
  if (Object.keys(safePatch).length) update.$set = safePatch;
  if (unset.length) update.$unset = Object.fromEntries(unset.map((k) => [k, ""]));
  if (Object.keys(update).length) await db.collection("products").updateOne({ id }, update);
  return db.collection<Product>("products").findOne({ id }, { projection: { _id: 0 } });
}

export async function deleteProduct(id: string): Promise<void> {
  if (!isDbConfigured()) {
    const m = getMemory();
    m.products = m.products.filter((p) => p.id !== id);
    return;
  }
  const db = await getReadyDb();
  await db.collection("products").deleteOne({ id });
}

export type BatchInput =
  | { op: "create"; product: Omit<Product, "id"> }
  | { op: "update"; id: string; set: Partial<Product>; unset: (keyof Product)[] }
  | { op: "delete"; id: string };

export type BatchOutcome = { ok: true; id: string; product?: Product } | { ok: false; error: string };

/**
 * Applies many product writes in one round trip (Mongo bulkWrite, unordered),
 * reporting success/failure per operation so the UI can show exact results.
 */
export async function applyProductBatch(ops: BatchInput[]): Promise<BatchOutcome[]> {
  if (!isDbConfigured()) {
    const m = getMemory();
    return ops.map((o) => {
      if (o.op === "create") {
        const product = stripUndefined({ ...o.product, id: uid("p") }) as Product;
        m.products.unshift(product);
        return { ok: true, id: product.id, product };
      }
      const idx = m.products.findIndex((p) => p.id === o.id);
      if (idx === -1) return { ok: false, error: "Product not found" };
      if (o.op === "delete") {
        m.products.splice(idx, 1);
        return { ok: true, id: o.id };
      }
      const next = { ...m.products[idx], ...stripUndefined(o.set) } as Product;
      for (const k of o.unset) delete (next as unknown as Record<string, unknown>)[k];
      m.products[idx] = next;
      return { ok: true, id: o.id, product: next };
    });
  }

  const db = await getReadyDb();
  const col = db.collection<Product>("products");
  const targetIds = ops.flatMap((o) => (o.op === "create" ? [] : [o.id]));
  const existing = new Set(
    targetIds.length
      ? (await col.find({ id: { $in: targetIds } }, { projection: { _id: 0, id: 1 } }).toArray()).map((d) => d.id)
      : [],
  );

  const outcomes: BatchOutcome[] = new Array(ops.length);
  const writes: AnyBulkWriteOperation<Product>[] = [];
  const writeToOp: number[] = [];

  ops.forEach((o, i) => {
    if (o.op === "create") {
      const product = stripUndefined({ ...o.product, id: uid("p") }) as Product;
      writes.push({ insertOne: { document: { ...product } } });
      writeToOp.push(i);
      outcomes[i] = { ok: true, id: product.id, product };
      return;
    }
    if (!existing.has(o.id)) {
      outcomes[i] = { ok: false, error: "Product not found" };
      return;
    }
    if (o.op === "delete") {
      writes.push({ deleteOne: { filter: { id: o.id } } });
      writeToOp.push(i);
      outcomes[i] = { ok: true, id: o.id };
      return;
    }
    const set = stripUndefined(o.set);
    const update: Record<string, unknown> = {};
    if (Object.keys(set).length) update.$set = set;
    if (o.unset.length) update.$unset = Object.fromEntries(o.unset.map((k) => [k, ""]));
    outcomes[i] = { ok: true, id: o.id };
    if (Object.keys(update).length) {
      writes.push({ updateOne: { filter: { id: o.id }, update } });
      writeToOp.push(i);
    }
  });

  if (writes.length) {
    try {
      await col.bulkWrite(writes, { ordered: false });
    } catch (err) {
      const raw = (err as { writeErrors?: unknown }).writeErrors;
      const list = Array.isArray(raw) ? raw : raw ? [raw] : null;
      if (!list) throw err;
      for (const we of list as { index: number }[]) {
        const i = writeToOp[we.index];
        if (i !== undefined) outcomes[i] = { ok: false, error: "Couldn't save this product" };
      }
    }
  }

  const updatedIds = ops.flatMap((o, i) => (o.op === "update" && outcomes[i]?.ok ? [o.id] : []));
  if (updatedIds.length) {
    const docs = await col.find({ id: { $in: updatedIds } }, { projection: { _id: 0 } }).toArray();
    const byId = new Map(docs.map((d) => [d.id, d]));
    ops.forEach((o, i) => {
      const out = outcomes[i];
      if (o.op === "update" && out?.ok) out.product = byId.get(o.id);
    });
  }
  return outcomes;
}

/* ---------------- Categories ---------------- */

export async function addCategory(name: string, icon = "Tag"): Promise<Category> {
  const category: Category = { id: uid("cat"), name: name.trim(), slug: slugify(name), icon };
  if (!isDbConfigured()) {
    getMemory().categories.push(category);
    return category;
  }
  const db = await getReadyDb();
  await db.collection("categories").insertOne({ ...category });
  return category;
}

export async function updateCategory(
  id: string,
  patch: Partial<Pick<Category, "name" | "icon">>,
): Promise<Category | null> {
  const nextPatch = stripUndefined({ ...patch, ...(patch.name ? { slug: slugify(patch.name) } : {}) });
  if (!isDbConfigured()) {
    const m = getMemory();
    m.categories = m.categories.map((c) => (c.id === id ? { ...c, ...nextPatch } : c));
    return m.categories.find((c) => c.id === id) ?? null;
  }
  const db = await getReadyDb();
  if (Object.keys(nextPatch).length) await db.collection("categories").updateOne({ id }, { $set: nextPatch });
  return db.collection<Category>("categories").findOne({ id }, { projection: { _id: 0 } });
}

export async function deleteCategory(id: string): Promise<void> {
  if (!isDbConfigured()) {
    getMemory().categories = getMemory().categories.filter((c) => c.id !== id);
    return;
  }
  const db = await getReadyDb();
  await db.collection("categories").deleteOne({ id });
}

/* ---------------- Settings ---------------- */

export async function updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
  if (!isDbConfigured()) {
    const m = getMemory();
    m.settings = { ...m.settings, ...patch };
    return m.settings;
  }
  const db = await getReadyDb();
  await db
    .collection("settings")
    .updateOne({ _key: SETTINGS_KEY }, { $set: patch }, { upsert: true });
  const doc = await db
    .collection("settings")
    .findOne({ _key: SETTINGS_KEY }, { projection: { _id: 0, _key: 0 } });
  return (doc as StoreSettings | null) ?? seedSettings;
}

/* ---------------- Reset ---------------- */

export async function resetToSeed(): Promise<void> {
  if (!isDbConfigured()) {
    globalThis._wizeazyMemoryStore = freshMemory();
    return;
  }
  const db = await getReadyDb();
  await Promise.all([
    db.collection("products").deleteMany({}),
    db.collection("categories").deleteMany({}),
    db.collection("settings").deleteMany({}),
  ]);
  await ensureSeeded(db);
}
