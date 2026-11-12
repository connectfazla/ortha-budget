import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Everything is private except Clerk's own sign-in / sign-up pages and the PWA manifest.
const isPublic = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)", "/manifest.webmanifest"]);

export default clerkMiddleware(
  async (auth, req) => {
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
