import { PlansNav } from "@/components/shell/plans-nav";
import { SubscriptionsView } from "@/components/recurring/subscriptions-view";
import { todayISO } from "@/lib/money";
import { getCategories, getClients, getContractors, getPriceChanges, getRecurring, getSettings, requireUser } from "@/lib/data";

export default async function SubscriptionsPage() {
  await requireUser();
  const [items, contractors, categories, clients, priceChanges, settings] = await Promise.all([
    getRecurring(),
    getContractors(),
    getCategories(),
    getClients(),
    getPriceChanges(),
    getSettings(),
  ]);
  // Server date (studio timezone) so SSR and hydration agree on "today".
  const today = todayISO();
  return (
    <>
      <PlansNav />
      <SubscriptionsView items={items} contractors={contractors} clients={clients} categories={categories} today={today} priceChanges={priceChanges} baseCurrency={settings.base_currency} />
    </>
  );
}
