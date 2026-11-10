import { cn } from "@/lib/utils";

/**
 * Wizeazy brand mark: a squircle tile with a split "charge" bolt.
 * Pure SVG/CSS — server-renderable and usable before hydration.
 */

const BOLT = "M13.4 2.6 5.3 13.1c-.35.46-.02 1.12.55 1.12h4.7l-1.3 6.9c-.12.66.71 1.03 1.12.5l8.1-10.5c.35-.46.02-1.12-.55-1.12h-4.72l1.32-6.9c.13-.66-.7-1.03-1.12-.5Z";

export function BoltGlyph({ className, charging = false }: { className?: string; charging?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <defs>
        <clipPath id="wz-bolt-clip">
          <path d={BOLT} />
        </clipPath>
      </defs>
      {charging ? (
        <>
          <path d={BOLT} fill="currentColor" opacity="0.3" />
          <g clipPath="url(#wz-bolt-clip)">
            <rect className="wz-loader__charge" x="0" y="0" width="24" height="24" fill="currentColor" />
          </g>
        </>
      ) : (
        <path d={BOLT} fill="currentColor" />
      )}
    </svg>
  );
}

export function LogoMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center overflow-hidden text-white", className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: "linear-gradient(145deg,#8b5cff 0%,#6d28d9 55%,#4c1d95 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 8px 24px -10px rgba(124,58,237,.8)",
      }}
      aria-hidden
    >
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
      <BoltGlyph className="relative h-[58%] w-[58%]" />
    </span>
  );
}

export function Wordmark({ name = "Wizeazy", className }: { name?: string; className?: string }) {
  return (
    <span className={cn("text-[19px] font-semibold tracking-[-0.03em] text-content", className)}>
      {name}
      <span className="text-brand-400">.</span>
    </span>
  );
}

/**
 * Animated brand loader ("charging bolt"). Sizes: sm 18 · md 44 · lg 64.
 * Used for the splash, route loading and data loading states.
 */
export function BrandLoader({
  size = 44,
  label = "Loading",
  className,
}: {
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn("wz-loader", className)}
      style={{ ["--wz-size" as string]: `${size}px` }}
    >
      <span className="wz-loader__ring" />
      <span className="wz-loader__tile">
        <BoltGlyph className="wz-loader__bolt" charging />
      </span>
    </span>
  );
}

/** Compact inline variant for buttons: just the charging bolt. */
export function BoltSpinner({ className }: { className?: string }) {
  return (
    <span className={cn("wz-bolt-spin relative inline-grid h-[18px] w-[18px] place-items-center", className)} aria-hidden>
      <span className="absolute inset-0 animate-pulse-ring rounded-full bg-current opacity-30" />
      <BoltGlyph className="relative h-full w-full" charging />
    </span>
  );
}
