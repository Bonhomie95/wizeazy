"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { ArrowUpRight, Menu, Search, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, socialLinks } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { WhatsAppIcon, InstagramIcon, SnapchatIcon, TelegramIcon } from "./SocialIcons";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { label: "Shop", href: "#shop" },
  { label: "Categories", href: "#categories" },
  { label: "Why us", href: "#why" },
  { label: "Contact", href: "#contact" },
];

export function focusSearch() {
  const el = document.getElementById("store-search") as HTMLInputElement | null;
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => el.focus({ preventScroll: true }), 350);
}

export function Navbar() {
  const { settings } = useStore();
  const links = socialLinks(settings);
  const [open, setOpen] = useState(false);

  // keep the bar visible while the mobile menu is open; lock page scroll
  useEffect(() => {
    document.documentElement.dataset.menuOpen = open ? "true" : "false";
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // ⌘K / Ctrl+K jumps to search
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSearch();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header data-autohide className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4">
      <nav
        aria-label="Main"
        className={cn(
          "mx-auto flex max-w-7xl items-center justify-between rounded-full border border-transparent py-2 pl-3 pr-2 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500",
          "[html[data-scrolled=true]_&]:border-hairline [html[data-scrolled=true]_&]:bg-elevated [html[data-scrolled=true]_&]:shadow-soft [html[data-scrolled=true]_&]:backdrop-blur-2xl [html[data-scrolled=true]_&]:backdrop-saturate-150",
          open && "border-hairline bg-elevated backdrop-blur-2xl",
        )}
      >
        <Link href="/" className="group flex items-center gap-2.5 rounded-full pr-2" aria-label={`${settings.storeName} home`}>
          <LogoMark size={34} className="transition-transform duration-500 ease-spring group-hover:rotate-[-8deg] group-hover:scale-105" />
          <Wordmark name={settings.storeName} />
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative rounded-full px-4 py-2 text-[14px] font-medium text-content2 transition-colors hover:text-content"
            >
              {item.label}
              <span className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-content transition-transform duration-300 ease-spring group-hover:scale-x-100" />
            </a>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={focusSearch} className="icon-btn hidden sm:grid" aria-label="Search products (Ctrl+K)">
            <Search className="h-[18px] w-[18px]" />
          </button>
          <ThemeToggle />
          <a
            href={links.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary hidden !min-h-[2.6rem] !px-4 md:inline-flex"
          >
            <WhatsAppIcon className="h-4 w-4" />
            Chat to buy
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="icon-btn md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            <span className="relative h-5 w-5">
              <Menu className={cn("absolute inset-0 h-5 w-5 transition-all duration-300", open ? "rotate-90 scale-50 opacity-0" : "opacity-100")} />
              <X className={cn("absolute inset-0 h-5 w-5 transition-all duration-300", open ? "rotate-0 opacity-100" : "-rotate-90 scale-50 opacity-0")} />
            </span>
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <m.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.15 } }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="mx-auto mt-2 max-w-7xl rounded-[28px] glass-strong p-3 shadow-lift md:hidden"
          >
            <ul className="flex flex-col">
              {NAV.map((item, i) => (
                <m.li
                  key={item.href}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0, transition: { delay: 0.04 * i + 0.05 } }}
                >
                  <a
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[17px] font-semibold tracking-tight text-content transition active:bg-surface-hover"
                  >
                    {item.label}
                    <ArrowUpRight className="h-4 w-4 text-faint" />
                  </a>
                </m.li>
              ))}
            </ul>
            <div className="mt-2 grid grid-cols-4 gap-2 border-t border-hairline p-2 pt-3">
              {[
                { href: links.whatsapp, label: "WhatsApp", Icon: WhatsAppIcon },
                { href: links.instagram, label: "Instagram", Icon: InstagramIcon },
                { href: links.snapchat, label: "Snapchat", Icon: SnapchatIcon },
                { href: links.telegram, label: "Telegram", Icon: TelegramIcon },
              ].map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 rounded-2xl py-2.5 text-[11px] font-medium text-muted transition active:bg-surface-hover"
                >
                  <Icon className="h-5 w-5 text-content" />
                  {label}
                </a>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </header>
  );
}
