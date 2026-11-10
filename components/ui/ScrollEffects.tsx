"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One passive, rAF-throttled scroll listener for the whole page. It writes
 * CSS variables / data-attributes on <html> instead of React state, so
 * scrolling never re-renders the tree:
 *   --scroll-progress   → top progress hairline + ring on the scroll button
 *   data-scroll-dir     → navbar hides on the way down, returns on the way up
 *   data-scrolled       → compact navbar styling
 * React state only flips when the floating buttons need to appear/disappear.
 */
export function ScrollEffects({ controls = true, bottomClass }: { controls?: boolean; bottomClass?: string }) {
  const [ui, setUi] = useState({ show: false, atTop: true, atBottom: false });

  useEffect(() => {
    const root = document.documentElement;
    let lastY = window.scrollY;
    let ticking = false;
    let prev = "";

    const update = () => {
      ticking = false;
      const y = window.scrollY;
      const max = Math.max(1, root.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, y / max));
      root.style.setProperty("--scroll-progress", progress.toFixed(4));
      root.dataset.scrolled = y > 24 ? "true" : "false";
      if (Math.abs(y - lastY) > 6) {
        root.dataset.scrollDir = y > lastY ? "down" : "up";
        lastY = y;
      }
      const next = {
        show: max > window.innerHeight * 0.6 && y > 320,
        atTop: y < 40,
        atBottom: y > max - 40,
      };
      const key = `${next.show}${next.atTop}${next.atBottom}`;
      if (key !== prev) {
        prev = key;
        setUi(next);
      }
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const go = (where: "top" | "bottom") => {
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({
      top: where === "top" ? 0 : document.documentElement.scrollHeight,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  return (
    <>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[2px]">
        <div className="scroll-progress h-full w-full bg-gradient-to-r from-brand-400 via-brand-500 to-cyber-400" />
      </div>

      {controls && (
        <div
          className={cn(
            "fixed right-4 z-50 flex flex-col items-center overflow-hidden rounded-full glass-strong shadow-lift transition-all duration-500 ease-spring sm:right-6",
            bottomClass ?? "bottom-[max(1.25rem,env(safe-area-inset-bottom))]",
            ui.show ? "translate-y-0 scale-100 opacity-100" : "pointer-events-none translate-y-6 scale-90 opacity-0",
          )}
          role="group"
          aria-label="Page scroll"
        >
          <button
            type="button"
            onClick={() => go("top")}
            disabled={ui.atTop}
            aria-label="Scroll to top"
            className="group relative grid h-12 w-12 place-items-center text-content transition active:scale-90 disabled:opacity-35"
          >
            <svg viewBox="0 0 48 48" className="absolute inset-1 -rotate-90" aria-hidden>
              <circle cx="24" cy="24" r="19" fill="none" stroke="var(--hairline)" strokeWidth="2" />
              <circle
                cx="24"
                cy="24"
                r="19"
                fill="none"
                stroke="url(#wz-scroll-grad)"
                strokeWidth="2.25"
                strokeLinecap="round"
                pathLength={1}
                style={{ strokeDasharray: 1, strokeDashoffset: "calc(1 - var(--scroll-progress, 0))" }}
              />
              <defs>
                <linearGradient id="wz-scroll-grad" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#8b5cff" />
                  <stop offset="1" stopColor="#38f2e0" />
                </linearGradient>
              </defs>
            </svg>
            <ArrowUp className="relative h-[18px] w-[18px] transition-transform duration-300 ease-spring group-hover:-translate-y-0.5" />
          </button>
          <span className="h-px w-6 bg-hairline" aria-hidden />
          <button
            type="button"
            onClick={() => go("bottom")}
            disabled={ui.atBottom}
            aria-label="Scroll to bottom"
            className="group grid h-12 w-12 place-items-center text-content transition active:scale-90 disabled:opacity-35"
          >
            <ArrowDown className="h-[18px] w-[18px] transition-transform duration-300 ease-spring group-hover:translate-y-0.5" />
          </button>
        </div>
      )}
    </>
  );
}
