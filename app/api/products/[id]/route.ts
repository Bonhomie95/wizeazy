import { NextRequest, NextResponse } from "next/server";
import { deleteProduct, getCategoryIds, updateProduct } from "@/lib/db";
import { invalidateStore } from "@/lib/cache";
import { isSafeId, readJson, sanitizeProduct } from "@/lib/product-input";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSafeId(params.id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });

  const body = await readJson(req, 64 * 1024);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 });

  // Whitelisted fields only — prevents mass-assignment of arbitrary keys.
  const parsed = sanitizeProduct(body.value, "patch");
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { set, unset } = parsed.value;
  if (set.categoryId && !(await getCategoryIds()).has(set.categoryId)) {
    return NextResponse.json({ error: "That category no longer exists." }, { status: 400 });
  }

  const product = await updateProduct(params.id, set, unset);
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  invalidateStore();
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSafeId(params.id)) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  await deleteProduct(params.id);
  invalidateStore();
  return NextResponse.json({ ok: true });
}
