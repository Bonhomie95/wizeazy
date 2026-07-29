import Link from "next/link";
import { Home, ShieldCheck, Zap, Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 text-center">
      {/* decorative orbs */}
      <div className="pointer-events-none absolute -left-20 top-10 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-cyber-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center">
        <Link href="/" className="mb-8 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
            <Zap className="h-5 w-5 text-white" fill="currentColor" />
          </span>
          <span className="text-lg font-extrabold tracking-tight text-content">
            Wizeazy<span className="text-brand-400">.</span>
          </span>
        </Link>

        <p className="text-[7rem] font-extrabold leading-none text-gradient sm:text-[10rem]">
          404
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-content sm:text-3xl">
          This page went out of stock
        </h1>
        <p className="mx-auto mt-3 max-w-md text-muted">
          The page you're looking for doesn't exist or may have moved. Let's get
          you back to the good stuff.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Link href="/" className="btn-primary">
            <Home className="h-4 w-4" /> Back to store
          </Link>
          <Link href="/#shop" className="btn-ghost">
            <Search className="h-4 w-4" /> Browse products
          </Link>
          <Link href="/admin" className="btn-ghost">
            <ShieldCheck className="h-4 w-4" /> Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
