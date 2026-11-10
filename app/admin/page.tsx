import type { Metadata } from "next";
import { cookies } from "next/headers";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getStoreData } from "@/lib/db";
import { StoreProvider } from "@/lib/store";
import { AdminApp } from "@/components/admin/AdminApp";
import type { StoreData } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin · Wizeazy",
  robots: { index: false, follow: false },
};

/**
 * The session is checked on the server, so returning admins land straight
 * on the dashboard with fresh data — no spinner, no password-gate flash.
 */
export default async function AdminPage() {
  const authed = await verifySessionToken(cookies().get(COOKIE_NAME)?.value);
  let data: StoreData | null = null;
  if (authed) {
    try {
      data = await getStoreData();
    } catch (err) {
      console.error("[admin] initial load failed; the client will retry", err);
    }
  }

  return (
    <StoreProvider initialData={data}>
      <AdminApp initialAuthed={authed} />
    </StoreProvider>
  );
}
