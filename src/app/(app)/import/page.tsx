import Link from "next/link";
import { ImportFlow } from "@/components/import/import-flow";
import { PageHeader } from "@/components/shell/page-header";
import { requireUser } from "@/lib/data";

export default async function ImportPage() {
  await requireUser();
  return (
    <>
      <PageHeader
        title="Import transactions"
        subtitle={
          <>
            Bring in a CSV from your bank or another tracker.{" "}
            <Link href="/transactions" className="underline underline-offset-4">Back to transactions</Link>
          </>
        }
      />
      <div className="max-w-xl">
        <ImportFlow />
      </div>
    </>
  );
}
