import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Public routes: the welcome page (and its OG image), sign-in / sign-up, the auth callback, the PWA manifest
// and the calendar feed (calendar apps can't log in; its secret token is the access control).
const PUBLIC = [/^\/welcome(\/|$)/, /^\/sign-in(\/|$)/, /^\/sign-up(\/|$)/, /^\/auth\//, /^\/manifest\.webmanifest$/, /^\/api\/calendar\//];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Refreshes the session cookie when needed. Must run before any redirect decision.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC.some((re) => re.test(pathname));
  // Only page loads get redirected. Server actions and other non-GET requests must reach their handler,
  // which does its own auth check (redirecting a POST breaks the action response).
  const isPageLoad = request.method === "GET" || request.method === "HEAD";

  if (!user) {
    if (pathname.startsWith("/api/") && !isPublic) return new NextResponse("Unauthorized", { status: 401 });
    if (isPageLoad && pathname === "/") return redirect(request, response, "/welcome");
    if (isPageLoad && !isPublic) return redirect(request, response, "/sign-in", pathname);
  } else if (isPageLoad && (pathname === "/welcome" || pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up"))) {
    return redirect(request, response, "/");
  }
  return response;
}

/** Redirect while keeping any session cookies Supabase just refreshed. `next` is a same-site path only. */
function redirect(request: NextRequest, from: NextResponse, pathname: string, next?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = next && next.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : "";
  const res = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => res.cookies.set(c));
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|landing/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
