import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Email confirmation link target (used when "Confirm email" is on in Supabase Auth).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  if (token_hash && type) {
    const { error } = await (await createClient()).auth.verifyOtp({ type, token_hash });
    if (!error) return NextResponse.redirect(new URL("/", origin));
  }
  return NextResponse.redirect(new URL("/sign-in?error=link", origin));
}
