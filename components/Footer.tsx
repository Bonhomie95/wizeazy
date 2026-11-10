"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { useStore } from "@/lib/store";
import { socialLinks } from "@/lib/utils";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { Reveal } from "./ui/Reveal";
import { WhatsAppIcon, InstagramIcon, SnapchatIcon, TelegramIcon } from "./SocialIcons";

export function Footer() {
  const { settings } = useStore();
  const links = socialLinks(settings);
  const year = new Date().getFullYear();

  const channels = [
    { href: links.instagram, label: "Instagram", handle: `@${settings.instagram}`, Icon: InstagramIcon },
    { href: links.snapchat, label: "Snapchat", handle: `@${settings.snapchat}`, Icon: SnapchatIcon },
    { href: links.telegram, label: "Telegram", handle: `@${settings.telegram}`, Icon: TelegramIcon },
  ];

  return (
    <footer id="contact" className="relative scroll-mt-24">
      <div className="mx-auto max-w-7xl px-4 py-20 lg:py-28">
        <Reveal className="relative overflow-hidden rounded-[36px] border border-hairline bg-surface-solid p-8 shadow-soft sm:p-14">
          <div className="pointer-events-none absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(124,58,237,0.18),transparent)]" />
          <div className="relative grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-end">
            <div>
              <p className="eyebrow">Talk to us</p>
              <h2 className="mt-3 text-balance text-[clamp(2.2rem,5vw,3.8rem)] font-semibold leading-[1] tracking-[-0.045em] text-content">
                Questions? <span className="serif-accent text-brand-500 dark:text-brand-300">Just ask.</span>
              </h2>
              <p className="mt-4 max-w-md text-[17px] leading-relaxed text-muted">
                Tell us what you need and your budget — we&apos;ll reply fast and help you pick the right device.
              </p>
              <a
                href={links.whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp mt-8 !min-h-[3.25rem] !px-7 text-[15px]"
              >
                <WhatsAppIcon className="h-5 w-5" /> Chat on WhatsApp
              </a>
            </div>

            <ul className="grid gap-2">
              {channels.map(({ href, label, handle, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center gap-4 rounded-2xl border border-hairline px-4 py-3.5 transition-all duration-300 ease-spring hover:-translate-y-0.5 hover:border-hairline-strong hover:bg-surface-2"
                  >
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface-2 text-content">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-content">{label}</span>
                      <span className="block text-[13px] text-faint">{handle}</span>
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-faint transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-content" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <div className="border-t border-hairline">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row">
          <Link href="/" className="flex items-center gap-2.5" aria-label={`${settings.storeName} home`}>
            <LogoMark size={30} />
            <Wordmark name={settings.storeName} className="text-[17px]" />
          </Link>
          <p className="text-center text-xs text-faint">
            © {year} {settings.storeName}. Premium phones, laptops &amp; gadgets.
          </p>
          <Link href="/admin" className="text-xs font-medium text-faint transition hover:text-content">
            Store admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
