import { Wordmark } from "@/components/wordmark";

/**
 * Shell for the unauthenticated pages. Centred and narrow, with no app chrome —
 * there is nothing to navigate to until you're signed in.
 *
 * This is the one screen with no data on it, so it's where the aurora backdrop
 * can be strongest: it's the first impression, and there's no ledger for it to
 * compete with. `isolate` is what keeps `-z-10` above `body`'s own background.
 *
 * The heading belongs to each page, not here, so "Sign in" and "Create your
 * account" each get a real `<h1>`.
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="relative isolate flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div aria-hidden className="surface-aurora pointer-events-none fixed inset-0 -z-10" />

      <div className="animate-fade-rise flex w-full max-w-sm flex-col gap-6">
        <div className="flex justify-center">
          <Wordmark asLink />
        </div>

        <div className="bg-raised/95 border-rule shadow-pop rounded-xl border p-6 backdrop-blur-sm">
          {children}
        </div>

        <p className="text-ink-3 text-center text-xs">
          Income and expenses in rupees. One account, one timezone.
        </p>
      </div>
    </div>
  );
}
