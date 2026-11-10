"use client";

import { forwardRef } from "react";
import { BoltSpinner } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";

type Variant = "primary" | "ghost" | "quiet" | "danger" | "whatsapp";

const VARIANT: Record<Variant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  quiet: "btn-quiet",
  danger: "btn-danger",
  whatsapp: "btn-whatsapp",
};

/**
 * Button with a branded loading state: the label stays (no width jump),
 * the leading icon swaps for the charging-bolt spinner, and the button is
 * marked aria-busy + disabled while the async work runs.
 */
export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    loading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
  }
>(function Button({ variant = "primary", loading = false, loadingText, icon, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type={rest.type ?? "button"}
      className={cn(VARIANT[variant], loading && "cursor-progress", className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <BoltSpinner /> : icon}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  );
});
