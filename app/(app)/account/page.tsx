import type { Metadata } from "next";

import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "@/components/button";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { APP_TIME_ZONE } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";

import { DisplayNameForm } from "./display-name-form";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Account" };

/**
 * Account settings: the display name, the password, and the way out.
 *
 * Three cards, in order of how often they're touched — the editable name first,
 * the credential second, and signing out last, where it can't be hit by accident.
 * Mobile needs that last one: the desktop rail has its own sign-out button and the
 * tab bar doesn't.
 *
 * Email and the join date stay read-only. Changing an email address means a
 * confirmation round trip on both the old and the new address, which is its own
 * feature and isn't in SPEC.md.
 */
export default async function AccountPage() {
  const supabase = await createClient();

  // Same pairing as the layout, for the same reason: RLS scopes `profiles` to the
  // session, so the query doesn't need the user id and needn't wait for it.
  const [
    {
      data: { user },
    },
    { data: profile },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("display_name").maybeSingle(),
  ]);

  // The layout redirects when there's no user, so this only satisfies the type.
  if (!user) return null;

  return (
    <>
      <PageHeader title="Account" description="Your sign-in details and app preferences." />

      {/*
       * `padded={false}` so the fact rows can run to the card edge — a divided list
       * with the hairlines stopping short of the border looks broken. The form
       * supplies its own padding to match.
       */}
      <Card title="Profile" padded={false}>
        <div className="p-4 sm:p-5">
          <DisplayNameForm current={profile?.display_name ?? null} />
        </div>

        <dl className="divide-rule border-rule divide-y border-t text-sm">
          <Row label="Email">
            <span className="break-all">{user.email}</span>
          </Row>
          <Row label="Member since">{formatJoinDate(user.created_at)}</Row>
          <Row label="Timezone">
            <span className="text-ink-2">{APP_TIME_ZONE}</span>
          </Row>
        </dl>
      </Card>

      <Card title="Password">
        <PasswordForm />
      </Card>

      <Card title="Session">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-ink-2 text-sm">
            Signing out clears the session cookie on this device only.
          </p>
          <form action={signOut}>
            <SubmitButton variant="secondary">Sign out</SubmitButton>
          </form>
        </div>
      </Card>
    </>
  );
}

/**
 * `created_at` is a full ISO timestamp with an offset, so `new Date()` parses it
 * unambiguously — this is not the `'YYYY-MM-DD'` trap CLAUDE.md warns about.
 * Rendering it in the app zone keeps it consistent with `occurred_on` dates.
 */
function formatJoinDate(createdAt: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIME_ZONE,
    dateStyle: "long",
  }).format(new Date(createdAt));
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 px-4 py-3 sm:px-5">
      <dt className="text-ink-3">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
