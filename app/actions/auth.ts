"use server";

import { refresh } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import * as z from "zod";

import { createClient } from "@/lib/supabase/server";
import { loginSchema, passwordChangeSchema, signupSchema } from "@/lib/validation/auth";

/**
 * Auth actions: sign up, sign in, sign out, change password.
 *
 * These are the only place credentials are handled. `user_id` is never accepted
 * from a form — it comes from the session Supabase establishes here, and RLS in
 * Postgres is what actually keeps rows apart.
 */

export type AuthFormState = {
  /**
   * Keyed to match the form input names. The union spans both forms this state
   * serves, so `confirmPassword` and `displayName` are signup-only and `email` and
   * `password` are shared — `Partial` is what lets each action fill its own subset.
   */
  fieldErrors?: Partial<Record<"email" | "password" | "confirmPassword" | "displayName", string[]>>;
  /** Whole-form failure, e.g. wrong credentials. */
  error?: string;
  /** Replaces the form on success without a redirect, e.g. "check your email". */
  notice?: string;
  /** Echoed back so a rejected submission doesn't wipe what was typed. */
  values?: { email?: string; displayName?: string };
};

/**
 * The change-password form's own state. Separate from `AuthFormState` because
 * nothing typed into it may ever be echoed back — there is no `values` here, so
 * a rejected submission clears both boxes rather than round-tripping a password
 * through the response.
 */
export type PasswordFormState = {
  /** Keyed to match the form input names. */
  fieldErrors?: Partial<Record<"currentPassword" | "password", string[]>>;
  /** Whole-form failure. */
  error?: string;
  /** Confirmation, shown in place — a password change doesn't navigate. */
  notice?: string;
  /**
   * How many changes this form has landed. The form keys its `<form>` on it so a
   * success remounts and empties both boxes. It's a counter rather than a flag
   * because two changes in one page load must both clear: on the second, a flag
   * would already be set, the key wouldn't change, and the old password would sit
   * visible in the field.
   */
  changed?: number;
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
    confirmPassword: field(formData, "confirmPassword"),
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

/**
 * Change the password from `/account`.
 *
 * The current password is verified with `signInWithPassword` rather than by
 * passing `current_password` to `updateUser`. That attribute exists in auth-js
 * but is only honoured when the project has
 * `GOTRUE_SECURITY_UPDATE_PASSWORD_REQUIRE_CURRENT_PASSWORD` set, which is a
 * dashboard setting and not something a migration can turn on — so relying on it
 * would mean the check silently does nothing here. Verifying it ourselves works
 * whatever the project is configured to do.
 *
 * Two consequences of doing it that way, both fine:
 *
 * - A wrong guess counts against Supabase's sign-in rate limit. That's the
 *   behaviour we want — it's the same protection the login screen has, so a
 *   borrowed unlocked browser can't be used to brute-force the old password.
 * - A correct one rotates the session cookie just before the password write.
 *   Same user, same session identity; `signIn` already proves that a Server
 *   Action can set those cookies.
 */
export async function changePassword(
  previous: PasswordFormState | undefined,
  formData: FormData,
): Promise<PasswordFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  /*
   * Carried into every failure return so the counter the form keys on doesn't
   * move: a rejected attempt should leave both boxes holding what was typed, so
   * the wrong one can be corrected without retyping the other.
   */
  const sameKey = { changed: previous?.changed };

  const parsed = passwordChangeSchema.safeParse({
    currentPassword: field(formData, "currentPassword"),
    password: field(formData, "password"),
  });

  if (!parsed.success) {
    return { ...sameKey, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  /*
   * `email` is optional on the user type — an account can be identified by phone
   * or by a third-party provider instead. Ours are all email/password, so this is
   * unreachable, but it's the only honest way to get past the type without a `!`.
   */
  if (!user.email) {
    return {
      ...sameKey,
      error: "This account has no email address, so the password can't be changed here.",
    };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });

  if (verifyError) {
    if (verifyError.code === "over_request_rate_limit") {
      return { ...sameKey, error: "Too many attempts just now. Wait a minute and try again." };
    }

    return { ...sameKey, fieldErrors: { currentPassword: ["That's not your current password."] } };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { ...sameKey, ...passwordChangeFailure(error.code) };
  }

  /*
   * `updateUser` leaves this session signed in, so there's nothing to redirect to
   * — the user stays on `/account`. `refresh()` because other tabs' sessions were
   * just invalidated server-side, and the router should be holding fresh state
   * when it next navigates.
   */
  refresh();
  return {
    notice: "Password changed. You're still signed in here.",
    changed: (previous?.changed ?? 0) + 1,
  };
}

/**
 * The `updateUser` failures worth naming. `same_password` and `weak_password` are
 * only reachable when the project has the matching policy switched on — our schema
 * catches reuse first, and Supabase's own strength rules are stricter than a length
 * check — but the honest message costs nothing if a setting changes later.
 */
function passwordChangeFailure(code: string | undefined): PasswordFormState {
  switch (code) {
    case "same_password":
      return {
        fieldErrors: { password: ["That's already your password. Pick a different one."] },
      };
    case "weak_password":
      return {
        fieldErrors: { password: ["That password is too easy to guess. Try a longer one."] },
      };
    case "reauthentication_needed":
      return { error: "Sign out and back in, then change your password." };
    case "session_expired":
      return { error: "Your session expired. Sign in again and retry." };
    case "over_request_rate_limit":
      return { error: "Too many attempts just now. Wait a minute and try again." };
    default:
      return { error: "Couldn't change the password. Try again." };
  }
}
