/**
 * Environment variables, read once and validated at import time so a missing
 * value fails the build instead of surfacing as a confusing runtime error.
 *
 * `process.env.NEXT_PUBLIC_*` must be referenced literally — Next inlines these
 * at build time, so dynamic lookups like `process.env[name]` would break.
 */
function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

export const SUPABASE_URL = required(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);

export const SUPABASE_PUBLISHABLE_KEY = required(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
);
