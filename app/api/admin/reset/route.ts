import { NextResponse } from "next/server";
import { resetToSeed } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  await resetToSeed();
  return NextResponse.json({ ok: true });
}
