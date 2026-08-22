import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Lands the link from Supabase's confirmation and password-reset emails.
 *
 * Two shapes are accepted because the shape depends on the email template:
 * the default `{{ .ConfirmationURL }}` arrives back here with `?code=`, while
 * the `{{ .TokenHash }}` template arrives with `?token_hash=&type=`. Handling
 * both means changing the template later doesn't break the link.
 *
 * This is a Route Handler, so it may write cookies but must not call
 * `refresh()` — that is Server-Action-only in Next 16.
 */

const OTP_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const satisfies readonly EmailOtpType[];

function isOtpType(value: string | null): value is EmailOtpType {
  return value !== null && (OTP_TYPES as readonly string[]).includes(value);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const supabase = await createClient();

  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const code = searchParams.get("code");

  if (tokenHash !== null && isOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      // A recovery link should land on the password form, not the dashboard.
      redirect(type === "recovery" ? "/account" : "/");
    }
  } else if (code !== null) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect("/");
  }

  // Expired, already used, or opened in a different browser than it started in.
  redirect("/login?notice=link-invalid");
}
