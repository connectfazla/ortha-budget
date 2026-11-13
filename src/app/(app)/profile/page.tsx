import Link from "next/link";
import { BarChart3, Bell, CalendarDays, CalendarRange, Coins, Download, LogOut, Percent, PiggyBank, Upload, Wallet } from "lucide-react";
import { ThemeSwitch } from "@/components/onboarding/theme-switch";
import { PageHeader } from "@/components/shell/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { signOut } from "@/lib/actions";
import { getSettings, getUserEmail, requireUser } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { Group, Row, Rows } from "./rows";

/**
 * Profile tab [Neo Financial Profile][Wealthfront Profile][Chime Profile tab]: who is signed in, then short
 * grouped rows. Long sections (money, notifications, calendar) drill in to their own page, like iOS Settings.
 */
export default async function ProfilePage() {
  await requireUser();
  const [email, settings] = await Promise.all([getUserEmail(), getSettings()]);
  const base = settings.base_currency;
  const money = <Link href="/profile/money" />;
  return (
    <>
      <PageHeader title="Profile" />
      <div className="grid max-w-xl gap-6">
        <Card>
          <CardContent className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback className="text-base font-medium">{(email ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium" title={email ?? undefined}>{email}</p>
              <p className="text-muted-foreground text-[13px]">Your data is private to this account.</p>
            </div>
          </CardContent>
        </Card>

        <Group title="Insights">
          <Rows
            rows={[
              { icon: BarChart3, title: "Reports", description: "Spending by category and month", render: <Link href="/reports" /> },
              { icon: PiggyBank, title: "Budgets", description: "Monthly limits per category", render: <Link href="/budgets" /> },
              { icon: CalendarRange, title: "Year-end report", description: "A printable summary for tax time", render: <Link href="/reports/annual" /> },
            ]}
          />
        </Group>

        <Group title="Appearance">
          <CardContent className="py-4">
            <ThemeSwitch />
          </CardContent>
        </Group>

        <Group>
          <Rows rows={[{ icon: Bell, title: "Notifications", description: "Renewals, trials, budgets and a daily reminder", render: <Link href="/profile/notifications" /> }]} />
        </Group>

        <Group title="Money">
          <Rows
            rows={[
              { icon: Coins, title: "Base currency", value: base, render: money },
              { icon: Percent, title: "Tax set-aside", value: settings.tax_rate > 0 ? `${settings.tax_rate}%` : "Off", render: money },
              {
                icon: Wallet,
                title: "Cash on hand",
                value: settings.cash_on_hand === null ? "Not set" : formatMoney(settings.cash_on_hand, base, { compact: true }),
                render: money,
              },
            ]}
          />
        </Group>

        <Group>
          <Rows
            rows={[
              {
                icon: CalendarDays,
                title: "Calendar feed",
                description: "Renewals and cancel-by dates in your calendar app",
                value: settings.calendar_token ? "On" : "Off",
                render: <Link href="/profile/calendar" />,
              },
            ]}
          />
        </Group>

        <Group title="Data">
          <Rows
            rows={[
              { icon: Upload, title: "Import transactions", description: "Add entries from a CSV file", render: <Link href="/import" /> },
              // Plain anchor: the route handler returns a file, not a page.
              { icon: Download, title: "Export transactions", description: "Download every entry as a CSV file", render: <a href="/api/export" download />, chevron: false },
            ]}
          />
        </Group>

        <Card className="py-0">
          <form action={signOut}>
            <Row icon={LogOut} title="Sign out" render={<button type="submit" />} chevron={false} className="text-destructive [&_svg]:text-destructive" />
          </form>
        </Card>
      </div>
    </>
  );
}
