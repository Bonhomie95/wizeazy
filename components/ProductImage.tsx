"use client";

import { useEffect, useRef, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Product image with a shimmer while loading and a clean fallback.
 *
 * Fixes a hydration race: if an image fails *before* React hydrates, the
 * `onError` event is missed and a broken-image icon sticks forever. We
 * re-check `complete && naturalWidth === 0` on mount to catch that case.
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes,
  fit = "cover",
  priority = false,
  compact = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
  fit?: "cover" | "contain";
  priority?: boolean;
  /** small thumbnails: icon-only fallback, no caption */
  compact?: boolean;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "failed">(src ? "loading" : "failed");
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setState(src ? "loading" : "failed");
  }, [src]);

  useEffect(() => {
    const img = ref.current;
    if (!img || !src) return;
    if (img.complete) setState(img.naturalWidth > 0 ? "loaded" : "failed");
  }, [src]);

  if (!src || state === "failed") {
    return (
      <div className={cn("flex items-center justify-center bg-[var(--img-bg)] text-zinc-500", className)} role="img" aria-label={alt}>
        {compact ? (
          <ImageIcon className="h-[40%] max-h-6 w-[40%] max-w-6" strokeWidth={1.6} />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <ImageIcon className="h-8 w-8" strokeWidth={1.4} />
            <span className="line-clamp-2 text-[11px] font-medium leading-tight text-zinc-600">{alt}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <span className={cn("relative block overflow-hidden bg-[var(--img-bg)]", className)}>
      {state === "loading" && <span className="skeleton absolute inset-0 rounded-none !bg-black/[0.04]" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={ref}
        src={src}
        alt={alt}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setState("loaded")}
        onError={() => setState("failed")}
        className={cn(
          "h-full w-full transition-[opacity,transform] duration-500 ease-spring",
          fit === "contain" ? "object-contain p-[7%] mix-blend-multiply" : "object-cover",
          // priority (above-the-fold) images never fade: keeps LCP measurable and instant
          priority || state === "loaded" ? "opacity-100" : "opacity-0",
        )}
      />
    </span>
  );
}
