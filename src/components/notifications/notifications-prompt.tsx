"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { neverAskNotifications, saveNotificationPrefs, type NotificationPrefsInput } from "@/lib/actions";
import { isIOS, standalone, subscribeThisDevice } from "@/components/notifications/subscribe";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";

const SEEN = "notify-prompt-seen";

async function canAsk() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return false;
  if (isIOS() && !standalone()) return false;
  if (Notification.permission !== "default") return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return !(await reg?.pushManager.getSubscription());
}

/** Once per session, shortly after sign-in: offer push notifications on this device. */
export function NotificationsPrompt({ never, prefs }: { never: boolean; prefs: NotificationPrefsInput }) {
  const pathname = usePathname();
  const onSettingsPage = pathname === "/profile/notifications";
  const [open, setOpen] = useState(false);
  const [dontAsk, setDontAsk] = useState(false);
  const [busy, start] = useTransition();

  useEffect(() => {
    if (never || onSettingsPage) return;
    let live = true;
    const t = setTimeout(async () => {
      try {
        if (sessionStorage.getItem(SEEN) || !(await canAsk()) || !live) return;
        sessionStorage.setItem(SEEN, "1");
        setOpen(true);
      } catch {
        // storage or service worker unavailable: skip the prompt
      }
    }, 1500);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [never, onSettingsPage]);

  const finish = async () => {
    if (dontAsk) await neverAskNotifications();
    setOpen(false);
  };

  const turnOn = () =>
    start(async () => {
      const r = await subscribeThisDevice();
      if (r.ok) {
        // Same as the settings page: store the detected timezone so the hours land in local time.
        const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        await saveNotificationPrefs({ ...prefs, timezone: prefs.timezone === "UTC" && zone ? zone : prefs.timezone });
        toast.success("Notifications are on for this device");
      } else if (r.error) toast.error(r.error);
      await finish();
    });

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && (o ? setOpen(true) : void finish())}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Get a heads-up before renewals?</DialogTitle>
          <DialogDescription>A morning summary when something is due, and an evening reminder to log your expenses.</DialogDescription>
        </DialogHeader>
        <Field orientation="horizontal">
          <Checkbox id="notify-never" checked={dontAsk} onCheckedChange={(v) => setDontAsk(v === true)} />
          <FieldLabel htmlFor="notify-never" className="font-normal">
            Don&apos;t ask again
          </FieldLabel>
        </Field>
        <DialogFooter>
          <Button variant="ghost" className="h-11" disabled={busy} onClick={() => void finish()}>
            Not now
          </Button>
          <Button className="h-11" disabled={busy} onClick={turnOn}>
            {busy ? <Spinner aria-hidden /> : null}
            Turn on
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
