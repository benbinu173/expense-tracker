"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

/**
 * Auth actions: sign up, sign in, sign out.
 *
 * These are the only place credentials are handled. `user_id` is never accepted
 * from a form — it comes from the session Supabase establishes here, and RLS in
 * Postgres is what actually keeps rows apart.
 */

export type AuthFormState = {
  /** Keyed to match the form input names. */
  fieldErrors?: Partial<Record<"email" | "password" | "displayName", string[]>>;
  /** Whole-form failure, e.g. wrong credentials. */
  error?: string;
  /** Replaces the form on success without a redirect, e.g. "check your email". */
  notice?: string;
  /** Echoed back so a rejected submission doesn't wipe what was typed. */
  values?: { email?: string; displayName?: string };
};

/** `FormData.get` returns `string | File | null`; the schemas want a string. */
function field(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Absolute origin for links Supabase emails out. Derived from the request so it
 * works on localhost and on Vercel without a second env var to keep in sync.
 */
async function siteOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}

export async function signIn(
  _previous: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email");
  const parsed = loginSchema.safeParse({ email, password: field(formData, "password") });

  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: { email } };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return {
      error:
        error.code === "email_not_confirmed"
          ? "Confirm your email address first — check your inbox for the link."
          : "Email or password is incorrect.",
      values: { email },
    };
  }

  refresh();
  redirect("/");
}

export async function signUp(
  _previous: AuthFormState | undefined,
  formData: FormData,
): Promise<AuthFormState> {
  const email = field(formData, "email");
  const displayName = field(formData, "displayName");
  const parsed = signupSchema.safeParse({
    email,
    password: field(formData, "password"),
    displayName,
  });

  if (!parsed.success) {
    return {
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
      values: { email, displayName },
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // `handle_new_user()` reads this to seed profiles.display_name.
      ...(parsed.data.displayName ? { data: { display_name: parsed.data.displayName } } : {}),
      emailRedirectTo: `${await siteOrigin()}/auth/confirm`,
    },
  });

  if (error) {
    return { error: signUpMessage(error.code), values: { email, displayName } };
  }

  // Email confirmation turned off in the Supabase dashboard: already signed in.
  if (data.session) {
    refresh();
    redirect("/");
  }

  return { notice: `Almost there — open the confirmation link we sent to ${parsed.data.email}.` };
}

function signUpMessage(code: string | undefined): string {
  switch (code) {
    case "user_already_exists":
    case "email_exists":
      return "That email already has an account. Sign in instead.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one.";
    case "over_email_send_rate_limit":
      return "Too many emails just went out. Wait a few minutes and try again.";
    case "signup_disabled":
      return "Signups are disabled for this project.";
    default:
      return "Could not create the account. Try again.";
  }
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();

  refresh();
  redirect("/login");
}
