import { savePushSubscription } from "@/lib/actions";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function urlBase64ToUint8Array(s: string) {
  const raw = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const standalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;

export type SubscribeResult =
  | { ok: true; subscription: PushSubscription }
  | { ok: false; error: string | null; permission: NotificationPermission };

/**
 * Ask for permission, subscribe this device and save it. Call it first in the tap handler: iOS ignores
 * permission requests outside a user gesture. `error` is null when the user just dismissed the browser prompt.
 */
export async function subscribeThisDevice(): Promise<SubscribeResult> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return { ok: false, permission: perm, error: perm === "default" ? "Notifications stay off. Tap Turn on notifications to try again." : null };
  }
  if (!VAPID_KEY) return { ok: false, permission: perm, error: "Notifications aren't set up on this server yet." };
  try {
    const reg = await navigator.serviceWorker.ready;
    const s = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_KEY) });
    const json = s.toJSON();
    const r = await savePushSubscription({
      endpoint: s.endpoint,
      keys: { p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" },
      userAgent: navigator.userAgent.slice(0, 300),
    });
    if (!r.ok) {
      await s.unsubscribe();
      return { ok: false, permission: perm, error: r.error };
    }
    return { ok: true, subscription: s };
  } catch {
    return { ok: false, permission: perm, error: "This device couldn't turn on notifications. Reload the page and try again." };
  }
}
