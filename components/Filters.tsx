"use client";

import { Check, RotateCcw, SlidersHorizontal, Tag } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn, formatPrice } from "@/lib/utils";

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

  const toggleBrand = (brand: string) => {
    setState({
      ...state,
      brands: state.brands.includes(brand)
        ? state.brands.filter((b) => b !== brand)
        : [...state.brands, brand],
    });
  };

  const dirty =
    state.brands.length > 0 ||
    state.inStockOnly ||
    state.onSaleOnly ||
    state.maxPrice < max;

  return (
    <div className={cn("rounded-2xl glass p-5", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold text-content">
          <SlidersHorizontal className="h-4 w-4 text-brand-400" />
          Filters
        </h3>
        {dirty && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted transition hover:text-content"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Price */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <span className="label mb-0">Max price</span>
          <span className="text-sm font-semibold text-content">
            {formatPrice(state.maxPrice, settings)}
          </span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={Math.max(1000, Math.round((max - min) / 100))}
          value={state.maxPrice}
          onChange={(e) => setState({ ...state, maxPrice: Number(e.target.value) })}
          className="w-full accent-brand-500"
          aria-label="Maximum price"
        />
        <div className="mt-1 flex justify-between text-[11px] text-faint">
          <span>{formatPrice(min, settings)}</span>
          <span>{formatPrice(max, settings)}</span>
        </div>
      </div>

      {/* Brands */}
      {brands.length > 0 && (
        <div className="mb-5">
          <span className="label inline-flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" /> Brand
          </span>
          <div className="mt-1 flex flex-col gap-1">
            {brands.map((brand) => {
              const active = state.brands.includes(brand);
              return (
                <button
                  key={brand}
                  onClick={() => toggleBrand(brand)}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition",
                    active
                      ? "bg-brand-500/15 text-content"
                      : "text-content2 hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-4 w-4 place-items-center rounded border transition",
                      active
                        ? "border-brand-400 bg-brand-500 text-white"
                        : "border-hairline",
                    )}
                  >
                    {active && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {brand}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Toggles */}
      <div className="flex flex-col gap-2">
        <ToggleRow
          label="In stock only"
          checked={state.inStockOnly}
          onChange={(v) => setState({ ...state, inStockOnly: v })}
        />
        <ToggleRow
          label="On sale"
          checked={state.onSaleOnly}
          onChange={(v) => setState({ ...state, onSaleOnly: v })}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm text-content2 transition hover:bg-surface-2"
      role="switch"
      aria-checked={checked}
    >
      {label}
      <span
        className={cn(
          "relative h-5 w-9 rounded-full transition",
          checked ? "bg-brand-500" : "bg-surface-hover",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
            checked ? "left-[18px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
