"use client";

import { useState } from "react";

import { formatPaise, parseAmountToPaise } from "@/lib/money";

/** Inputs worth trying — the last four are all supposed to be rejected. */
const SAMPLES = ["0.29", "1,234.50", "₹ 1,23,456", "8.29", "1.234", "-5", "0", "abc"];

/**
 * Type an amount, see exactly what `parseAmountToPaise` does with it. Scratch
 * UI for step 5; the real amount field arrives with the form in step 6.
 */
export function AmountProbe() {
  const [raw, setRaw] = useState("0.29");
  const result = parseAmountToPaise(raw);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="text-ink-3">Amount as typed</span>
        <input
          value={raw}
          onChange={(event) => setRaw(event.target.value)}
          className="border-rule focus:ring-accent rounded-md border px-3 py-2 font-mono text-base focus:ring-2 focus:outline-none"
          placeholder="1234.50"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {result.ok ? (
        <dl className="border-rule divide-rule divide-y rounded-md border text-sm">
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <dt className="text-ink-3">Stored as</dt>
            <dd className="font-mono">{result.paise} paise</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <dt className="text-ink-3">Rendered as</dt>
            <dd className="font-medium">{formatPaise(result.paise)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4 px-3 py-2">
            <dt className="text-ink-3">Float trap would give</dt>
            <dd className="text-ink-3 font-mono">
              {Number(raw.replace(/[₹,\s]/g, "")) * 100 || 0}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-expense border-expense/30 bg-expense/5 rounded-md border px-3 py-2 text-sm">
          Rejected: {result.error}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {SAMPLES.map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => setRaw(sample)}
            className="border-rule hover:bg-sunken focus:ring-accent rounded-md border px-2.5 py-1 font-mono text-xs focus:ring-2 focus:outline-none"
          >
            {sample}
          </button>
        ))}
      </div>
    </div>
  );
}
