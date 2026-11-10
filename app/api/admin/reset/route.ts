import { NextResponse } from "next/server";
import { resetToSeed } from "@/lib/db";
import { invalidateStore } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function POST() {
  await resetToSeed();
  invalidateStore();
  return NextResponse.json({ ok: true });
}
