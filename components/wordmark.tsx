import Link from "next/link";

/**
 * The mark: a rupee in a gradient badge, name set in the display serif.
 *
 * The badge is the app's one small use of `--gradient-hero` outside the hero
 * panel — at 24px it reads as an identity mark rather than as a second headline,
 * which is the line the "one gradient surface per screen" rule is drawing.
 *
 * `asLink` is off in the sidebar (Dashboard is already a nav item, so a second
 * link to `/` is a redundant tab stop) and on in the auth shell, where there is
 * no nav.
 */
export function Wordmark({ asLink = false }: { asLink?: boolean }) {
  const content = (
    <>
      <span
        aria-hidden
        className="surface-hero figure-display shadow-brand grid size-6 place-items-center rounded-md text-[15px] leading-none"
      >
        ₹
      </span>
      <span className="font-display text-[17px] tracking-tight">Finance Tracker</span>
    </>
  );

  if (asLink) {
    return (
      <Link href="/" className="focus-ring flex items-center gap-2 rounded-sm">
        {content}
      </Link>
    );
  }

  return <span className="flex items-center gap-2">{content}</span>;
}
