"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pageList(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("…");
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push("…");
  pages.push(total);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-12 flex items-center justify-center gap-1.5" aria-label="Pagination">
      <button type="button" onClick={() => onChange(page - 1)} disabled={page === 1} className="icon-btn" aria-label="Previous page">
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-1 rounded-full border border-hairline bg-surface-solid p-1">
        {pageList(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-2 text-sm text-faint">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={cn(
                "tabular grid h-9 min-w-9 place-items-center rounded-full px-3 text-sm font-semibold transition-all duration-300 ease-spring",
                p === page ? "bg-content text-page" : "text-content2 hover:bg-surface-hover hover:text-content",
              )}
            >
              {p}
            </button>
          ),
        )}
      </div>
      <button type="button" onClick={() => onChange(page + 1)} disabled={page === totalPages} className="icon-btn" aria-label="Next page">
        <ChevronRight className="h-5 w-5" />
      </button>
    </nav>
  );
}
