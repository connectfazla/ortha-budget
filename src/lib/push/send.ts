import "server-only";
import * as webpush from "web-push";
import type { PushMessage } from "./messages";

export type Target = { endpoint: string; p256dh: string; auth: string };

let configured = false;
function configure() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://example.com", pub, priv);
  configured = true;
  return true;
}

/** Sends one notification. Returns "gone" when the push service says the subscription no longer exists. */
export async function sendPush(t: Target, msg: PushMessage): Promise<"sent" | "gone" | "failed"> {
  if (!configure()) return "failed";
  try {
    await webpush.sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, JSON.stringify(msg), {
      TTL: 60 * 60 * 6,
      urgency: "normal",
      topic: msg.tag.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32),
    });
    return "sent";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}
