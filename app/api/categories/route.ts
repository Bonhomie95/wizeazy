import { NextRequest, NextResponse } from "next/server";
import { addCategory, getStoreData } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getStoreData();
  return NextResponse.json(data.categories);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }
  const category = await addCategory(body.name, typeof body.icon === "string" ? body.icon : "Tag");
  return NextResponse.json(category, { status: 201 });
}
