import type { Metadata } from "next";

import { signOut } from "@/app/actions/auth";
import { SubmitButton } from "@/components/button";
import { Card } from "@/components/card";
import { PageHeader } from "@/components/page-header";
import { APP_TIME_ZONE } from "@/lib/period";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Account" };

/**
 * Account overview. Editing the display name and changing the password are
 * step 13 — this shows what the session already knows, and gives mobile a place
 * to sign out from (the desktop rail has its own button).
 */
export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The layout redirects when there's no user, so this only satisfies the type.
  if (!user) return null;

  const displayName =
    typeof user.user_metadata.display_name === "string" && user.user_metadata.display_name.trim()
      ? user.user_metadata.display_name
      : null;

  return (
    <>
      <PageHeader title="Account" description="Your sign-in details and app preferences." />

      <Card padded={false}>
        <dl className="divide-rule divide-y text-sm">
          <Row label="Display name">{displayName ?? <Unset>Not set</Unset>}</Row>
          <Row label="Email">
            <span className="break-all">{user.email}</span>
          </Row>
          <Row label="Member since">{formatJoinDate(user.created_at)}</Row>
          <Row label="Timezone">
            <span className="text-ink-2">{APP_TIME_ZONE}</span>
          </Row>
        </dl>
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

function Unset({ children }: { children: React.ReactNode }) {
  return <span className="text-ink-3 font-normal italic">{children}</span>;
}
