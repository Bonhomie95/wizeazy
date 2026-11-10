import { NextRequest, NextResponse } from "next/server";
import { addProduct, getCategoryIds, getStoreData } from "@/lib/db";
import { invalidateStore } from "@/lib/cache";
import { readJson, sanitizeProduct } from "@/lib/product-input";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getStoreData();
  return NextResponse.json(data.products);
}

export async function POST(req: NextRequest) {
  const body = await readJson(req, 64 * 1024);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 });

  const parsed = sanitizeProduct(body.value, "create");
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const categories = await getCategoryIds();
  if (!categories.has(parsed.value.set.categoryId!)) {
    return NextResponse.json({ error: "That category no longer exists." }, { status: 400 });
  }

  const product = await addProduct(parsed.value.set as Omit<Product, "id" | "createdAt">);
  invalidateStore();
  return NextResponse.json(product, { status: 201 });
}
