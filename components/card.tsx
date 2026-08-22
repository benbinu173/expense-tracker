/**
 * Surface primitives.
 *
 * `SectionLabel` is the small-caps rubric that gives the app its statement-like
 * feel — it labels a block without competing with the page title, so no screen
 * needs a second `<h1>`-sized thing.
 */
export function SectionLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`text-ink-3 text-[11px] font-medium tracking-[0.09em] uppercase ${className}`}>
      {children}
    </h2>
  );
}

type CardProps = {
  children: React.ReactNode;
  title?: string;
  /** Top-right slot, aligned with `title`. */
  action?: React.ReactNode;
  /**
   * Off for cards whose content is a divided list — rows should run to the card
   * edge and supply their own padding, or the hairlines stop short and look broken.
   */
  padded?: boolean;
  /**
   * `tint` washes the card in `--brand-soft` — for a block that should read as
   * part of the brand furniture rather than as data. Data stays on `raised`:
   * a tinted background under a list of amounts makes the amounts harder to read
   * for no gain.
   */
  tone?: "raised" | "tint";
  /**
   * Adds a hover lift. Only for a card that is *itself* a link or button —
   * a lift on a static panel promises an interaction that isn't there.
   */
  interactive?: boolean;
  className?: string;
};

const TONES = {
  raised: "bg-raised border-rule",
  tint: "bg-brand-soft border-accent/15",
} as const;

export function Card({
  children,
  title,
  action,
  padded = true,
  tone = "raised",
  interactive = false,
  className = "",
}: CardProps) {
  return (
    <section
      className={`${TONES[tone]} shadow-card rounded-lg border ${padded ? "p-4 sm:p-5" : ""} ${
        interactive ? "lift" : ""
      } ${className}`}
    >
      {(title || action) && (
        <div
          className={`flex items-center justify-between gap-4 ${padded ? "mb-4" : "border-rule border-b px-4 py-3 sm:px-5"}`}
        >
          {title && <SectionLabel>{title}</SectionLabel>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
