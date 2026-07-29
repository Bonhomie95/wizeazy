import { NextRequest, NextResponse } from "next/server";
import { getStoreData, updateSettings } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getStoreData();
  return NextResponse.json(data.settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const settings = await updateSettings(body);
  return NextResponse.json(settings);
}
