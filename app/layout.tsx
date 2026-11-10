import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { splashInitScript, themeInitScript } from "@/lib/theme-script";
import { MotionProvider } from "@/components/ui/MotionProvider";
import { BrandLoader, Wordmark } from "@/components/brand/Logo";

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["italic"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wizeazy — Premium Phones, Laptops & Gadgets",
  description:
    "Shop the latest smartphones, laptops, audio, wearables and gadgets at Wizeazy. Browse, tap buy now and chat with us instantly on WhatsApp.",
  keywords: ["Wizeazy", "phones", "laptops", "electronics", "gadgets", "buy phones online"],
  openGraph: {
    title: "Wizeazy — Premium Phones, Laptops & Gadgets",
    description: "Browse premium electronics and buy instantly via WhatsApp, Instagram, Snapchat or Telegram.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#08080a" },
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript + splashInitScript }} />
      </head>
      <body className="font-sans">
        <div id="wz-splash" aria-hidden>
          <div className="wz-splash__inner">
            <BrandLoader size={64} label="Loading Wizeazy" />
            <Wordmark className="text-[22px]" />
          </div>
        </div>
        <ThemeProvider>
          <MotionProvider>{children}</MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
