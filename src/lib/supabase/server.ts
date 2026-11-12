import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase client that acts as the signed-in Clerk user. Supabase verifies the Clerk session token
 * (third-party auth), and RLS scopes every row to its `sub` claim. No token → anon role → no table access.
 */
export async function createClient() {
  const { getToken } = await auth();
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    accessToken: async () => (await getToken()) ?? null,
  });
}
