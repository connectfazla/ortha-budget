import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Create your account" };

export default function Page() {
  return (
    <AuthShell>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Track subscriptions, contractors and profit per client. Your data stays private to your account.</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense>
            <AuthForm mode="sign-up" />
          </Suspense>
        </CardContent>
      </Card>
    </AuthShell>
  );
}
