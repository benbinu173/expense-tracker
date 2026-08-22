import Link from "next/link";

/*
 * Buttons.
 *
 * `primary` is brand violet, which is exactly why `--brand` exists as its own
 * token: the money colours stay reserved, so a "Save" button can be coloured
 * without reading as income. `--brand-fg` is the only text colour allowed on it
 * (6.0:1 light, 4.8:1 dark) — don't substitute `text-white` and hope.
 *
 * Press feedback is a scale, not just a colour change: on a touch target it's the
 * signal that survives a finger covering the button.
 */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-brand-fg hover:bg-brand-strong hover:shadow-brand",
  secondary:
    "border-rule-strong bg-raised text-ink hover:border-accent/45 hover:bg-brand-soft border",
  ghost: "text-ink-2 hover:text-accent hover:bg-brand-soft",
  danger: "border-expense/40 text-expense hover:bg-expense/10 border",
  /*
   * For the gradient hero, where `primary`'s violet would sit on violet. The brand
   * pair read backwards — `--brand-fg` as the surface, `--brand-ink` as the text.
   *
   * `--brand-ink` rather than `--brand` because this surface is white in *both*
   * themes, so its foreground has to be fixed too: `--brand` lifts in dark mode to
   * stay legible against a dark page, which on white drops the hover blend to
   * 4.1:1. With `--brand-ink` it's 7.8:1 flat and 6.5:1 at worst on hover.
   */
  inverse: "bg-brand-fg text-brand-ink hover:bg-brand-fg/90 shadow-pop",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-9 gap-1.5 px-3 text-[13px]",
  md: "min-h-11 gap-2 px-4 text-sm",
};

/**
 * Shared button classes, exported so a non-button element (a `<label>` acting as
 * a file trigger, say) can borrow the look without faking a button's semantics.
 */
export function buttonClass(variant: Variant = "primary", size: Size = "md", extra = ""): string {
  return [
    "focus-ring inline-flex items-center justify-center rounded-md font-medium",
    "transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out-quart",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    extra,
  ].join(" ");
}

type SubmitButtonProps = {
  children: React.ReactNode;
  /** Label shown while the action is in flight. */
  pendingLabel?: string;
  pending?: boolean;
  variant?: Variant;
  size?: Size;
  className?: string;
};

/**
 * Submit button that reflects a Server Action's pending state.
 *
 * `pending` comes from `useActionState`, so the caller owns it — this stays
 * presentational and works in a Server Component too (the sign-out form has no
 * client state at all).
 */
export function SubmitButton({
  children,
  pendingLabel,
  pending = false,
  variant = "primary",
  size = "md",
  className = "",
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      className={buttonClass(variant, size, className)}
    >
      {pending ? (pendingLabel ?? children) : children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
};

/** A link that looks like a button. Still a link — it navigates, so it stays an `<a>`. */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}
