/**
 * Page title block. Every screen under `(app)` opens with one, so the type scale
 * and the title-to-action relationship stay identical across the app.
 *
 * `action` is the top-right slot — usually the primary button for the page.
 */
type PageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="font-display text-[28px] leading-tight tracking-tight">{title}</h1>
        {/*
         * A short gradient underscore, not a full-width rule: it ties the title to
         * the brand spine and stops the serif floating unanchored, while leaving the
         * hairline rules to do structural work between sections.
         */}
        <span aria-hidden className="surface-spine animate-fade-in mt-0.5 h-0.5 w-9 rounded-full" />
        {description && <p className="text-ink-2 mt-1 text-sm">{description}</p>}
      </div>
      {action}
    </header>
  );
}
