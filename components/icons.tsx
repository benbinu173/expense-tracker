/**
 * Hand-rolled icon set.
 *
 * Deliberately not a dependency: we need six glyphs, and CLAUDE.md says don't add
 * a package without asking. All of them are 20×20, stroke-only, and inherit
 * `currentColor`, so they pick up text colour and dark mode for free.
 *
 * Every icon here is decorative — each one sits beside a text label, so they're
 * `aria-hidden`. An icon-only control must carry its own `aria-label`.
 */
type IconProps = {
  className?: string;
};

function Icon({ children, className }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className ?? "size-5 shrink-0"}
    >
      {children}
    </svg>
  );
}

/** Ascending bars — the category breakdown. */
export function IconDashboard(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 16.5V11" strokeWidth={2} />
      <path d="M10 16.5V4.5" strokeWidth={2} />
      <path d="M16 16.5V8" strokeWidth={2} />
    </Icon>
  );
}

/** Opposing arrows — money in, money out. */
export function IconTransactions(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 7.25h11m0 0-3-3m3 3-3 3" />
      <path d="M17 13.75H6m0 0 3-3m-3 3 3 3" />
    </Icon>
  );
}

/** A luggage tag. */
export function IconCategories(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 9.4V4.9a.9.9 0 0 1 .9-.9h4.5a1 1 0 0 1 .7.3l5.7 5.7a1 1 0 0 1 0 1.4l-4.2 4.2a1 1 0 0 1-1.4 0L4.3 10a1 1 0 0 1-.3-.6Z" />
      <path d="M7.2 7.2h.01" strokeWidth={2.2} />
    </Icon>
  );
}

export function IconAccount(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="7.2" r="3.1" />
      <path d="M4.4 16.6a5.9 5.9 0 0 1 11.2 0" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4.6v10.8M4.6 10h10.8" strokeWidth={1.9} />
    </Icon>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12.25 4.75 7 10l5.25 5.25" strokeWidth={1.8} />
    </Icon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.75 4.75 13 10l-5.25 5.25" strokeWidth={1.8} />
    </Icon>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4.75 7.75 10 13l5.25-5.25" strokeWidth={1.8} />
    </Icon>
  );
}
