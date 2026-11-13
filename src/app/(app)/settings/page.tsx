import { Download, Upload } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/lib/actions";
import { getSettings, getUserEmail, requireUser } from "@/lib/data";
import { BaseCurrency } from "./base-currency";
import { CalendarFeed } from "./calendar-feed";
import { Notifications } from "./notifications";
import { SettingsForm } from "./settings-form";
import { ThemeSwitch } from "./theme-switch";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2 className="label">{title}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

export default async function SettingsPage() {
  await requireUser();
  const [email, settings] = await Promise.all([getUserEmail(), getSettings()]);
  const base = settings.base_currency;
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-xl gap-3">
        <Section title="Money">
          <SettingsForm taxRate={settings.tax_rate} cash={settings.cash_on_hand} currency={base} />
        </Section>
        <Section title="Currency">
          <BaseCurrency current={base} />
        </Section>
        <Section title="Notifications">
          <Notifications
            prefs={{
              timezone: settings.timezone,
              notify_renewals: settings.notify_renewals,
              notify_trials: settings.notify_trials,
              notify_budgets: settings.notify_budgets,
              notify_daily_log: settings.notify_daily_log,
              digest_hour: settings.digest_hour,
              reminder_hour: settings.reminder_hour,
            }}
          />
        </Section>
        <Section title="Calendar reminders">
          <CalendarFeed token={settings.calendar_token} />
        </Section>
        <Section title="Account">
          <p className="text-sm break-all">{email}</p>
          <form action={signOut}>
            <Button type="submit" variant="outline" className="press h-11">
              Sign out
            </Button>
          </form>
        </Section>
        <Section title="Theme">
          <ThemeSwitch />
        </Section>
        <Section title="Your data">
          <div className="flex flex-wrap gap-2">
            {/* Plain anchor: route handler returns a file, not a page. */}
            <Button variant="outline" className="h-11" nativeButton={false} render={<a href="/api/export" download />}>
              <Download aria-hidden /> Export CSV
            </Button>
            <Button variant="outline" className="h-11" nativeButton={false} render={<Link href="/import" />}>
              <Upload aria-hidden /> Import CSV
            </Button>
          </div>
        </Section>
        <p className="text-muted-foreground px-1 text-xs">
          Your data is private to your account. Each person who signs up gets their own empty workspace.
        </p>
      </div>
    </>
  );
}
