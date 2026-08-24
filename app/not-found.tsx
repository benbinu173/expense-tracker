import { ButtonLink } from "@/components/button";
import { Wordmark } from "@/components/wordmark";

/**
 * The app-wide 404 — every URL that matches no route at all.
 *
 * That's a different path from `(app)/not-found.tsx`: this one is reached by the
 * router before any segment renders, so it has no route group and therefore no
 * shell. A `notFound()` thrown *inside* a page never gets here, because the group's
 * own boundary is nearer.
 *
 * Which means this page is also what a signed-out stranger sees when they guess at
 * a URL. So the wording claims nothing about an account, and "Go to dashboard" is
 * honest either way — `(app)/layout.tsx` sends them to `/login` if there's no
 * session.
 *
 * A Server Component, and it takes no props: `not-found.tsx` is never told what was
 * asked for. The frame is the auth layout's, duplicated on purpose — a shared
 * wrapper for two pages that mostly differ would cost more than the six lines it
 * saves.
 *
 * Not `global-not-found.tsx`: that one replaces the root layout too, and it's still
 * behind `experimental.globalNotFound`.
 */
export default function RootNotFound() {
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
              <span className="figure-display text-ink-3 mr-2">404</span>
              Page not found
            </h1>
            <p className="text-ink-2 text-sm">
              There&rsquo;s nothing at this address. Check the link, or start from the dashboard.
            </p>
          </div>

          <ButtonLink href="/" className="self-start">
            Go to dashboard
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
