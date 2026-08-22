/**
 * Category colour assignment.
 *
 * Categories are user-created, so there's no fixed list to hand-colour and no
 * colour column in the schema. Instead the hue is derived from the name, which
 * means a category looks the same on the list, on the dashboard, and in the
 * breakdown chart without anything being stored or passed around.
 *
 * The trade-off, stated plainly: two categories can collide on the same hue.
 * That's fine — the dot is identity, not information. The name is always beside
 * it, and nothing in the app asks you to tell two categories apart by colour
 * alone. What the hue must never do is imply a *direction*; the eight values in
 * `--cat-*` deliberately avoid the red and green bands so it can't.
 */

/** Kept in sync with `--cat-1…8` in `app/globals.css`. */
export const CATEGORY_COLOR_COUNT = 8;

/**
 * Written out rather than built with a template string: Tailwind scans source
 * for literal class names, and `bg-cat-${i}` is invisible to it.
 */
const FILL_CLASSES = [
  "bg-cat-1",
  "bg-cat-2",
  "bg-cat-3",
  "bg-cat-4",
  "bg-cat-5",
  "bg-cat-6",
  "bg-cat-7",
  "bg-cat-8",
] as const;

/**
 * FNV-1a, 32-bit. Small, dependency-free, and well spread over the short strings
 * category names actually are.
 *
 * `Math.imul` is what keeps the multiply in 32-bit integer space — a plain `*`
 * overflows into a float and the low bits stop being meaningful.
 */
function hash(value: string): number {
  let result = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }

  return result >>> 0;
}

/**
 * Stable index into the `--cat-*` palette, 0-based.
 *
 * Trimmed and lower-cased first, so "Food" and "food " don't get different
 * colours after a rename that only changed the casing.
 *
 * The `>>> 16` fold matters: `CATEGORY_COLOR_COUNT` is a power of two, so the
 * modulo keeps only the low three bits. Mixing the high half down first is what
 * stops names that differ late in the string from clustering.
 */
export function categoryColorIndex(name: string): number {
  const digest = hash(name.trim().toLowerCase());

  return ((digest ^ (digest >>> 16)) >>> 0) % CATEGORY_COLOR_COUNT;
}

/**
 * The Tailwind background class for a category's colour.
 *
 * Named for the fill rather than the dot because two things use it: the dot in
 * `components/category-dot.tsx`, and the bar in the dashboard breakdown. Both
 * want the same hue for the same category, which is the whole point of deriving
 * it from the name.
 */
export function categoryFillClass(name: string): string {
  return FILL_CLASSES[categoryColorIndex(name)] ?? FILL_CLASSES[0];
}
