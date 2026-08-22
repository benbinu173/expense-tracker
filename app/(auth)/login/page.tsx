import type { Metadata } from "next";

import { Alert } from "@/components/alert";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

const NOTICES: Record<string, string> = {
  "link-invalid":
    "That link has expired or was already used. Sign in, or request a new one by signing up again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { notice } = await searchParams;
  const message = typeof notice === "string" ? NOTICES[notice] : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl tracking-tight">Sign in</h1>
        {/* The same spine rule `PageHeader` puts under an app title. */}
        <span aria-hidden className="surface-spine h-0.5 w-9 rounded-full" />
        <p className="text-ink-2 mt-1 text-sm">Pick up where your ledger left off.</p>
      </div>

      {message && <Alert>{message}</Alert>}

      <LoginForm />
    </div>
  );
}
