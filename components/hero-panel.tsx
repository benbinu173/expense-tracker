/**
 * The gradient panel — the one saturated surface in the app, holding the one
 * figure that matters on a screen.
 *
 * Rules it enforces so call sites can't get them wrong:
 *
 * - **All text on it is full white.** Hierarchy comes from size and tracking, not
 *   opacity: a `white/70` label measures 3.5:1 against the teal end of
 *   `--gradient-hero` and fails AA. See the token's comment in globals.css.
 * - **One per screen.** Two gradient panels and neither one is the headline.
 *
 * Motion is two one-shot passes on arrival — the gradient settling (`drift`) and a
 * single light sweep (`sheen`). Neither loops; a panel that keeps moving competes
 * with the number it exists to present.
 *
 * Both live on inner layers rather than on the `<section>`, and that's deliberate.
 * The section is a direct child of `main`, which carries `stagger-children` — and
 * `.stagger-children > *` sets the `animation` shorthand at the same specificity as
 * `.animate-drift`, so whichever Tailwind happens to emit last wins. Putting the
 * gradient on its own layer means the panel gets the page's fade-up entrance like
 * every other block, the gradient settles independently, and neither depends on
 * rule order.
 */
type HeroPanelProps = {
  /** Small-caps rubric above the figure — the period, usually. */
  label: string;
  children: React.ReactNode;
  className?: string;
};

export function HeroPanel({ label, children, className = "" }: HeroPanelProps) {
  return (
    <section
      className={`text-brand-fg shadow-pop relative isolate overflow-hidden rounded-xl px-5 py-6 sm:px-7 sm:py-7 ${className}`}
    >
      {/* The gradient itself. `isolate` above is what keeps `-z-10` behind the
       * content but still in front of the page background. */}
      <span aria-hidden className="surface-hero animate-drift absolute inset-0 -z-10" />

      {/* The sweep. `-left-1/3` parks it off-panel until the keyframe moves it. */}
      <span
        aria-hidden
        className="animate-sheen pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent"
      />

      {/* No colour class: `text-brand-fg` on the section is the one white that's
       * been contrast-checked against all three gradient stops, and everything
       * here inherits it. Restating it would be a second source of truth. */}
      <p className="text-[11px] font-medium tracking-widest uppercase">{label}</p>

      <div className="mt-2.5">{children}</div>
    </section>
  );
}
