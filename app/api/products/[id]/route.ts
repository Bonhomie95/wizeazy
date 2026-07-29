import { NextRequest, NextResponse } from "next/server";
import { deleteProduct, updateProduct } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = { ...body };
  if (patch.price !== undefined) patch.price = Number(patch.price) || 0;
  if (patch.salePrice !== undefined) {
    patch.salePrice = Number(patch.salePrice) > 0 ? Number(patch.salePrice) : undefined;
  }
  if (patch.quantity !== undefined) {
    patch.quantity = Math.max(0, Math.floor(Number(patch.quantity) || 0));
  }
  if (typeof patch.name === "string") patch.name = patch.name.trim();
  if (typeof patch.description === "string") {
    patch.description = patch.description.trim() || undefined;
  }

  const product = await updateProduct(params.id, patch);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  return NextResponse.json(product);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await deleteProduct(params.id);
  return NextResponse.json({ ok: true });
}
