"use client";

// Settings → Notifications. Mobbin refs: per-type rows with a one-line "what you get" and a trailing switch
// (Lightyear https://mobbin.com/screens/79f05c6f-7db0-487b-adeb-7a5f14236ec2 , Kraken
// https://mobbin.com/screens/ebe41637-082d-41bc-b937-ede3ae62f488 , Monzo
// https://mobbin.com/screens/60b3490e-68d9-4621-916e-fb76f55fcc3a ); permission asked only after a plain
// explanation and a tap (Stake https://mobbin.com/screens/cb6f4587-011d-47e8-8f0f-2a8e348320c6 , Public
// https://mobbin.com/screens/c2031fdc-6a34-4ba4-9e6c-60c9398b1edc ); short ordered setup steps with icons
// (Cosmos https://mobbin.com/screens/6e58948b-0dd3-4b55-a121-91b158b2b7b3 ).

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { BellOff, BellRing, Settings, Share, Smartphone, SquarePlus, type LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { removePushSubscription, saveNotificationPrefs, savePushSubscription, sendTestPush, type NotificationPrefsInput } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Item, ItemContent, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";

const VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
const noop = () => () => {};

function urlBase64ToUint8Array(s: string) {
  const raw = atob((s + "=".repeat((4 - (s.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => (navigator as Navigator & { standalone?: boolean }).standalone === true || matchMedia("(display-mode: standalone)").matches;

/** What this device can do. iOS only exposes Web Push to Home Screen apps (16.4+). */
type Env = "ssr" | "ios-browser" | "unsupported" | "denied" | "ready";
function env(): Env {
  if (isIOS() && !standalone()) return "ios-browser";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return "unsupported";
  return Notification.permission === "denied" ? "denied" : "ready";
}

let zones: string[] | undefined;
const timeZones = () => (zones ??= Intl.supportedValuesOf("timeZone"));
const NO_ZONES: string[] = []; // server snapshot; must be the same array every call
const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const HOURS = Array.from({ length: 24 }, (_, h) => h);

const IOS_STEPS: [LucideIcon, string][] = [
  [Share, "Tap Share in Safari's toolbar"],
  [SquarePlus, "Choose Add to Home Screen"],
  [Smartphone, "Open Budget from your Home Screen"],
  [Settings, "Come back to Settings to turn on notifications"],
];

export function Notifications({ prefs }: { prefs: NotificationPrefsInput }) {
  const environment = useSyncExternalStore(noop, env, () => "ssr" as Env);
  // undefined while checking this device, null when it has no subscription.
  const [sub, setSub] = useState<PushSubscription | null | undefined>(undefined);
  const [busy, startBusy] = useTransition();

  useEffect(() => {
    if (environment !== "ready") return;
    let live = true;
    navigator.serviceWorker
      .getRegistration("/")
      .then((reg) => reg?.pushManager.getSubscription() ?? null)
      .then((s) => live && setSub(s))
      .catch(() => live && setSub(null));
    return () => {
      live = false;
    };
  }, [environment]);

  // Saved timezone, unless it is still the column default and this device says otherwise.
  const detected = useSyncExternalStore(noop, browserTimeZone, () => null);
  const [edited, setEdited] = useState<Partial<NotificationPrefsInput>>({});
  const p: NotificationPrefsInput = { ...prefs, timezone: prefs.timezone === "UTC" && detected ? detected : prefs.timezone, ...edited };
  const zoneList = useSyncExternalStore(noop, timeZones, () => NO_ZONES);

  const save = async (next: NotificationPrefsInput) => {
    const r = await saveNotificationPrefs(next);
    if (r.ok) toast.success("Notification settings saved", { id: "notify-prefs" });
    else toast.error(r.error, { id: "notify-prefs" });
    return r.ok;
  };
  const change = (patch: Partial<NotificationPrefsInput>) => {
    const before = edited;
    setEdited((e) => ({ ...e, ...patch }));
    save({ ...p, ...patch }).then((ok) => ok || setEdited(before));
  };

  const turnOn = () =>
    startBusy(async () => {
      // Must be the first call in the tap handler: iOS ignores permission requests outside a user gesture.
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        // On "denied" the re-render after this transition re-reads Notification.permission and shows the blocked message.
        if (perm === "default") toast.error("Notifications stay off. Tap Turn on notifications to try again.");
        return;
      }
      if (!VAPID_KEY) return void toast.error("Notifications aren't set up on this server yet.");
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
          return void toast.error(r.error);
        }
        await saveNotificationPrefs(p); // stores the detected timezone so hours land in local time
        setSub(s);
        toast.success("Notifications are on for this device");
      } catch {
        toast.error("This device couldn't turn on notifications. Reload the page and try again.");
      }
    });

  const turnOff = () =>
    startBusy(async () => {
      if (!sub) return;
      const r = await removePushSubscription(sub.endpoint);
      if (!r.ok) return void toast.error(r.error);
      await sub.unsubscribe().catch(() => {});
      setSub(null);
      toast.success("Notifications are off for this device");
    });

  const sendTest = () =>
    startBusy(async () => {
      const r = await sendTestPush();
      if (r.ok) toast.success("Test sent. It should arrive in a few seconds.");
      else toast.error(r.error);
    });

  const digestOn = p.notify_renewals || p.notify_trials || p.notify_budgets;
  const zonesWithCurrent = zoneList.includes(p.timezone) ? zoneList : [p.timezone, ...zoneList];

  let device: React.ReactNode;
  if (environment === "ssr" || (environment === "ready" && sub === undefined)) {
    device = <Skeleton className="h-11 w-56" />;
  } else if (environment === "ios-browser") {
    device = (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">On iPhone and iPad, notifications only work once Budget is on your Home Screen.</p>
        <ItemGroup className="has-data-[size=sm]:gap-1">
          {IOS_STEPS.map(([Icon, text]) => (
            <Item key={text} role="listitem" size="sm" className="px-0 py-1.5">
              <ItemMedia variant="icon" className="bg-muted text-foreground size-9 rounded-md">
                <Icon aria-hidden />
              </ItemMedia>
              <ItemContent>
                <ItemTitle className="font-normal">{text}</ItemTitle>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </div>
    );
  } else if (environment === "unsupported") {
    device = <p className="text-muted-foreground text-sm">This browser can&apos;t show notifications. Use Chrome, Edge, Firefox or Safari, or the Home Screen app on iPhone.</p>;
  } else if (environment === "denied") {
    device = (
      <div className="flex gap-3">
        <BellOff className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden />
        <div className="space-y-1 text-sm">
          <p className="font-medium">Notifications are blocked on this device</p>
          <p className="text-muted-foreground">
            {isIOS()
              ? "Open the iPhone Settings app, tap Notifications, then Budget, and turn on Allow Notifications. Then come back here."
              : "Allow notifications for this site in your browser's site settings, then reload this page."}
          </p>
        </div>
      </div>
    );
  } else if (sub) {
    device = (
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <BellRing className="text-brand size-5 shrink-0" aria-hidden />
          <p className="text-sm font-medium">Notifications are on for this device</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" disabled={busy} onClick={sendTest}>
            {busy ? <Spinner aria-hidden /> : null}
            Send a test
          </Button>
          <Button variant="ghost" className="text-muted-foreground h-11" disabled={busy} onClick={turnOff}>
            Turn off on this device
          </Button>
        </div>
      </div>
    );
  } else {
    device = (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Get a morning summary when something is due and an evening reminder to log expenses. Turn it on for each phone or computer you use.
        </p>
        <Button className="h-11" disabled={busy} onClick={turnOn}>
          {busy ? <Spinner aria-hidden /> : null}
          Turn on notifications
        </Button>
      </div>
    );
  }

  const toggle = (id: keyof NotificationPrefsInput & `notify_${string}`, label: string, hint: string) => (
    <Field orientation="horizontal">
      <FieldContent>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <FieldDescription className="text-xs">{hint}</FieldDescription>
      </FieldContent>
      <Switch id={id} checked={p[id]} onCheckedChange={(v) => change({ [id]: v })} />
    </Field>
  );

  const hourSelect = (id: "digest_hour" | "reminder_hour", label: string, hint: string, disabled: boolean) => (
    <Field data-disabled={disabled}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <NativeSelect id={id} value={p[id]} disabled={disabled} onChange={(e) => change({ [id]: Number(e.target.value) })} className="w-full [&_select]:h-11">
        {HOURS.map((h) => (
          <NativeSelectOption key={h} value={h}>
            {h}:00
          </NativeSelectOption>
        ))}
      </NativeSelect>
      <FieldDescription className="text-xs">{hint}</FieldDescription>
    </Field>
  );

  return (
    <div className="space-y-4">
      {device}
      <Separator />
      <FieldGroup className="gap-4">
        {toggle("notify_renewals", "Renewals and overdue", "Plans that renew tomorrow and payments that are overdue, in the morning summary.")}
        {toggle("notify_trials", "Trials and cancel-by", "Free trials that end tomorrow and plans you set to cancel, in the morning summary.")}
        {toggle("notify_budgets", "Over budget", "Categories that went over this month's limit, in the morning summary.")}
        {toggle("notify_daily_log", "Evening reminder to log today's expenses", "Sent at the evening hour, only on days you haven't logged anything.")}
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {hourSelect("digest_hour", "Morning summary", "Sent at this hour when something is due tomorrow.", !digestOn)}
          {hourSelect("reminder_hour", "Evening reminder", "Sent at this hour if nothing is logged yet.", !p.notify_daily_log)}
        </div>
        <Field>
          <FieldLabel htmlFor="timezone">Timezone</FieldLabel>
          <NativeSelect id="timezone" value={p.timezone} onChange={(e) => change({ timezone: e.target.value })} className="w-full [&_select]:h-11">
            {(zonesWithCurrent.length ? zonesWithCurrent : [p.timezone]).map((z) => (
              <NativeSelectOption key={z} value={z}>
                {z.replace(/_/g, " ")}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription className="text-xs">Both hours use this timezone.</FieldDescription>
        </Field>
      </FieldGroup>
    </div>
  );
}
