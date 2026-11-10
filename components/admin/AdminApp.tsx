"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m, useAnimationControls } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Boxes, Eye, EyeOff, Layers, LockKeyhole, LogOut, Settings2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { BrandLoader, LogoMark, Wordmark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmProvider } from "@/components/ui/Confirm";
import { ScrollEffects } from "@/components/ui/ScrollEffects";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ProductsPanel } from "./ProductsPanel";
import { CategoriesPanel } from "./CategoriesPanel";
import { SettingsPanel } from "./SettingsPanel";

type Tab = "products" | "categories" | "settings";

const TABS: { key: Tab; label: string; icon: typeof Boxes; blurb: string }[] = [
  { key: "products", label: "Products", icon: Boxes, blurb: "Your catalogue, stock and pricing." },
  { key: "categories", label: "Categories", icon: Layers, blurb: "How shoppers browse your store." },
  { key: "settings", label: "Settings", icon: Settings2, blurb: "Store details and contact channels." },
];

export function AdminApp({ initialAuthed }: { initialAuthed: boolean }) {
  const [authed, setAuthed] = useState(initialAuthed);
  return (
    <Toaster>
      <ConfirmProvider>
        <AnimatePresence mode="wait" initial={false}>
          {authed ? (
            <m.div key="dash" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard onLogout={() => setAuthed(false)} />
            </m.div>
          ) : (
            <m.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }}>
              <Gate onSuccess={() => setAuthed(true)} />
            </m.div>
          )}
        </AnimatePresence>
      </ConfirmProvider>
    </Toaster>
  );
}

/* ---------------- Password gate ---------------- */

function Gate({ onSuccess }: { onSuccess: () => void }) {
  const { refresh } = useStore();
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);
  const [caps, setCaps] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const shake = useAnimationControls();
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) {
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: value }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Incorrect password. Try again.");
        shake.start({ x: [0, -10, 10, -7, 7, -3, 0], transition: { duration: 0.45 } });
        inputRef.current?.select();
        return;
      }
      await refresh().catch(() => {});
      onSuccess();
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.25),transparent)]" />
      <m.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
        className="w-full max-w-[400px]"
      >
      <m.div
        animate={shake}
        className="w-full rounded-[32px] border border-hairline bg-surface-solid p-8 shadow-lift sm:p-10"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <LogoMark size={56} />
          <h1 className="mt-6 text-[26px] font-semibold tracking-[-0.03em] text-content">Welcome back</h1>
          <p className="mt-1.5 text-[15px] text-muted">Enter your admin password to manage the store.</p>
        </div>
        <form onSubmit={submit} noValidate>
          {/* lets password managers pair the saved password with this site */}
          <input type="text" name="username" autoComplete="username" value="admin" readOnly hidden />
          <label htmlFor="admin-password" className="label">
            Password
          </label>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-faint" />
            <input
              id="admin-password"
              ref={inputRef}
              autoFocus
              type={show ? "text" : "password"}
              autoComplete="current-password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              onKeyUp={(e) => setCaps(e.getModifierState?.("CapsLock") ?? false)}
              placeholder="••••••••"
              className={cn("input !pl-11 !pr-12 text-[16px]", error && "!border-rose-500/70 !ring-rose-500/15")}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "gate-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-faint transition hover:text-content"
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          <div className="min-h-[1.75rem] pt-2 text-[13px]" aria-live="polite">
            {error ? (
              <p id="gate-error" className="font-medium text-rose-500 dark:text-rose-400">
                {error}
              </p>
            ) : caps ? (
              <p className="text-amber-600 dark:text-amber-400">Caps Lock is on</p>
            ) : null}
          </div>
          <Button type="submit" loading={loading} loadingText="Unlocking…" className="mt-1 w-full !min-h-[3rem]">
            Unlock dashboard
          </Button>
        </form>
        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-1.5 text-[13px] font-medium text-muted transition hover:text-content"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to store
        </Link>
      </m.div>
      </m.div>
    </main>
  );
}

/* ---------------- Dashboard shell ---------------- */

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const { products, categories, settings, hydrated } = useStore();
  const [tab, setTab] = useState<Tab>("products");
  const [loggingOut, setLoggingOut] = useState(false);

  // remember the last tab (per device) — a small convenience
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wz-admin-tab") as Tab | null;
      if (saved && TABS.some((t) => t.key === saved)) setTab(saved);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const choose = (t: Tab) => {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      localStorage.setItem("wz-admin-tab", t);
    } catch {
      /* ignore */
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      setLoggingOut(false);
      onLogout();
    }
  };

  const counts: Record<Tab, number | null> = { products: products.length, categories: categories.length, settings: null };
  const active = TABS.find((t) => t.key === tab)!;

  return (
    <div className="min-h-dvh lg:pl-[268px]">
      <ScrollEffects bottomClass="bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] lg:bottom-6" />

      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[268px] flex-col border-r border-hairline bg-page-2/70 px-4 pb-5 pt-6 backdrop-blur-xl lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-2" aria-label="View store">
          <LogoMark size={36} />
          <span className="leading-tight">
            <Wordmark name={settings.storeName} className="text-[18px]" />
            <span className="block text-[12px] font-medium text-faint">Store admin</span>
          </span>
        </Link>

        <nav className="mt-9 flex flex-col gap-1" aria-label="Admin sections">
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => choose(t.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-2xl px-3.5 py-3 text-[15px] font-medium transition-colors",
                  isActive ? "text-content" : "text-muted hover:bg-surface-2 hover:text-content",
                )}
              >
                {isActive && (
                  <m.span
                    layoutId="admin-nav-pill"
                    className="absolute inset-0 rounded-2xl border border-hairline bg-surface-solid shadow-soft"
                    transition={{ type: "spring", stiffness: 420, damping: 36 }}
                  />
                )}
                <t.icon className={cn("relative h-[19px] w-[19px]", isActive && "text-brand-500 dark:text-brand-300")} />
                <span className="relative flex-1 text-left">{t.label}</span>
                {counts[t.key] !== null && (
                  <span className="tabular relative rounded-full bg-surface-2 px-2 py-0.5 text-[12px] font-semibold text-faint">
                    {counts[t.key]}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <Link href="/" target="_blank" className="btn-ghost justify-between !rounded-2xl">
            View store <ArrowUpRight className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="ghost" onClick={logout} loading={loggingOut} icon={<LogOut className="h-4 w-4" />} className="flex-1 !rounded-2xl">
              Log out
            </Button>
          </div>
        </div>
      </aside>

      {/* Top bar (mobile / tablet) */}
      <header data-autohide className="sticky top-0 z-40 border-b border-hairline bg-page/80 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center gap-2" aria-label="View store">
            <LogoMark size={32} />
            <span className="text-[15px] font-semibold tracking-tight text-content">Admin</span>
          </Link>
          <div className="flex items-center gap-1.5">
            <ThemeToggle />
            <button type="button" onClick={logout} className="icon-btn" aria-label="Log out" disabled={loggingOut}>
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mb-8">
          <h1 className="text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-tight tracking-[-0.035em] text-content">{active.label}</h1>
          <p className="mt-1 text-[15px] text-muted">{active.blurb}</p>
        </div>

        {!hydrated ? (
          <div className="grid place-items-center py-24">
            <BrandLoader size={48} />
            <p className="mt-4 text-sm text-muted">Loading your store…</p>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              {tab === "products" && <ProductsPanel />}
              {tab === "categories" && <CategoriesPanel />}
              {tab === "settings" && <SettingsPanel />}
            </m.div>
          </AnimatePresence>
        )}
      </main>

      {/* Tab bar (mobile) */}
      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          {TABS.map((t) => {
            const isActive = t.key === tab;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => choose(t.key)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition-colors",
                  isActive ? "text-brand-500 dark:text-brand-300" : "text-faint",
                )}
              >
                <t.icon className={cn("h-6 w-6 transition-transform duration-300 ease-spring", isActive && "scale-110")} strokeWidth={isActive ? 2.2 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
