"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X, Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { socialLinks } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { WhatsAppIcon, InstagramIcon, SnapchatIcon, TelegramIcon } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { label: "Shop", href: "#shop" },
  { label: "Categories", href: "#categories" },
  { label: "Why Wizeazy", href: "#why" },
  { label: "Contact", href: "#contact" },
];

export function Navbar() {
  const { settings } = useStore();
  const links = socialLinks(settings);
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled ? "py-2" : "py-4",
      )}
    >
      <div className="mx-auto max-w-7xl px-4">
        <nav
          className={cn(
            "flex items-center justify-between rounded-2xl px-4 py-2.5 transition-all duration-300",
            scrolled ? "glass-strong shadow-card" : "border border-transparent",
          )}
        >
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <Zap className="h-5 w-5 text-white" fill="currentColor" />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-content">
              {settings.storeName}
              <span className="text-brand-400">.</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-content2 transition hover:bg-surface-2 hover:text-content"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <SocialDot href={links.whatsapp} label="WhatsApp">
                <WhatsAppIcon className="h-4 w-4" />
              </SocialDot>
              <SocialDot href={links.instagram} label="Instagram">
                <InstagramIcon className="h-4 w-4" />
              </SocialDot>
              <SocialDot href={links.telegram} label="Telegram">
                <TelegramIcon className="h-4 w-4" />
              </SocialDot>
            </div>
            <ThemeToggle />
            <a href="#shop" className="btn-primary hidden md:inline-flex">
              Browse deals
            </a>
            <button
              onClick={() => setOpen((v) => !v)}
              className="btn-ghost !px-2.5 md:hidden"
              aria-label="Toggle menu"
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {open && (
          <div className="mt-2 flex flex-col gap-1 rounded-2xl glass-strong p-3 md:hidden">
            {NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-content2 transition hover:bg-surface-2"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-1 flex items-center gap-2 px-1 pt-1">
              <SocialDot href={links.whatsapp} label="WhatsApp">
                <WhatsAppIcon className="h-4 w-4" />
              </SocialDot>
              <SocialDot href={links.instagram} label="Instagram">
                <InstagramIcon className="h-4 w-4" />
              </SocialDot>
              <SocialDot href={links.snapchat} label="Snapchat">
                <SnapchatIcon className="h-4 w-4" />
              </SocialDot>
              <SocialDot href={links.telegram} label="Telegram">
                <TelegramIcon className="h-4 w-4" />
              </SocialDot>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function SocialDot({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-xl border border-hairline bg-surface-2 text-content2 transition hover:bg-surface-hover hover:text-content"
    >
      {children}
    </a>
  );
}
