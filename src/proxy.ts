import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Everything is private except the public welcome page (and its OG image), Clerk's own sign-in / sign-up pages,
// the PWA manifest and the calendar feed (calendar apps can't log in; its secret token is the access control).
const isPublic = createRouteMatcher([
  "/welcome",
  "/welcome/(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/manifest.webmanifest",
  "/api/calendar/(.*)",
]);

export default clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;
    // Signed-out visitors to the app root see the welcome page; signed-in visitors skip it.
    if (pathname === "/" || pathname === "/welcome") {
      const { userId } = await auth();
      if (pathname === "/" && !userId) return NextResponse.redirect(new URL("/welcome", req.url));
      if (pathname === "/welcome" && userId) return NextResponse.redirect(new URL("/", req.url));
    }
    if (!isPublic(req)) await auth.protect();
  },
  { signInUrl: "/sign-in", signUpUrl: "/sign-up" },
);

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
