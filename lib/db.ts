import type { Db } from "mongodb";
import { getDb, isDbConfigured } from "./mongodb";
import { seedCategories, seedProducts, seedSettings } from "./seed";
import type { Category, Product, StoreData, StoreSettings } from "./types";
import { slugify, uid } from "./utils";

/**
 * Data layer for the store.
 *
 * If MONGODB_URI is configured, all reads/writes go straight to MongoDB.
 * The very first time the app talks to an empty database it auto-seeds it
 * with the demo catalogue below, then never touches the seed again.
 *
 * If no MONGODB_URI is set (e.g. running the project locally without a
 * cluster yet), it falls back to an in-memory copy of the seed so the app
 * still works out of the box for previewing — this is dev-only and is not
 * meant for production use.
 */

const SETTINGS_KEY = "settings";

let memory: StoreData | null = null;
function getMemory(): StoreData {
  if (!memory) {
    memory = {
      products: seedProducts.map((p) => ({ ...p })),
      categories: seedCategories.map((c) => ({ ...c })),
      settings: { ...seedSettings },
    };
  }
  return memory;
}

let seedCheckPromise: Promise<void> | null = null;

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("products").createIndex({ id: 1 }, { unique: true }),
    db.collection("products").createIndex({ categoryId: 1 }),
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
    seedCheckPromise = ensureIndexes(db).then(() => ensureSeeded(db));
  }
  await seedCheckPromise;
  return db;
}

/** True once real MongoDB reads/writes are in effect (vs. the local seed fallback). */
export function usingDatabase(): boolean {
  return isDbConfigured();
}

export async function getStoreData(): Promise<StoreData> {
  if (!isDbConfigured()) return getMemory();

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

/* ---------------- Products ---------------- */

export async function addProduct(
  input: Omit<Product, "id" | "createdAt">,
): Promise<Product> {
  const product: Product = { ...input, id: uid("p"), createdAt: Date.now() };
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
): Promise<Product | null> {
  const { id: _ignoreId, createdAt: _ignoreCreatedAt, ...safePatch } = patch;
  if (!isDbConfigured()) {
    const m = getMemory();
    m.products = m.products.map((p) => (p.id === id ? { ...p, ...safePatch } : p));
    return m.products.find((p) => p.id === id) ?? null;
  }
  const db = await getReadyDb();
  await db.collection("products").updateOne({ id }, { $set: safePatch });
  return db
    .collection<Product>("products")
    .findOne({ id }, { projection: { _id: 0 } });
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
  patch: Partial<Category>,
): Promise<Category | null> {
  const nextPatch = { ...patch, ...(patch.name ? { slug: slugify(patch.name) } : {}) };
  if (!isDbConfigured()) {
    const m = getMemory();
    m.categories = m.categories.map((c) => (c.id === id ? { ...c, ...nextPatch } : c));
    return m.categories.find((c) => c.id === id) ?? null;
  }
  const db = await getReadyDb();
  await db.collection("categories").updateOne({ id }, { $set: nextPatch });
  return db
    .collection<Category>("categories")
    .findOne({ id }, { projection: { _id: 0 } });
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

export async function updateSettings(
  patch: Partial<StoreSettings>,
): Promise<StoreSettings> {
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
    memory = {
      products: seedProducts.map((p) => ({ ...p })),
      categories: seedCategories.map((c) => ({ ...c })),
      settings: { ...seedSettings },
    };
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
