import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Paths that always require a valid admin session, regardless of method.
const ALWAYS_PROTECTED = ["/api/admin/reset"];

// Paths that are public for GET (storefront needs to read them) but
// protected for any write operation (admin dashboard only).
const WRITE_PROTECTED_PREFIXES = ["/api/products", "/api/categories", "/api/settings"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth =
    ALWAYS_PROTECTED.some((p) => pathname.startsWith(p)) ||
    (WRITE_PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) &&
      MUTATING_METHODS.has(req.method));

  if (needsAuth) {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    const valid = await verifySessionToken(token);
    if (!valid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/products/:path*",
    "/api/categories/:path*",
    "/api/settings/:path*",
    "/api/admin/reset",
  ],
};
