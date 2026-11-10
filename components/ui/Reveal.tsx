"use client";

import { useReveal } from "@/lib/reveal";

type Tag = "div" | "section" | "article" | "li" | "header" | "footer" | "span";

/** Wrap any block to animate it in on scroll (both directions). */
export function Reveal({
  as = "div",
  delay = 0,
  className,
  children,
  ...rest
}: {
  as?: Tag;
  delay?: number;
  className?: string;
  children: React.ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  const ref = useReveal<HTMLElement>(delay);
  const Comp = as as React.ElementType;
  return (
    <Comp ref={ref} data-reveal="shown" className={className} {...rest}>
      {children}
    </Comp>
  );
}
