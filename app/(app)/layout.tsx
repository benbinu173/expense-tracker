import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/actions/auth";
import { SidebarNav, TabBarNav } from "@/components/app-nav";
import { SubmitButton } from "@/components/button";
import { Wordmark } from "@/components/wordmark";
import { createClient } from "@/lib/supabase/server";

/**
 * The app shell, and the real auth gate for everything inside this route group.
 *
 * `proxy.ts` also redirects unauthenticated requests, but that is an optimistic
 * check on a cookie — this is the real one, because it asks Supabase to validate
 * the token. RLS is the last line: even a bypass here returns no rows.
 *
 * Two navigations, one definition (see `components/app-nav.tsx`): a rail from
 * `md` up, a bottom tab bar below it. Nothing is behind a hamburger — with four
 * destinations, a menu is a tap tax for no gain.
 *
 * The aurora wash and `stagger-children` both live here so that every screen in
 * the group inherits the backdrop and the entrance without opting in.
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();

  /*
   * Both reads go out together. The profile query needs no user id — RLS scopes
   * `profiles` to `auth.uid()` — so it doesn't have to wait for `getUser()`, and
   * the shell costs one round trip instead of two.
   *
   * Firing it before the redirect gate is safe: with no session RLS returns no
   * row, so an unauthenticated request wastes one query on a path `proxy.ts` has
   * already redirected. And the token it uses is current, because the proxy
   * refreshes the session before any of this renders.
   */
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("display_name").maybeSingle(),
  ]);

  if (!user) redirect("/login");

  /*
   * `profiles.display_name` is the source of truth, not `user.user_metadata` —
   * signup writes that copy once as the seed trigger's argument and nothing keeps
   * it current, so reading it here would show a stale name after an edit. See
   * `app/actions/profile.ts` for why the column won.
   *
   * `maybeSingle` because a missing profile row should cost the name, not the app
   * shell. The check constraint means the stored value is a non-blank name or
   * NULL, so there's nothing to trim.
   */
  const displayName = profile?.display_name ?? null;

  return (
    <div className="relative isolate flex flex-1">
      {/*
       * The aurora wash: two soft brand glows, fixed so they don't scroll with the
       * content and `pointer-events-none` so they can't eat a click. Purely
       * decorative — every surface above it is opaque or blurred, so nothing's
       * legibility depends on it.
       *
       * `isolate` on the wrapper is load-bearing. Without a stacking context here,
       * `-z-10` resolves against the root and the glow paints *behind* `body`'s
       * `bg-paper` — invisible. With it, the glow sits above the page background
       * and below every descendant.
       */}
      <div aria-hidden className="surface-aurora pointer-events-none fixed inset-0 -z-10" />

      <aside className="border-rule bg-raised/85 hidden w-60 shrink-0 flex-col gap-6 border-r px-3 py-5 backdrop-blur-sm md:sticky md:top-0 md:flex md:h-dvh">
        <div className="px-2.5">
          <Wordmark />
        </div>

        <SidebarNav />

        <div className="border-rule mt-auto flex flex-col gap-2 border-t px-2.5 pt-4">
          <Link
            href="/account"
            className="focus-ring hover:bg-brand-soft ease-out-quart -mx-1.5 flex min-w-0 flex-col rounded-md px-1.5 py-1 text-left transition-colors duration-150"
            title={user.email}
          >
            {displayName && <span className="truncate text-sm font-medium">{displayName}</span>}
            <span className="text-ink-3 truncate text-xs">{user.email}</span>
          </Link>
          <form action={signOut}>
            <SubmitButton variant="secondary" size="sm" className="w-full">
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-rule bg-raised/85 sticky top-0 z-10 border-b px-5 py-3 backdrop-blur-md md:hidden">
          <Wordmark />
        </header>

        {/*
         * `stagger-children` is declared here rather than per page, so every screen
         * gets the same entrance choreography for free and no page file has to
         * opt each block in. `pb-24` clears the fixed tab bar; from `md` up there
         * isn't one.
         */}
        <main className="stagger-children mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-7 pb-24 sm:px-6 md:py-10 md:pb-12">
          {children}
        </main>
      </div>

      <TabBarNav />
    </div>
  );
}
