"use client";

import { LazyMotion } from "framer-motion";

/**
 * framer-motion's animation engine is code-split and loaded after first paint
 * (components use the tiny `m.*` shells). `strict` makes any accidental
 * full `motion.*` import fail loudly, keeping the initial bundle small.
 */
const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
