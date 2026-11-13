"use client";

import { useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { setCalendarFeed } from "@/lib/actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";

const noop = () => () => {};

export function CalendarFeed({ token }: { token: string | null }) {
  const [pending, start] = useTransition();
  const [confirmReset, setConfirmReset] = useState(false);
  // window is missing during SSR; reading it in render crashed the server pass of /settings.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const run = (on: boolean, msg: string) =>
    start(async () => {
      const r = await setCalendarFeed(on);
      if (r.ok) toast.success(msg);
      else toast.error(r.error);
    });
  const path = token ? `/api/calendar/${token}.ics` : "";
  const url = token ? `${origin}${path}` : "";
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
        <Button className="h-11" disabled={pending} onClick={() => run(true, "Calendar link ready")}>
          {pending ? <Spinner aria-hidden /> : null}
          Turn on calendar reminders
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <Field>
        <FieldLabel htmlFor="calendar-link">Calendar feed link</FieldLabel>
        <Input id="calendar-link" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="bg-muted h-11 font-mono text-xs" />
        <FieldDescription>Your calendar app sends the reminders. Anyone with this link can see your due dates, so keep it private.</FieldDescription>
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="h-11" onClick={copy}>Copy link</Button>
        <Button className="h-11" nativeButton={false} render={<a href={`webcal://${url.replace(/^https?:\/\//, "")}`} />}>Add to Apple Calendar</Button>
      </div>
      <div className="flex gap-2">
        <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
          <AlertDialogTrigger render={<Button variant="ghost" className="h-10" disabled={pending} />}>Reset link</AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset the calendar link?</AlertDialogTitle>
              <AlertDialogDescription>Resetting makes a new link. Calendars using the old one stop updating.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => {
                  setConfirmReset(false); // AlertDialogAction is a plain Button and does not close the dialog
                  run(true, "New link created");
                }}
              >
                Reset link
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button variant="ghost" className="text-muted-foreground h-10" disabled={pending} onClick={() => run(false, "Calendar reminders off")}>
          {pending ? <Spinner aria-hidden /> : null}
          Turn off
        </Button>
      </div>
    </div>
  );
}
