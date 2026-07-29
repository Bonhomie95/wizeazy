import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { ThemeProvider, themeInitScript } from "@/lib/theme";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Wizeazy — Premium Phones, Laptops & Gadgets",
  description:
    "Shop the latest smartphones, laptops, audio, wearables and gadgets at Wizeazy. Browse, tap buy now and chat with us instantly on WhatsApp.",
  keywords: [
    "Wizeazy",
    "phones",
    "laptops",
    "electronics",
    "gadgets",
    "buy phones online",
  ],
  openGraph: {
    title: "Wizeazy — Premium Phones, Laptops & Gadgets",
    description:
      "Browse premium electronics and buy instantly via WhatsApp, Instagram, Snapchat or Telegram.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#080711",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider>
          <StoreProvider>{children}</StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
