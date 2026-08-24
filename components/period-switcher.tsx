import Link from "next/link";

import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import {
  canGoNext,
  formatPeriodLabel,
  PERIOD_MODES,
  periodHref,
  shiftPeriod,
  type PeriodMode,
} from "@/lib/period";

/**
 * Week / month / year selector with prev-next navigation.
 *
 * A Server Component with no client state at all: period lives in the URL, so
 * every control here is a plain `<Link>`. The only exception is a spent "next",
 * which is a genuinely disabled control rather than a link to nowhere.
 */
type PeriodSwitcherProps = {
  mode: PeriodMode;
  /** Already normalised to the first day of the period by `resolvePeriod`. */
  anchor: string;
  /** From `todayInAppZone()` — passed in so the page owns the one clock read. */
  today: string;
  /** The route the links point back at, e.g. `/` or `/transactions`. */
  basePath: string;
};

const MODE_LABELS: Record<PeriodMode, string> = {
  week: "Week",
  month: "Month",
  year: "Year",
};

/**
 * Shared by the two arrows and the disabled stand-in, so all three are one size.
 * 36px for a mouse, 44px for a finger — see the note on `SIZES` in
 * `components/button.tsx`. At 375px the arrows and the label still fit one row
 * (44 + 168 + 44 plus gaps), so growing them costs no layout.
 */
const STEP = "grid size-9 pointer-coarse:size-11 place-items-center rounded-md";

export function PeriodSwitcher({ mode, anchor, today, basePath }: PeriodSwitcherProps) {
  const href = (nextMode: PeriodMode, nextAnchor: string) =>
    periodHref(basePath, nextMode, nextAnchor);

  const forwardAllowed = canGoNext(mode, anchor, today);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {/* Segmented control. `aria-current` marks the active mode for screen readers. */}
      <div
        role="group"
        aria-label="Period length"
        className="bg-sunken border-rule flex rounded-md border p-0.5"
      >
        {PERIOD_MODES.map((candidate) => {
          const active = candidate === mode;

          return (
            <Link
              key={candidate}
              href={href(candidate, anchor)}
              aria-current={active ? "true" : undefined}
              // `flex items-center` rather than relying on `py-1`: the box is taller
              // than its text on touch, and a padding-centred label would sit high in
              // it — with the active underline, which is anchored to the bottom edge,
              // stranded below. Centring makes the extra height split evenly.
              className={`focus-ring ease-out-quart relative flex min-h-8 items-center justify-center rounded-sm px-3 py-1 text-[13px] transition-colors duration-150 pointer-coarse:min-h-11 ${
                active
                  ? "bg-raised text-accent shadow-card font-medium"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {/* Raised card + brand text + this bar: three signals, so the active
               * segment survives being unable to tell violet from grey. */}
              {active && (
                <span
                  aria-hidden
                  className="surface-spine animate-fade-in absolute inset-x-2.5 bottom-0.5 h-0.5 rounded-full"
                />
              )}
              {MODE_LABELS[candidate]}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-1">
        <Link
          href={href(mode, shiftPeriod(mode, anchor, -1))}
          aria-label={`Previous ${mode}`}
          className={`focus-ring text-ink-2 hover:text-accent hover:bg-brand-soft ease-out-quart ${STEP} transition-colors duration-150 active:scale-95`}
        >
          <IconChevronLeft />
        </Link>

        {/* Fixed width stops the arrows shuffling as the label's length changes. */}
        <span aria-live="polite" className="min-w-42 text-center text-sm font-medium tabular-nums">
          {formatPeriodLabel(mode, anchor)}
        </span>

        {forwardAllowed ? (
          <Link
            href={href(mode, shiftPeriod(mode, anchor, 1))}
            aria-label={`Next ${mode}`}
            className={`focus-ring text-ink-2 hover:text-accent hover:bg-brand-soft ease-out-quart ${STEP} transition-colors duration-150 active:scale-95`}
          >
            <IconChevronRight />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            aria-label={`Next ${mode}`}
            title="This is the current period"
            className={`text-ink-3 ${STEP} cursor-not-allowed opacity-50`}
          >
            <IconChevronRight />
          </button>
        )}
      </div>
    </div>
  );
}
