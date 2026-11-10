import { NextRequest, NextResponse } from "next/server";
import { applyProductBatch, getCategoryIds, type BatchInput } from "@/lib/db";
import { invalidateStore } from "@/lib/cache";
import { isSafeId, readJson, sanitizeCreatedAt, sanitizeProduct } from "@/lib/product-input";
import type { Product } from "@/lib/types";

/**
 * POST /api/products/batch — bulk create / update / delete (admin only;
 * guarded by middleware like every other product write).
 *
 * Body: { ops: [{ op: "create", ref, product } | { op: "update", ref, id, patch, unset? } | { op: "delete", ref, id }] }
 * Reply: { results: [{ ref, ok: true, id, product? } | { ref, ok: false, error }] } — same order as `ops`.
 */

export const dynamic = "force-dynamic";

const MAX_OPS = 250;
const MAX_BODY = 2 * 1024 * 1024; // 2 MB — well under serverless body limits
const UNSETTABLE = new Set<keyof Product>(["salePrice", "description", "sku", "specs"]);

type Prepared = { ref: number; error: string } | { ref: number; input: BatchInput };

export async function POST(req: NextRequest) {
  const body = await readJson(req, MAX_BODY);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: body.error.includes("large") ? 413 : 400 });

  const ops = (body.value as { ops?: unknown })?.ops;
  if (!Array.isArray(ops) || ops.length === 0) {
    return NextResponse.json({ error: "Send at least one operation." }, { status: 400 });
  }
  if (ops.length > MAX_OPS) {
    return NextResponse.json({ error: `Send at most ${MAX_OPS} operations per request.` }, { status: 413 });
  }

  const categoryIds = await getCategoryIds();

  const prepared: Prepared[] = ops.map((raw, i) => {
    const o = (raw ?? {}) as Record<string, unknown>;
    const ref = Number.isInteger(o.ref) ? (o.ref as number) : i;

    if (o.op === "create") {
      const p = sanitizeProduct(o.product, "create");
      if (!p.ok) return { ref, error: p.error };
      if (!categoryIds.has(p.value.set.categoryId!)) return { ref, error: "Category doesn't exist" };
      const createdAt = sanitizeCreatedAt((o.product as Record<string, unknown> | undefined)?.createdAt);
      return { ref, input: { op: "create", product: { ...(p.value.set as Omit<Product, "id" | "createdAt">), createdAt } } };
    }
    if (o.op === "update") {
      if (!isSafeId(o.id)) return { ref, error: "Invalid product id" };
      const p = sanitizeProduct(o.patch, "patch");
      if (!p.ok) return { ref, error: p.error };
      if (p.value.set.categoryId && !categoryIds.has(p.value.set.categoryId)) return { ref, error: "Category doesn't exist" };
      const extraUnset = Array.isArray(o.unset)
        ? (o.unset.filter((k) => typeof k === "string" && UNSETTABLE.has(k as keyof Product)) as (keyof Product)[])
        : [];
      const unset = Array.from(new Set([...p.value.unset, ...extraUnset])).filter((k) => !(k in p.value.set));
      return { ref, input: { op: "update", id: o.id, set: p.value.set, unset } };
    }
    if (o.op === "delete") {
      if (!isSafeId(o.id)) return { ref, error: "Invalid product id" };
      return { ref, input: { op: "delete", id: o.id } };
    }
    return { ref, error: "Unknown operation" };
  });

  const valid = prepared.filter((p): p is { ref: number; input: BatchInput } => "input" in p);
  const outcomes = valid.length ? await applyProductBatch(valid.map((p) => p.input)) : [];

  let k = 0;
  const results = prepared.map((p) => {
    if (!("input" in p)) return { ref: p.ref, ok: false as const, error: p.error };
    return { ref: p.ref, ...outcomes[k++] };
  });

  if (results.some((r) => r.ok)) invalidateStore();
  return NextResponse.json({ results });
}
