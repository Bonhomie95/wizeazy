"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Image with a graceful branded fallback. If the remote image fails to load
 * (e.g. an Unsplash URL 404s or the admin left it blank), we show a tasteful
 * gradient placeholder instead of a broken-image icon.
 */
export function ProductImage({
  src,
  alt,
  className,
  sizes,
}: {
  src?: string;
  alt: string;
  className?: string;
  sizes?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[var(--img-bg)]",
          className,
        )}
        aria-label={alt}
      >
        <div className="flex flex-col items-center gap-2 text-faint">
          <ImageIcon className="h-8 w-8" />
          <span className="max-w-[80%] text-center text-[11px] font-medium leading-tight text-faint">
            {alt}
          </span>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      sizes={sizes}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
