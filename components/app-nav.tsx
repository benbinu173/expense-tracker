"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconAccount, IconCategories, IconDashboard, IconTransactions } from "@/components/icons";

/**
 * Navigation, defined once and rendered twice: a rail on desktop, a tab bar on
 * mobile. Client-side only because active state needs `usePathname` — the links
 * themselves are plain `<Link>`s, so this stays cheap.
 *
 * Active state is carried three ways on purpose — `aria-current`, the brand tint,
 * and a shape change (the rail's bar, the tab bar's indicator). Colour alone
 * would leave the state invisible to anyone who can't distinguish the tint.
 */
const NAV_ITEMS = [
  { href: "/", label: "Dashboard", Icon: IconDashboard },
  { href: "/transactions", label: "Transactions", Icon: IconTransactions },
  { href: "/categories", label: "Categories", Icon: IconCategories },
  { href: "/account", label: "Account", Icon: IconAccount },
] as const;

/**
 * `/` has to match exactly or it lights up on every page. Everything else
 * matches by prefix so `/transactions/abc/edit` keeps Transactions active.
 */
function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            // The rail only renders from `md` up, but "wide" isn't "mouse" — a tablet
            // in landscape gets the rail and taps it, so the row grows to 44px on a
            // coarse pointer. Below `md` this component isn't rendered at all and
            // `TabBarNav`'s 56px rows are the touch target.
            className={`focus-ring ease-out-quart relative flex min-h-10 items-center gap-2.5 rounded-md px-2.5 text-sm transition-[background-color,color] duration-150 pointer-coarse:min-h-11 ${
              active
                ? "bg-brand-soft text-accent font-medium"
                : "text-ink-2 hover:text-ink hover:bg-sunken"
            }`}
          >
            {/* The bar, so active state isn't carried by tint alone. */}
            {active && (
              <span
                aria-hidden
                className="bg-brand animate-fade-in absolute top-1/2 left-0 h-5 w-0.5 -translate-y-1/2 rounded-r-full"
              />
            )}
            <Icon className={`size-5 shrink-0 ${active ? "text-accent" : ""}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function TabBarNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="border-rule bg-raised/90 fixed inset-x-0 bottom-0 z-20 border-t backdrop-blur-md md:hidden"
    >
      {/* The inset padding keeps the tabs above the iOS home indicator. */}
      <ul
        className="mx-auto grid max-w-md grid-cols-4"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`focus-ring-inset ease-out-quart relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-150 ${
                  active ? "text-accent font-medium" : "text-ink-3"
                }`}
              >
                {active && (
                  <span
                    aria-hidden
                    className="bg-brand animate-fade-in absolute top-0 h-0.5 w-8 rounded-b-full"
                  />
                )}
                {/* The lift is the tell on a phone, where the tint is a few pixels. */}
                <Icon
                  className={`ease-out-quart size-5 shrink-0 transition-transform duration-200 ${
                    active ? "-translate-y-px scale-110" : ""
                  }`}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
