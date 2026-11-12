import { CommandPalette } from "@/components/command/command-palette";
import { BottomBar } from "@/components/shell/bottom-bar";
import { Sidebar } from "@/components/shell/sidebar";
import { getCategories, getClients, getContractors, requireUser } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [contractors, categories, allClients] = await Promise.all([getContractors(), getCategories(), getClients()]);
  const clients = allClients.filter((c) => !c.archived);
  return (
    <div className="flex min-h-dvh">
      <Sidebar contractors={contractors} categories={categories} clients={clients} />
      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-[1100px] px-4 pt-4 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:px-8 lg:pt-6 lg:pb-12">
          {children}
        </div>
      </main>
      <CommandPalette contractors={contractors} categories={categories} clients={clients} />
      <BottomBar contractors={contractors} categories={categories} clients={clients} />
    </div>
  );
}
