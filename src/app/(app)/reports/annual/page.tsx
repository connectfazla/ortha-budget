import { notFound } from "next/navigation";
import { AnnualReport } from "@/components/annual/annual-report";
import { getAnnual, parseYear } from "@/components/annual/annual-data";
import { requireUser } from "@/lib/data";
import { todayISO } from "@/lib/money";

export const metadata = { title: "Annual summary" };

export default async function AnnualPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireUser();
  const now = todayISO();
  const cy = Number(now.slice(0, 4));
  const { year: raw } = await searchParams;
  const year = raw === undefined ? cy : parseYear(raw, cy);
  if (year === null) notFound();
  const a = await getAnnual(year);
  const generated = new Date(`${now}T00:00:00`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return <AnnualReport a={a} minYear={2000} maxYear={cy + 1} generated={generated} />;
}
