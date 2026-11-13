import { createClient } from "@supabase/supabase-js";
import { buildCalendar, type FeedRow } from "@/lib/ics";

// Public on purpose (calendar apps fetch without a login). The secret token is the access control.
// Plain anon client: no user session here, and the calendar_feed RPC is the only thing anon may call.
const HEADERS = {
  "Content-Type": "text/calendar; charset=utf-8",
  "Cache-Control": "private, max-age=900",
  "X-Robots-Tag": "noindex",
};

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const raw = (await params).token;
  const token = raw.replace(/\.ics$/i, "");
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) return new Response("Not found", { status: 404 });

  let rows: FeedRow[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const { data } = await createClient(url, key, { auth: { persistSession: false } }).rpc("calendar_feed", { p_token: token });
    rows = (data as FeedRow[] | null) ?? []; // unknown token and error look the same as an empty feed
  }
  return new Response(buildCalendar(rows), { headers: HEADERS });
}
