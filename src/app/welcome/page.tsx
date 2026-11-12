import type { Metadata } from "next";
import { Welcome } from "@/components/landing/welcome";

export const metadata: Metadata = {
  title: { absolute: "Ortha Budget, a pocket ledger for your agency" },
  description:
    "Track subscriptions, lifetime deals, contractor pay and profit per client in any currency. Private by design, open source and self-hostable.",
};

export default function WelcomePage() {
  return <Welcome />;
}
