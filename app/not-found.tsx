import Link from "next/link";
import { Home, Search, ShieldCheck } from "lucide-react";
import { LogoMark, Wordmark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center">
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.22),transparent)]" />

      <Link href="/" className="rise mb-10 flex items-center gap-2.5" aria-label="Wizeazy home">
        <LogoMark size={36} />
        <Wordmark />
      </Link>

      <p className="rise text-[clamp(6rem,22vw,11rem)] font-semibold leading-none tracking-[-0.06em] text-content" style={{ ["--rise-delay" as string]: "60ms" }}>
        4<span className="serif-accent text-brand-500 dark:text-brand-300">0</span>4
      </p>
      <h1 className="rise mt-2 text-2xl font-semibold tracking-tight text-content sm:text-3xl" style={{ ["--rise-delay" as string]: "120ms" }}>
        This page went out of stock
      </h1>
      <p className="rise mx-auto mt-3 max-w-md text-muted" style={{ ["--rise-delay" as string]: "160ms" }}>
        The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back to the good stuff.
      </p>

      <div className="rise mt-8 flex flex-col items-center gap-2.5 sm:flex-row" style={{ ["--rise-delay" as string]: "220ms" }}>
        <Link href="/" className="btn-primary">
          <Home className="h-4 w-4" /> Back to store
        </Link>
        <Link href="/#shop" className="btn-ghost">
          <Search className="h-4 w-4" /> Browse products
        </Link>
        <Link href="/admin" className="btn-quiet">
          <ShieldCheck className="h-4 w-4" /> Admin
        </Link>
      </div>
    </main>
  );
}
