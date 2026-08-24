"use client";

import { buttonClass } from "@/components/button";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";

/**
 * Error boundary for every screen inside the app shell.
 *
 * It sits *below* `(app)/layout.tsx`, and that's what makes it the useful one: the
 * rail, the tab bar and the wordmark all survive, so a failed query costs you the
 * page you asked for and not the way out of it. That's also why there's no "go
 * home" button here — the navigation is still on screen.
 *
 * Per `error.md`, an `error.tsx` does not wrap the `layout.tsx` in its own segment.
 * So a failure in `(app)/layout.tsx` itself — its `getUser()` call, or `lib/env.ts`
 * throwing on a missing variable — bubbles past this one to `app/error.tsx`.
 *
 * `retry`, not `reset`. `retry()` re-fetches and re-renders the segment; `reset()`
 * only clears the error state and re-renders against the same data, which for a
 * failed Supabase round trip would simply fail again. `retry` became stable in
 * Next 16.3.0 — the version this project is on.
 *
 * No `useEffect` logging: there's no error-reporting service wired up, and a Server
 * Component error reaches the browser as a generic message anyway. The real stack
 * is in the server log, and `digest` is the handle that points at it.
 */
type AppErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
};

export default function AppError({ error, retry }: AppErrorProps) {
  return (
    <>
      <PageHeader
        title="Something went wrong"
        description="This screen couldn't be loaded. Nothing you've saved is affected."
      />

      <Card>
        <div className="flex flex-col gap-4">
          <p className="text-ink-2 text-sm">
            Usually this is a lost connection to the database. Trying again re-runs the queries for
            this page.
          </p>

          {/*
           * The digest is the only handle on what actually failed: a Server Component
           * error arrives in the browser as a generic message, and this hash is what
           * matches it to the server log. Mono, so it can be read out or copied.
           */}
          {error.digest && (
            <p className="text-ink-3 text-xs">
              Reference <span className="figure">{error.digest}</span>
            </p>
          )}

          <button
            type="button"
            onClick={() => retry()}
            className={buttonClass("primary", "md", "self-start")}
          >
            Try again
          </button>
        </div>
      </Card>
    </>
  );
}
