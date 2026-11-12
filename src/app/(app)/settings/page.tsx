import { Download, Upload } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { getSettings, requireUser } from "@/lib/data";
import { CalendarFeed } from "./calendar-feed";
import { SettingsForm } from "./settings-form";
import { ThemeSwitch } from "./theme-switch";

const CARD = "bg-card shadow-card space-y-3 rounded-xl border p-4";

export default async function SettingsPage() {
  await requireUser();
  const [user, settings] = await Promise.all([currentUser(), getSettings()]);
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-xl gap-3">
        <section className={CARD}>
          <h2 className="label">Money</h2>
          <SettingsForm taxRate={settings.tax_rate} cash={settings.cash_on_hand_usd} />
        </section>
        <section className={CARD}>
          <h2 className="label">Calendar reminders</h2>
          <CalendarFeed token={settings.calendar_token} />
        </section>
        <section className={CARD}>
          <h2 className="label">Account</h2>
          <p className="text-sm break-all">{user?.primaryEmailAddress?.emailAddress}</p>
          <SignOutButton redirectUrl="/sign-in">
            <Button variant="outline" className="press h-11">
              Sign out
            </Button>
          </SignOutButton>
        </section>
        <section className={CARD}>
          <h2 className="label">Theme</h2>
          <ThemeSwitch />
        </section>
        <section className={CARD}>
          <h2 className="label">Your data</h2>
          {/* Plain anchor: route handler returns a file, not a page. */}
          <Button variant="outline" className="press h-11" nativeButton={false} render={<a href="/api/export" download />}>
            <Download aria-hidden /> Export CSV
          </Button>
          <Button variant="outline" className="press h-11" nativeButton={false} render={<Link href="/import" />}>
            <Upload aria-hidden /> Import CSV
          </Button>
        </section>
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
          Your data is private to your account. Each person who signs up gets their own empty workspace.
        </p>
      </div>
    </>
  );
}
