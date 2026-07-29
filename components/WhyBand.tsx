"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Truck, Headphones, Wallet } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Genuine & warrantied",
    body: "Every device is 100% authentic and backed by warranty. No clones, no surprises.",
  },
  {
    icon: Truck,
    title: "Fast delivery",
    body: "Same-day dispatch in the city and swift nationwide shipping to your door.",
  },
  {
    icon: Headphones,
    title: "Real human support",
    body: "Chat with us directly on WhatsApp, Instagram, Snapchat or Telegram — anytime.",
  },
  {
    icon: Wallet,
    title: "Best-value pricing",
    body: "Fair, transparent prices with regular deals on the gadgets you actually want.",
  },
];

export function WhyBand() {
  return (
    <section id="why" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16">
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-content">
          Why shop with <span className="text-gradient">Wizeazy</span>
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-muted">
          The wize &amp; easy way to buy tech — built on trust, speed and genuine care.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="group rounded-2xl glass p-6 transition-all hover:border-brand-400/40 hover:shadow-glow"
          >
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-400/20 to-brand-600/10 text-brand-400 transition group-hover:scale-105">
              <f.icon className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-content">{f.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
