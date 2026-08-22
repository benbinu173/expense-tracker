/**
 * Empty state.
 *
 * A blank panel reads as "broken"; a blank panel with a sentence and a next step
 * reads as "nothing here yet". Every list in the app gets one — transactions,
 * categories, and the dashboard breakdown all land here on a fresh account.
 */
type EmptyStateProps = {
  title: string;
  description: string;
  /** Usually the button that resolves the emptiness. */
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {/*
       * A tinted disc holding the ruled lines the list would have had. The tint is
       * what stops an empty screen reading as a failed load — but it stays
       * `--brand-soft`, not a money colour, because there's no money here to signal.
       *
       * The lines are `--accent`, not a faded `--brand`: that's the token for brand
       * that has to stay legible, and at 45% opacity the mark measured 2.0:1 on its
       * own disc and effectively disappeared. This is 5.2:1 light, 6.7:1 dark.
       *
       * No entrance on the wrapper — `stagger-children` in the app layout already
       * fades in the Card this sits inside, and a fade-rise nested in a fade-rise
       * reads as a stutter. The disc's `pop-in` is the accent on top of that.
       */}
      <div
        aria-hidden
        className="bg-brand-soft ring-accent/15 animate-pop-in grid size-14 place-items-center rounded-xl ring-1"
      >
        <div className="flex w-6 flex-col gap-1.5">
          <span className="bg-accent h-px w-full" />
          <span className="bg-accent h-px w-full" />
          <span className="bg-accent h-px w-2/3" />
        </div>
      </div>
      <p className="text-ink mt-1 text-sm font-medium">{title}</p>
      <p className="text-ink-2 max-w-xs text-sm">{description}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
