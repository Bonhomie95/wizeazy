import { NextRequest, NextResponse } from "next/server";
import { getStoreData, updateSettings } from "@/lib/db";
import { invalidateStore } from "@/lib/cache";
import { readJson, sanitizeSettings } from "@/lib/product-input";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getStoreData();
  return NextResponse.json(data.settings);
}

export async function PUT(req: NextRequest) {
  const body = await readJson(req, 8 * 1024);
  if (!body.ok) return NextResponse.json({ error: body.error }, { status: 400 });
  // Only known settings keys are written (stops overwriting the internal _key etc.)
  const parsed = sanitizeSettings(body.value);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const settings = await updateSettings(parsed.value);
  invalidateStore();
  return NextResponse.json(settings);
}
