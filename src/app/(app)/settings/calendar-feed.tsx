"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setCalendarFeed } from "@/lib/actions";
import { Button } from "@/components/ui/button";

export function CalendarFeed({ token }: { token: string | null }) {
  const [pending, start] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);
  const run = (on: boolean, msg: string) =>
    start(async () => {
      const r = await setCalendarFeed(on);
      if (r.ok) toast.success(msg);
      else toast.error(r.error);
      setConfirmReset(false);
    });
  const path = token ? `/api/calendar/${token}.ics` : "";
  const url = token ? `${window.location.origin}${path}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy. Select the link and copy it by hand.");
    }
  };

  if (!token) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">Add every due date to your calendar. Your calendar app sends the reminders.</p>
        <Button className="press h-11" disabled={pending} onClick={() => run(true, "Calendar link ready")}>Turn on calendar reminders</Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm">Your calendar app sends the reminders. Anyone with this link can see your due dates, so keep it private.</p>
      <input readOnly aria-label="Calendar feed link" value={url} onFocus={(e) => e.currentTarget.select()} className="bg-muted h-11 w-full min-w-0 rounded-lg border px-3 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:opacity-90 disabled:opacity-50" />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="press h-11" onClick={copy}>Copy link</Button>
        <Button className="press h-11" nativeButton={false} render={<a href={`webcal://${url.replace(/^https?:\/\//, "")}`} />}>Add to Apple Calendar</Button>
      </div>
      {confirmReset ? (
        <div className="rounded-lg border p-3">
          <p className="text-sm">Resetting makes a new link. Calendars using the old one stop updating.</p>
          <div className="mt-2 flex gap-2">
            <Button variant="destructive" className="press h-10" disabled={pending} onClick={() => run(true, "New link created")}>Reset link</Button>
            <Button variant="ghost" className="press h-10" onClick={() => setConfirmReset(false)}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="ghost" className="press h-10" onClick={() => setConfirmReset(true)}>Reset link</Button>
          <Button variant="ghost" className="press text-muted-foreground h-10" disabled={pending} onClick={() => run(false, "Calendar reminders off")}>Turn off</Button>
        </div>
      )}
    </div>
  );
}
