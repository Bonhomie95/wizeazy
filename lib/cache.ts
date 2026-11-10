import { revalidateTag, unstable_cache } from "next/cache";
import { getStoreData } from "./db";

/**
 * Storefront data is server-rendered from a short-lived cache, so visitors
 * get real products in the very first HTML (no demo-data flash, better SEO)
 * without a database round trip on every page view. Every admin write calls
 * invalidateStore(), so changes show up on the next request.
 */
export const STORE_TAG = "store";

export const getCachedStoreData = unstable_cache(async () => getStoreData(), ["wizeazy-store-data"], {
  tags: [STORE_TAG],
  revalidate: 120,
});

export function invalidateStore() {
  try {
    revalidateTag(STORE_TAG);
  } catch {
    /* outside a request scope (e.g. scripts) — nothing to invalidate */
  }
}
