import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getSettings, requireUser } from "@/lib/data";
import { Notifications } from "../notifications";

export default async function NotificationsPage() {
  await requireUser();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Notifications" back={{ href: "/profile", label: "Profile" }} />
      <Card className="max-w-xl">
        <CardContent>
          <Notifications
            prefs={{
              timezone: s.timezone,
              notify_renewals: s.notify_renewals,
              notify_trials: s.notify_trials,
              notify_budgets: s.notify_budgets,
              notify_daily_log: s.notify_daily_log,
              digest_hour: s.digest_hour,
              reminder_hour: s.reminder_hour,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
