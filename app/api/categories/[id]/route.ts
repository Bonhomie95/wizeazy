import { NextRequest, NextResponse } from "next/server";
import { deleteCategory, updateCategory } from "@/lib/db";
import { invalidateStore } from "@/lib/cache";
import { isSafeId, readJson, sanitizeCategory } from "@/lib/product-input";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSafeId(params.id)) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  const body = await readJson(req, 8 * 1024);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 });
  const parsed = sanitizeCategory(body.value, "patch");
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const category = await updateCategory(params.id, parsed.value);
  if (!category) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  invalidateStore();
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!isSafeId(params.id)) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  await deleteCategory(params.id);
  invalidateStore();
  return NextResponse.json({ ok: true });
}
