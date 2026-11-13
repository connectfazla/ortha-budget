import { CommandPalette } from "@/components/command/command-palette";
import { BottomBar } from "@/components/shell/bottom-bar";
import { Sidebar } from "@/components/shell/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getCategories, getClients, getContractors, getSettings, getUserEmail, requireUser } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [contractors, categories, allClients, settings, email] = await Promise.all([getContractors(), getCategories(), getClients(), getSettings(), getUserEmail()]);
  const clients = allClients.filter((c) => !c.archived);
  const base = settings.base_currency;
  return (
    <TooltipProvider delay={400}>
      <div className="flex min-h-dvh">
        <Sidebar email={email} contractors={contractors} categories={categories} clients={clients} baseCurrency={base} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1100px] px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-6 lg:pb-12">
            {children}
          </div>
        </main>
        <CommandPalette contractors={contractors} categories={categories} clients={clients} baseCurrency={base} />
        <BottomBar contractors={contractors} categories={categories} clients={clients} baseCurrency={base} />
      </div>
    </TooltipProvider>
  );
}
