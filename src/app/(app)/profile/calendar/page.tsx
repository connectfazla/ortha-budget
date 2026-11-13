import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getSettings, requireUser } from "@/lib/data";
import { CalendarFeed } from "../calendar-feed";

export default async function CalendarPage() {
  await requireUser();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Calendar feed" back={{ href: "/profile", label: "Profile" }} />
      <Card className="max-w-xl">
        <CardContent className="space-y-3">
          <CalendarFeed token={s.calendar_token} />
        </CardContent>
      </Card>
    </>
  );
}
