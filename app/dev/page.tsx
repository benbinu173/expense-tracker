import Link from "next/link";
import { notFound } from "next/navigation";

import { CategoryBreakdown } from "@/app/(app)/category-breakdown";
import { Card } from "@/components/card";
import { formatPaise, formatSignedPaise, paiseToInputValue } from "@/lib/money";
import {
  APP_TIME_ZONE,
  canGoNext,
  formatPeriodLabel,
  PERIOD_MODES,
  resolvePeriod,
  shiftPeriod,
  todayInAppZone,
} from "@/lib/period";

import { AmountProbe } from "./amount-probe";

export const metadata = { title: "Dev — utils" };

/** `?period=` and `?anchor=` arrive as `string | string[] | undefined`. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const FORMAT_SAMPLES = [1, 29, 500, 123450, 1234567890];

/**
 * Step 12's chart, against fixed inputs. Three cases that are awkward to reach
 * with real data: a spread wide enough that the smallest bar rounds toward zero,
 * a set where naive per-row rounding would print 99%, and nothing at all.
 */
const BREAKDOWN_SAMPLES = [
  {
    label: "Wide spread — smallest row rounds to 0%",
    view: "expense" as const,
    rows: [
      { category_id: "s1", category_name: "Rent", total_paise: 3_500_000 },
      { category_id: "s2", category_name: "Groceries", total_paise: 812_450 },
      { category_id: "s3", category_name: "Transport", total_paise: 246_000 },
      { category_id: "s4", category_name: "Entertainment", total_paise: 99_900 },
      {
        category_id: "s5",
        category_name: "A very long category name that has to truncate",
        total_paise: 41_500,
      },
      { category_id: "s6", category_name: "Health", total_paise: 700 },
    ],
  },
  {
    label: "Three equal thirds — must still total 100%",
    view: "income" as const,
    rows: [
      { category_id: "t1", category_name: "Salary", total_paise: 1_000_000 },
      { category_id: "t2", category_name: "Freelance", total_paise: 1_000_000 },
      { category_id: "t3", category_name: "Interest", total_paise: 1_000_000 },
    ],
  },
  { label: "Empty", view: "expense" as const, rows: [] },
];

/**
 * Scratch page for eyeballing `lib/money.ts` and `lib/period.ts` in a browser.
 *
 * Not part of the product — it 404s outside development, and it goes away in
 * the step 14 polish pass. The period controls here are a deliberate dry run of
 * the URL contract the real selector uses in step 9.
 */
export default async function DevPage({ searchParams }: PageProps<"/dev">) {
  if (process.env.NODE_ENV === "production") notFound();

  const params = await searchParams;
  const today = todayInAppZone();
  const period = resolvePeriod(
    { period: first(params.period), anchor: first(params.anchor) },
    today,
  );

  const previous = shiftPeriod(period.mode, period.anchor, -1);
  const next = shiftPeriod(period.mode, period.anchor, 1);
  const nextAllowed = canGoNext(period.mode, period.anchor, today);

  const href = (anchor: string, mode = period.mode) => `/dev?period=${mode}&anchor=${anchor}`;

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Utils sandbox</h1>
        <p className="text-ink-3 text-sm">
          Development only. Delete at step 14.{" "}
          <Link href="/" className="underline">
            Home
          </Link>
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Periods</h2>

        <nav className="flex gap-1.5" aria-label="Period mode">
          {PERIOD_MODES.map((mode) => (
            <Link
              key={mode}
              href={href(period.anchor, mode)}
              aria-current={mode === period.mode ? "page" : undefined}
              className={
                mode === period.mode
                  ? "bg-ink text-paper rounded-md px-3 py-1.5 text-sm font-medium"
                  : "border-rule hover:bg-sunken rounded-md border px-3 py-1.5 text-sm"
              }
            >
              {mode}
            </Link>
          ))}
        </nav>

        <div className="border-rule flex items-center justify-between gap-3 rounded-lg border px-2 py-2">
          <Link
            href={href(previous)}
            aria-label="Previous period"
            className="hover:bg-sunken rounded-md px-3 py-1.5 text-sm"
          >
            ←
          </Link>
          <span className="font-medium">{formatPeriodLabel(period.mode, period.anchor)}</span>
          {nextAllowed ? (
            <Link
              href={href(next)}
              aria-label="Next period"
              className="hover:bg-sunken rounded-md px-3 py-1.5 text-sm"
            >
              →
            </Link>
          ) : (
            <span
              aria-disabled="true"
              title="The next period has not started yet"
              className="text-ink-3 cursor-not-allowed px-3 py-1.5 text-sm"
            >
              →
            </span>
          )}
        </div>

        <dl className="border-rule bg-sunken divide-rule divide-y rounded-lg border text-sm">
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <dt className="text-ink-3">Today ({APP_TIME_ZONE})</dt>
            <dd className="font-mono">{today}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <dt className="text-ink-3">Anchor (normalised)</dt>
            <dd className="font-mono">{period.anchor}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <dt className="text-ink-3">Range queried</dt>
            <dd className="font-mono">
              {period.range.start} → {period.range.end}
            </dd>
          </div>
        </dl>

        <p className="text-ink-3 text-sm">
          Edit the URL directly to test the fallbacks —{" "}
          <Link href="/dev?period=decade&anchor=nonsense" className="underline">
            ?period=decade&amp;anchor=nonsense
          </Link>{" "}
          should land on the current month rather than error.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Amount parsing</h2>
        <AmountProbe />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Formatting</h2>
        <table className="w-full text-sm">
          <thead className="text-ink-3 text-left">
            <tr className="border-rule border-b">
              <th scope="col" className="py-1.5 font-normal">
                paise
              </th>
              <th scope="col" className="py-1.5 font-normal">
                formatted
              </th>
              <th scope="col" className="py-1.5 font-normal">
                input value
              </th>
            </tr>
          </thead>
          <tbody className="divide-rule divide-y">
            {FORMAT_SAMPLES.map((value) => (
              <tr key={value}>
                <td className="py-1.5 font-mono">{value}</td>
                <td className="py-1.5">{formatPaise(value)}</td>
                <td className="text-ink-3 py-1.5 font-mono">{paiseToInputValue(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="border-rule divide-rule divide-y rounded-lg border text-sm">
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <span className="text-ink-3">Income row</span>
            <span className="text-income font-medium">{formatSignedPaise(120000, "income")}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <span className="text-ink-3">Expense row</span>
            <span className="text-expense font-medium">{formatSignedPaise(45000, "expense")}</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <span className="text-ink-3">Negative balance</span>
            <span className="text-expense font-medium">{formatPaise(120000 - 450000)}</span>
          </div>
        </div>
      </section>
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Category breakdown (step 12)</h2>
        <p className="text-ink-3 text-sm">
          The dashboard chart needs a signed-in session to show real rows, so this renders it
          against fixed figures — enough to check the bar geometry, the 100% column, and both empty
          states. Goes away with the rest of this page at step 14.
        </p>

        {BREAKDOWN_SAMPLES.map((sample) => (
          <Card key={sample.label} padded={false} title={sample.label}>
            <CategoryBreakdown rows={sample.rows} view={sample.view} />
          </Card>
        ))}
      </section>
    </main>
  );
}
