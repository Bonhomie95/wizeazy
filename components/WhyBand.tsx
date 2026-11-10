import { BadgeCheck, Headphones, Truck, Wallet } from "lucide-react";
import { Reveal } from "./ui/Reveal";

const FEATURES = [
  {
    icon: BadgeCheck,
    title: "Genuine, always",
    body: "Every device is authentic and checked before it ships. No clones, no refurbished surprises sold as new.",
  },
  {
    icon: Truck,
    title: "Fast to your door",
    body: "Same-day dispatch in the city and tracked nationwide delivery, packed like it's our own.",
  },
  {
    icon: Headphones,
    title: "A real human replies",
    body: "Ask anything on WhatsApp, Instagram, Snapchat or Telegram — a person answers, usually within minutes.",
  },
  {
    icon: Wallet,
    title: "Honest pricing",
    body: "Fair prices shown upfront, with real deals on the gadgets people actually want.",
  },
];

export function WhyBand() {
  return (
    <section id="why" className="scroll-mt-24 border-y border-hairline bg-page-2/60">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-20 lg:grid-cols-[0.9fr_1.4fr] lg:gap-16 lg:py-28">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Why Wizeazy</p>
          <h2 className="section-title mt-3">
            Buying tech should feel <span className="serif-accent text-brand-500 dark:text-brand-300">easy.</span>
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-relaxed text-muted">
            The wize &amp; easy way to buy tech — built on trust, speed and people who genuinely care about getting you the right device.
          </p>
        </Reveal>

        <div className="grid gap-px overflow-hidden rounded-[30px] border border-hairline bg-hairline sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90} className="group relative bg-surface-solid p-7 transition-colors duration-500 hover:bg-surface sm:p-8">
              <span className="tabular absolute right-7 top-7 text-sm font-semibold text-faint">0{i + 1}</span>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/10 text-brand-500 transition-transform duration-500 ease-spring group-hover:-rotate-6 group-hover:scale-110 dark:text-brand-300">
                <f.icon className="h-6 w-6" strokeWidth={1.6} />
              </span>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-content">{f.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
