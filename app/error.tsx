"use client";

import { buttonClass, ButtonLink } from "@/components/button";
import { Wordmark } from "@/components/wordmark";

/**
 * The outermost error boundary that still gets the app's own styling.
 *
 * `(app)/error.tsx` covers the pages, but an `error.tsx` never wraps the
 * `layout.tsx` in its own segment — so a throw inside `(app)/layout.tsx` lands
 * here instead. That is the realistic production failure: the layout is the first
 * thing to call `createClient()`, so it's where `lib/env.ts` raises if a variable
 * is missing from the deploy, and where a dead Supabase connection surfaces first.
 *
 * No app shell, because the shell is exactly what failed to render. The frame is
 * the auth layout's instead — centred, narrow, wordmark on top. Deliberately
 * duplicated rather than extracted: this file has to keep working when the thing
 * it shares code with is the thing that's broken.
 *
 * There's no `global-error.tsx` above this. It would only add value for a throw in
 * `app/layout.tsx`, which loads fonts and sets metadata and touches no data at all.
 *
 * The message says nothing about *why*. A missing environment variable is a real
 * cause here, and naming it would tell a stranger about our deploy.
 */
type AppErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function RootError({ error, retry }: AppErrorProps) {
  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div aria-hidden className="surface-aurora pointer-events-none fixed inset-0 -z-10" />

      <div className="animate-fade-rise flex w-full max-w-sm flex-col gap-6">
        <div className="flex justify-center">
          <Wordmark />
        </div>

        <div className="bg-raised/95 border-rule shadow-pop flex flex-col gap-4 rounded-xl border p-6 backdrop-blur-sm">
          <div className="flex flex-col gap-1.5">
            <h1 className="font-display text-2xl leading-tight tracking-tight">
              The app couldn&rsquo;t start
            </h1>
            <p className="text-ink-2 text-sm">
              Something failed before any of your screens could load. Your data is untouched.
            </p>
          </div>

          {error.digest && (
            <p className="text-ink-3 text-xs">
              Reference <span className="figure">{error.digest}</span>
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={() => retry()} className={buttonClass()}>
              Try again
            </button>
            <ButtonLink href="/" variant="secondary">
              Go to dashboard
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
