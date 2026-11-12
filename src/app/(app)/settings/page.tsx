import { Download } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@clerk/nextjs";
import { currentUser } from "@clerk/nextjs/server";
import { requireUser } from "@/lib/data";
import { ThemeSwitch } from "./theme-switch";

const LABEL = "text-muted-foreground text-[11px] font-medium tracking-[0.08em] uppercase";
const CARD = "bg-card space-y-3 rounded-lg border p-4";

export default async function SettingsPage() {
  await requireUser();
  const user = await currentUser();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="grid max-w-xl gap-3">
        <section className={CARD}>
          <h2 className={LABEL}>ACCOUNT</h2>
          <p className="text-sm break-all">{user?.primaryEmailAddress?.emailAddress}</p>
          <SignOutButton redirectUrl="/sign-in">
            <Button variant="outline" className="h-10">
              Sign out
            </Button>
          </SignOutButton>
        </section>
        <section className={CARD}>
          <h2 className={LABEL}>THEME</h2>
          <ThemeSwitch />
        </section>
        <section className={CARD}>
          <h2 className={LABEL}>DATA</h2>
          {/* Plain anchor: route handler returns a file, not a page. */}
          <Button variant="outline" className="h-10" nativeButton={false} render={<a href="/api/export" download />}>
            <Download aria-hidden /> Export CSV
          </Button>
        </section>
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
          Your data is private to your account. Each person who signs up gets their own empty workspace.
        </p>
      </div>
    </>
  );
}
