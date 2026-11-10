"use client";

import { useEffect, useRef } from "react";

/**
 * Direction-aware scroll reveal, built on ONE shared IntersectionObserver
 * (cheap even with hundreds of elements) and CSS transitions (GPU-friendly
 * transform/opacity only — see [data-reveal] rules in globals.css).
 *
 * Scrolling down, sections rise in from below; scrolling back up, they
 * drop in from above. Elements already on screen at mount are left alone,
 * so the first paint is never hidden.
 */

let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) return null;
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (entry.isIntersecting && entry.intersectionRatio > 0.06) {
          el.dataset.reveal = "shown";
        } else if (!entry.isIntersecting) {
          const rootBottom = entry.rootBounds?.bottom ?? window.innerHeight;
          el.dataset.reveal = entry.boundingClientRect.top >= rootBottom ? "hidden-below" : "hidden-above";
        }
      }
    },
    { threshold: [0, 0.07], rootMargin: "0px 0px -6% 0px" },
  );
  return observer;
}

const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useReveal<T extends HTMLElement>(delayMs = 0) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    const io = getObserver();
    if (!el || !io || reducedMotion()) return;
    if (delayMs) el.style.setProperty("--reveal-delay", `${delayMs}ms`);
    // No getBoundingClientRect here: the observer's first (async) callback
    // reports where the element is, so mounting many cards never forces
    // synchronous layout. Off-screen ones get hidden before they're seen.
    io.observe(el);
    return () => io.unobserve(el);
  }, [delayMs]);
  return ref;
}
