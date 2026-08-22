import type { Metadata } from "next";

import { SignupForm } from "./signup-form";

// The layout's `title.template` appends "— Finance Tracker".
export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl tracking-tight">Create your account</h1>
        {/* The same spine rule `PageHeader` puts under an app title. */}
        <span aria-hidden className="surface-spine h-0.5 w-9 rounded-full" />
        <p className="text-ink-2 mt-1 text-sm">
          You&rsquo;ll start with a set of everyday categories, ready to edit.
        </p>
      </div>

      <SignupForm />
    </div>
  );
}
