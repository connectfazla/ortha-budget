import { PlansNav } from "@/components/shell/plans-nav";
import { SubscriptionsView } from "@/components/recurring/subscriptions-view";
import { todayISO } from "@/lib/money";
import { getCategories, getContractors, getRecurring, requireUser } from "@/lib/data";

export default async function SubscriptionsPage() {
  await requireUser();
  const [items, contractors, categories] = await Promise.all([getRecurring(), getContractors(), getCategories()]);
  // Server date (studio timezone) so SSR and hydration agree on "today".
  const today = todayISO();
  return (
    <>
      <PlansNav />
      <SubscriptionsView items={items} contractors={contractors} categories={categories} today={today} />
    </>
  );
}
