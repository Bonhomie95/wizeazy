// Lightweight, dependency-free session auth.
// Works in both the Node.js runtime (route handlers) and the Edge runtime
// (middleware) because it only uses Web Crypto (crypto.subtle) + btoa/atob,
// which are available in both environments.

export const COOKIE_NAME = "wizeazy_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days, in seconds

function getSecret(): string {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) {
    throw new Error(
      "Missing SESSION_SECRET (or ADMIN_PASSWORD) environment variable.",
    );
  }
  return secret;
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return toBase64Url(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

/** Creates a signed, expiring session token to store in an httpOnly cookie. */
export async function createSessionToken(): Promise<string> {
  const secret = getSecret();
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = String(expires);
  const signature = await hmac(payload, secret);
  return `${payload}.${signature}`;
}

/** Verifies a session token's signature and expiry. */
export async function verifySessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expires = Number(payload);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  try {
    const secret = getSecret();
    const expected = await hmac(payload, secret);
    return timingSafeEqual(signature, expected);
  } catch {
    return false;
  }
}
