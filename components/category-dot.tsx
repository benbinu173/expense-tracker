import { categoryFillClass } from "@/lib/category-color";

/**
 * A category's colour, as a dot.
 *
 * Decorative, so `aria-hidden` — the category name is always right beside it, and
 * the colour is identity rather than information (see `lib/category-color.ts`).
 *
 * The ring is not decoration: `--cat-5` clears 3:1 against paper by a hair, and a
 * hairline of the surrounding surface keeps the dot legible where it sits on
 * `sunken` or inside a hovered row.
 */
export function CategoryDot({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`${categoryFillClass(name)} ring-raised size-2 shrink-0 rounded-full ring-1 ${className}`}
    />
  );
}
