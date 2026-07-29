"use client";

import Link from "next/link";
import { Zap } from "lucide-react";
import { useStore } from "@/lib/store";
import { socialLinks } from "@/lib/utils";
import {
  WhatsAppIcon,
  InstagramIcon,
  SnapchatIcon,
  TelegramIcon,
} from "./SocialIcons";

export function Footer() {
  const { settings } = useStore();
  const links = socialLinks(settings);
  const year = new Date().getFullYear();

  const channels = [
    { href: links.whatsapp, label: "WhatsApp", Icon: WhatsAppIcon },
    { href: links.instagram, label: "Instagram", Icon: InstagramIcon },
    { href: links.snapchat, label: "Snapchat", Icon: SnapchatIcon },
    { href: links.telegram, label: "Telegram", Icon: TelegramIcon },
  ];

  return (
    <footer id="contact" className="relative scroll-mt-24 border-t border-hairline">
      {/* Contact CTA */}
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="relative overflow-hidden rounded-3xl glass-strong p-8 text-center shadow-card sm:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-cyber-500/10 blur-3xl" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight text-content sm:text-3xl">
              Ready to grab your next gadget?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-muted">
              Message us on any platform — we reply fast and help you pick the
              perfect device.
            </p>
            <div className="mx-auto mt-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              {channels.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 rounded-2xl border border-hairline bg-surface-2 px-4 py-5 text-sm font-semibold text-content2 transition hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-surface-hover hover:text-content"
                >
                  <Icon className="h-6 w-6 text-brand-400" />
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-7 sm:flex-row">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 shadow-glow">
              <Zap className="h-4 w-4 text-white" fill="currentColor" />
            </span>
            <span className="font-extrabold text-content">
              {settings.storeName}
              <span className="text-brand-400">.</span>
            </span>
          </Link>

          <p className="text-xs text-faint">
            © {year} {settings.storeName}. Premium phones, laptops &amp; gadgets.
          </p>
        </div>
      </div>
    </footer>
  );
}
