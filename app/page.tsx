import { Navbar } from "@/components/Navbar";
import { Storefront } from "@/components/Storefront";
import { WhyBand } from "@/components/WhyBand";
import { Footer } from "@/components/Footer";
import { StoreProvider } from "@/lib/store";
import { getCachedStoreData } from "@/lib/cache";
import { ScrollEffects } from "@/components/ui/ScrollEffects";
import type { StoreData } from "@/lib/types";

// Rendered per request from a short-lived cache (see lib/cache.ts).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  let data: StoreData | null = null;
  try {
    data = await getCachedStoreData();
  } catch (err) {
    console.error("[store] initial load failed; the client will retry", err);
  }

  return (
    <StoreProvider initialData={data}>
      <ScrollEffects />
      <Navbar />
      <main>
        <Storefront />
        <WhyBand />
      </main>
      <Footer />
    </StoreProvider>
  );
}
