import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

/**
 * Session refresh plus an optimistic redirect. In Next 16 this file is
 * `proxy.ts`, not `middleware.ts`.
 *
 * Refresh is the important job: Server Components cannot write cookies, so
 * without this the session would expire silently and users would be logged out
 * at random.
 *
 * The redirect here is a convenience, NOT the authorization boundary — it saves
 * rendering a protected page just to bounce it. Every protected route verifies
 * the session itself (see `app/(app)/layout.tsx`), and RLS in Postgres is the
 * real boundary. Never treat a proxy check as sufficient.
 */

/** Reachable without a session. `/auth` covers the email confirmation handler. */
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/dev"];

/** Pointless to visit once signed in; bounce to the dashboard. */
const SIGNED_OUT_ONLY = ["/login", "/signup"];

function matches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        // Rebuild the response so the refreshed cookies reach both the current
        // render and the browser.
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not remove: this call is what triggers the token refresh and the
  // `setAll` above. Must be `getUser()` — `getSession()` does not revalidate.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !matches(pathname, PUBLIC_PREFIXES)) {
    return redirectTo("/login", request, response);
  }

  if (user && matches(pathname, SIGNED_OUT_ONLY)) {
    return redirectTo("/", request, response);
  }

  return response;
}

/**
 * Redirect while carrying over any cookies the refresh just set — building a
 * fresh response would throw away a rotated token and log the user out.
 */
function redirectTo(pathname: string, request: NextRequest, carrying: NextResponse): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  // Drop the original query string: it belonged to a different page.
  url.search = "";

  const redirect = NextResponse.redirect(url);
  for (const cookie of carrying.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}

export const config = {
  matcher: [
    // Everything except Next internals and static image files.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
