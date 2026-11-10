"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, m } from "framer-motion";
import { Plus, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Icon, iconChoices } from "@/components/Icon";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toaster";
import { useConfirm } from "@/components/ui/Confirm";

export function CategoriesPanel() {
  const { categories, products, addCategory, updateCategory, deleteCategory } = useStore();
  const toast = useToast();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Tag");
  const [adding, setAdding] = useState(false);

  const count = (id: string) => products.filter((p) => p.categoryId === id).length;

  const add = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast({ tone: "error", title: "That category already exists", description: trimmed });
      return;
    }
    setAdding(true);
    try {
      await addCategory(trimmed, icon);
      toast({ title: "Category added", description: trimmed });
      setName("");
      setIcon("Tag");
    } catch (err) {
      toast({ tone: "error", title: "Couldn't add category", description: err instanceof Error ? err.message : undefined });
    } finally {
      setAdding(false);
    }
  };

  const remove = async (id: string, label: string) => {
    const n = count(id);
    const ok = await confirm({
      title: `Delete “${label}”?`,
      message: n > 0 ? `${n} product${n === 1 ? "" : "s"} will become uncategorised until you move them.` : "No products use it.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await deleteCategory(id);
      toast({ title: "Category deleted", description: label });
    } catch (err) {
      toast({ tone: "error", title: "Couldn't delete", description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <form onSubmit={add} className="rounded-[24px] border border-hairline bg-surface-solid p-5 lg:sticky lg:top-10 lg:self-start">
        <h3 className="text-[15px] font-semibold text-content">New category</h3>
        <label className="label mt-5" htmlFor="cat-name">
          Name
        </label>
        <input id="cat-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Smart Home" maxLength={60} />
        <span className="label mt-5">Icon</span>
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Category icon">
          {iconChoices.map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={icon === n}
              onClick={() => setIcon(n)}
              className={cn(
                "grid aspect-square place-items-center rounded-xl border transition-all duration-200 active:scale-90",
                icon === n ? "border-brand-500 bg-brand-500/12 text-brand-500 dark:text-brand-300" : "border-hairline text-content2 hover:bg-surface-hover",
              )}
              aria-label={n}
            >
              <Icon name={n} className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
        <Button type="submit" loading={adding} loadingText="Adding…" icon={<Plus className="h-4 w-4" />} className="mt-5 w-full" disabled={!name.trim()}>
          Add category
        </Button>
      </form>

      <div className="overflow-hidden rounded-[24px] border border-hairline bg-surface-solid">
        {categories.length === 0 && <p className="px-4 py-14 text-center text-sm text-muted">No categories yet — add your first one.</p>}
        <ul className="divide-y divide-[color:var(--hairline)]">
          <AnimatePresence initial={false}>
            {categories.map((c) => (
              <m.li
                key={c.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.2 } }}
                className="flex items-center gap-3 px-4 py-3"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface-2 text-content">
                  <Icon name={c.icon} className="h-5 w-5" strokeWidth={1.6} />
                </span>
                <CategoryNameInput
                  value={c.name}
                  onCommit={async (next) => {
                    try {
                      await updateCategory(c.id, { name: next });
                      toast({ title: "Category renamed", description: next });
                    } catch (err) {
                      toast({ tone: "error", title: "Couldn't rename", description: err instanceof Error ? err.message : undefined });
                    }
                  }}
                />
                <span className="tabular shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-[12px] font-semibold text-faint">{count(c.id)} items</span>
                <button
                  type="button"
                  onClick={() => remove(c.id, c.name)}
                  className="icon-btn !h-10 !w-10 shrink-0 hover:!border-rose-500/30 hover:!bg-rose-500/10 hover:!text-rose-500"
                  aria-label={`Delete ${c.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </m.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  );
}

function CategoryNameInput({ value, onCommit }: { value: string; onCommit: (next: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onCommit(trimmed);
    else setDraft(value);
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(value);
          (e.target as HTMLInputElement).blur();
        }
      }}
      maxLength={60}
      aria-label="Category name"
      className="min-w-0 flex-1 rounded-xl border border-transparent bg-transparent px-2.5 py-2 text-[15px] font-semibold text-content transition hover:border-hairline focus:border-brand-400/60 focus:bg-surface-2 focus:outline-none"
    />
  );
}
