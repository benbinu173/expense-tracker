import { formatPaise, formatSignedPaise } from "@/lib/money";

/*
 * Three ways to put money on screen. They exist so that `tabular-nums` and the
 * explicit +/− sign can't be forgotten at a call site — never render an amount
 * with a bare `formatPaise()` in JSX.
 *
 * Sign, not colour, is the primary signal of direction (SPEC.md accessibility):
 * colour is a second, redundant channel for people who can see it.
 */

/** U+2212 MINUS SIGN. Intl gives us a hyphen; at figure sizes it looks stunted. */
function typographicMinus(formatted: string): string {
  return formatted.replace("-", "−");
}

type FigureProps = {
  paise: number;
  className?: string;
};

/**
 * A plain positive amount — no sign, no colour. For summary tiles where a
 * neighbouring label ("Income", "Spent") already carries the direction.
 */
export function Figure({ paise, className = "" }: FigureProps) {
  return <span className={`figure ${className}`}>{typographicMinus(formatPaise(paise))}</span>;
}

type AmountProps = {
  paise: number;
  direction: "income" | "expense";
  className?: string;
};

/**
 * A single transaction's amount: signed and coloured by direction. This is the
 * one to use in every list and table row.
 */
export function Amount({ paise, direction, className = "" }: AmountProps) {
  const tone = direction === "income" ? "text-income" : "text-expense";

  return (
    <span className={`figure ${tone} ${className}`}>{formatSignedPaise(paise, direction)}</span>
  );
}

type BalanceProps = {
  paise: number;
  /** `display` is the serif hero treatment — one per screen, at most. */
  variant?: "display" | "inline";
  /**
   * Where it's being rendered. On `hero` the figure inherits the panel's white
   * instead of picking its own colour — see below.
   */
  surface?: "page" | "hero";
  className?: string;
};

/**
 * A net figure, which may be negative.
 *
 * On the page, only the negative case is coloured. A healthy balance in bright
 * green reads as a congratulation; leaving it as ink means the red, when it shows
 * up, actually means something.
 *
 * On the hero panel nothing is coloured at all: `--expense` red over the violet
 * gradient measures well under AA, and the rule for that surface is that the stop
 * moves before the text does — except there's no stop to move for a figure that's
 * only sometimes red. So the hero leans on the channel that was always primary
 * anyway: `formatPaise` renders a negative with a leading `−`, and the sign is
 * what carries direction (SPEC.md accessibility).
 */
export function Balance({
  paise,
  variant = "display",
  surface = "page",
  className = "",
}: BalanceProps) {
  const tone = surface === "hero" ? "text-current" : paise < 0 ? "text-expense" : "text-ink";
  const face = variant === "display" ? "figure-display text-figure sm:text-hero" : "figure";

  return (
    <span className={`${face} ${tone} ${className}`}>{typographicMinus(formatPaise(paise))}</span>
  );
}
