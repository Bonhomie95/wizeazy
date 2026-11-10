import { NextRequest, NextResponse } from "next/server";
import { addCategory, getStoreData } from "@/lib/db";
import { invalidateStore } from "@/lib/cache";
import { readJson, sanitizeCategory } from "@/lib/product-input";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getStoreData();
  return NextResponse.json(data.categories);
}

export async function POST(req: NextRequest) {
  const body = await readJson(req, 8 * 1024);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 });
  const parsed = sanitizeCategory(body.value, "create");
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const category = await addCategory(parsed.value.name!, parsed.value.icon ?? "Tag");
  invalidateStore();
  return NextResponse.json(category, { status: 201 });
}
