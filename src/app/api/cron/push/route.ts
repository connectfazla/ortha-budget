import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { buildMessage, type DuePayload } from "@/lib/push/messages";
import { sendPush } from "@/lib/push/send";

// Called every hour by Supabase pg_cron (push_tick) with "Authorization: Bearer <PUSH_CRON_SECRET>".
// No user session here: a plain anon client calls the secret-gated push_due / push_forget functions.
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = process.env.PUSH_CRON_SECRET ?? "";
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer /, "");
  if (secret.length < 32 || got.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(got), Buffer.from(secret));
}

export async function POST(req: Request) {
  if (!authorized(req)) return new Response("Not found", { status: 404 });
  const secret = process.env.PUSH_CRON_SECRET!;
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await db.rpc("push_due", { p_secret: secret });
  if (error) return Response.json({ error: "push_due failed" }, { status: 500 });

  let sent = 0;
  let gone = 0;
  for (const row of (data ?? []) as { endpoint: string; p256dh: string; auth: string; kind: string; payload: DuePayload }[]) {
    const msg = buildMessage(row.kind, row.payload);
    if (!msg) continue;
    const r = await sendPush(row, msg);
    if (r === "sent") sent++;
    if (r === "gone") {
      gone++;
      await db.rpc("push_forget", { p_secret: secret, p_endpoint: row.endpoint });
    }
  }
  return Response.json({ sent, gone });
}
