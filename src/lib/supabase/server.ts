import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers, acting as the signed-in user
 * (session in cookies). RLS scopes every row to `auth.jwt() ->> 'sub'`; no session means the anon role, which has no table access.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

/** The signed-in user's id, or null. Verifies the session with Supabase Auth (not just the cookie). */
export async function currentUserId(): Promise<string | null> {
  const { data } = await (await createClient()).auth.getUser();
  return data.user?.id ?? null;
}
