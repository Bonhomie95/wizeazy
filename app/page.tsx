import { Navbar } from "@/components/Navbar";
import { Storefront } from "@/components/Storefront";
import { WhyBand } from "@/components/WhyBand";
import { Footer } from "@/components/Footer";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Storefront />
        <WhyBand />
      </main>
      <Footer />
    </>
  );
}
