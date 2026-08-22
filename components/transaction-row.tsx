import Link from "next/link";

import { CategoryDot } from "@/components/category-dot";
import { Amount } from "@/components/money";
import { formatDayMonth } from "@/lib/period";
import type { TransactionType } from "@/lib/validation/transactions";

/**
 * One line of the ledger.
 *
 * Shared rather than colocated because the dashboard shows the five most recent
 * transactions and they must look identical to the list's — same date column
 * width, same truncation, same signed amount.
 *
 * Props are plain values, not a database row, so the caller is free to fetch the
 * category name however it likes.
 */
export type TransactionRowData = {
  id: string;
  type: TransactionType;
  amountPaise: number;
  /** `'YYYY-MM-DD'`. */
  occurredOn: string;
  categoryName: string;
  note: string | null;
};

type TransactionRowProps = Omit<TransactionRowData, "id"> & {
  /**
   * Makes the whole row the edit affordance. Left off, the row is inert — which
   * is what the delete confirmation and the dashboard's recent list want.
   *
   * A row is a poor place for a cluster of small buttons: at 375px the date,
   * category, note and amount already fill it, and two icon targets either crowd
   * the amount or wrap. One large target that opens a screen with room for both
   * actions is easier to hit and easier to read.
   */
  href?: string;
};

const LAYOUT = "flex items-baseline gap-3 px-4 py-3 sm:gap-4 sm:px-5";

export function TransactionRow({
  type,
  amountPaise,
  occurredOn,
  categoryName,
  note,
  href,
}: TransactionRowProps) {
  const body = (
    <>
      {/* Fixed-width mono date column — this is what makes the list scan as a ledger. */}
      <time
        dateTime={occurredOn}
        className="figure text-ink-3 w-14 shrink-0 text-[13px] tracking-tight"
      >
        {formatDayMonth(occurredOn)}
      </time>

      <div className="flex min-w-0 flex-1 items-baseline gap-2">
        <CategoryDot name={categoryName} className="translate-y-[-1px]" />
        <div className="min-w-0 flex-1">
          <p className="text-ink truncate text-sm font-medium">{categoryName}</p>
          {note && <p className="text-ink-2 mt-0.5 truncate text-[13px]">{note}</p>}
        </div>
      </div>

      <Amount paise={amountPaise} direction={type} className="shrink-0 text-sm" />
    </>
  );

  if (href === undefined) {
    return <div className={LAYOUT}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={`${LAYOUT} focus-ring-inset ease-out-quart hover:bg-brand-soft w-full transition-colors duration-150`}
    >
      {/* The link's text is the row itself; this says where it goes. */}
      <span className="sr-only">Edit:</span>
      {body}
    </Link>
  );
}
