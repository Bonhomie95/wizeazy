import { NextRequest, NextResponse } from "next/server";
import { addProduct, getStoreData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getStoreData();
  return NextResponse.json(data.products);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Product name is required." }, { status: 400 });
  }
  if (typeof body.categoryId !== "string" || !body.categoryId) {
    return NextResponse.json({ error: "A category is required." }, { status: 400 });
  }

  const product = await addProduct({
    name: body.name.trim(),
    categoryId: body.categoryId,
    brand: typeof body.brand === "string" && body.brand.trim() ? body.brand.trim() : "Generic",
    price: Number(body.price) || 0,
    salePrice:
      body.salePrice && Number(body.salePrice) > 0 ? Number(body.salePrice) : undefined,
    quantity: Math.max(0, Math.floor(Number(body.quantity) || 0)),
    description:
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : undefined,
    images: Array.isArray(body.images) ? body.images.filter(Boolean) : [],
    specs: Array.isArray(body.specs) ? body.specs : undefined,
    featured: Boolean(body.featured),
  });

  return NextResponse.json(product, { status: 201 });
}
