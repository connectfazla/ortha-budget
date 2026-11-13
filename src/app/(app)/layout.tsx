import { CategoryProvider } from "@/components/categories/category-context";
import { CommandPalette } from "@/components/command/command-palette";
import { BottomBar } from "@/components/shell/bottom-bar";
import { SecondaryCurrencyProvider } from "@/components/currency/secondary-currency";
import { NotificationsPrompt } from "@/components/notifications/notifications-prompt";
import { ServiceWorker } from "@/components/shell/service-worker";
import { Sidebar } from "@/components/shell/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCategories, getCategoryOptions, getAvatarUrl, getClients, getContractors, getDisplayRate, getSettings, getUserEmail, requireUser } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [contractors, categories, categoryOptions, allClients, settings, email] = await Promise.all([
    getContractors(),
    getCategories(),
    getCategoryOptions(),
    getClients(),
    getSettings(),
    getUserEmail(),
  ]);
  const clients = allClients.filter((c) => !c.archived);
  const base = settings.base_currency;
  const second = settings.secondary_currency && settings.secondary_currency !== base ? settings.secondary_currency : null;
  const [photoUrl, rate] = await Promise.all([getAvatarUrl(settings.avatar_path), second ? getDisplayRate(base, second) : null]);
  const secondary = second && rate ? { currency: second, rate } : null;
  const name = settings.display_name?.trim() || email?.split("@")[0] || null;
  return (
    <CategoryProvider options={categoryOptions}>
    <SecondaryCurrencyProvider value={secondary}>
    <TooltipProvider delay={400}>
      <div className="flex min-h-dvh">
        <Sidebar email={email} name={name} photoUrl={photoUrl} contractors={contractors} categories={categories} clients={clients} baseCurrency={base} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1100px] px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-6 lg:pb-12">
            {children}
          </div>
        </main>
        <CommandPalette contractors={contractors} categories={categories} clients={clients} baseCurrency={base} />
        <BottomBar contractors={contractors} categories={categories} clients={clients} baseCurrency={base} />
        <ServiceWorker />
        <NotificationsPrompt
          never={settings.notify_prompt_never}
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
      </div>
    </TooltipProvider>
    </SecondaryCurrencyProvider>
    </CategoryProvider>
  );
}
