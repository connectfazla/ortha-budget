import { PageHeader } from "@/components/shell/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getSettings, requireUser } from "@/lib/data";
import { BaseCurrency } from "../base-currency";
import { SettingsForm } from "../settings-form";

export default async function MoneyPage() {
  await requireUser();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Money" back={{ href: "/profile", label: "Profile" }} />
      <Card className="max-w-xl">
        <CardContent className="space-y-3">
          <BaseCurrency current={s.base_currency} />
        </CardContent>
        <Separator />
        <CardContent>
          <SettingsForm taxRate={s.tax_rate} cash={s.cash_on_hand} currency={s.base_currency} />
        </CardContent>
      </Card>
    </>
  );
}
