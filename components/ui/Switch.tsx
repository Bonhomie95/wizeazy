"use client";

import { cn } from "@/lib/utils";

/** iOS-style switch with a springy thumb. */
export function Switch({
  checked,
  onChange,
  label,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => {
        e.preventDefault();
        onChange(!checked);
      }}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-page disabled:opacity-50",
        checked ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700",
        className,
      )}
    >
      <span
        className={cn(
          "h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.16)] transition-transform duration-300 ease-spring",
          checked ? "translate-x-[20px]" : "translate-x-0",
        )}
      />
    </button>
  );
}

/** Segmented control (UISegmentedControl look). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("relative grid rounded-full bg-surface-2 p-1", className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden
        className="absolute bottom-1 top-1 rounded-full bg-surface-solid shadow-[0_3px_8px_rgba(0,0,0,0.12),0_1px_1px_rgba(0,0,0,0.08)] transition-transform duration-500 ease-spring dark:bg-zinc-700"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, left: "0.25rem", transform: `translateX(${index * 100}%)` }}
      />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cn(
            "relative z-10 min-h-[2.25rem] rounded-full px-3 text-[13px] font-semibold transition-colors duration-300",
            o.value === value ? "text-content" : "text-muted hover:text-content",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
