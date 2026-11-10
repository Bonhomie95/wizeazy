"use client";

import { Check, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, formatPrice } from "@/lib/utils";
import { Switch } from "./ui/Switch";

export interface FilterState {
  brands: string[];
  maxPrice: number;
  inStockOnly: boolean;
  onSaleOnly: boolean;
}

export function Filters({
  brands,
  priceBounds,
  state,
  setState,
  onReset,
  className,
}: {
  brands: string[];
  priceBounds: [number, number];
  state: FilterState;
  setState: (s: FilterState) => void;
  onReset: () => void;
  className?: string;
}) {
  const { settings } = useStore();
  const [min, max] = priceBounds;
  const pct = max > min ? ((state.maxPrice - min) / (max - min)) * 100 : 100;

  const toggleBrand = (brand: string) => {
    setState({
      ...state,
      brands: state.brands.includes(brand) ? state.brands.filter((b) => b !== brand) : [...state.brands, brand],
    });
  };

  const dirty = state.brands.length > 0 || state.inStockOnly || state.onSaleOnly || state.maxPrice < max;

  return (
    <div className={cn("rounded-[26px] border border-hairline bg-surface-solid p-5", className)}>
      <div className="mb-5 flex h-7 items-center justify-between">
        <h3 className="text-[15px] font-semibold tracking-tight text-content">Refine</h3>
        {dirty && (
          <button
            onClick={onReset}
            type="button"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-brand-500 transition hover:bg-brand-500/10 dark:text-brand-300"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-baseline justify-between">
          <span className="label mb-0">Max price</span>
          <span className="tabular text-sm font-semibold text-content">{formatPrice(state.maxPrice, settings)}</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={Math.max(500, Math.round((max - min) / 100))}
          value={state.maxPrice}
          onChange={(e) => setState({ ...state, maxPrice: Number(e.target.value) })}
          className="wz-range w-full"
          style={{ ["--pct" as string]: `${pct}%` }}
          aria-label="Maximum price"
        />
        <div className="tabular mt-2 flex justify-between text-[11px] text-faint">
          <span>{formatPrice(min, settings)}</span>
          <span>{formatPrice(max, settings)}</span>
        </div>
      </div>

      {brands.length > 0 && (
        <div className="mb-6">
          <span className="label">Brand</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {brands.map((brand) => {
              const active = state.brands.includes(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  onClick={() => toggleBrand(brand)}
                  aria-pressed={active}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition active:scale-95",
                    active
                      ? "border-transparent bg-content text-page"
                      : "border-hairline text-content2 hover:border-hairline-strong hover:text-content",
                  )}
                >
                  {active && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  {brand}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col divide-y divide-[color:var(--hairline)] rounded-2xl border border-hairline">
        <label className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-content2">
          In stock only
          <Switch checked={state.inStockOnly} onChange={(v) => setState({ ...state, inStockOnly: v })} label="In stock only" />
        </label>
        <label className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-content2">
          On sale
          <Switch checked={state.onSaleOnly} onChange={(v) => setState({ ...state, onSaleOnly: v })} label="On sale" />
        </label>
      </div>
    </div>
  );
}
