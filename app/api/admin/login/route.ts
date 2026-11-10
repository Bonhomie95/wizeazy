import { createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, SESSION_MAX_AGE, createSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Constant-time comparison (hashing first also hides the password length). */
function passwordMatches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Client IP for rate limiting — the platform-set value, not the spoofable raw header list. */
function clientKey(req: NextRequest): string {
  return (
    req.ip ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local"
  );
}

// Simple in-memory rate limiting for login attempts (per server instance).
const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 10;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || now > entry.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json(
      { error: "Admin access isn't configured on the server yet." },
      { status: 500 },
    );
  }

  const ip = clientKey(req);
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!password || password.length > 256 || !passwordMatches(password, adminPassword)) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  attempts.delete(ip); // successful login clears the counter
  const token = await createSessionToken();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return res;
}
