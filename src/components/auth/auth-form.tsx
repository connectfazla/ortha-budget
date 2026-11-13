"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signInDemo, signUp } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";

/** Only same-site paths are allowed as a post-login destination (no open redirects). */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

/** Email + password form for both sign-in and sign-up ([MERC-LOGIN]). */
export function AuthForm({ mode }: { mode: "sign-in" | "sign-up" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const isUp = mode === "sign-up";

  function submit(form: FormData) {
    setError(null);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    start(async () => {
      const r = isUp ? await signUp(email, password) : await signIn(email, password);
      if (!r.ok) return setError(r.error);
      if (isUp && "needsConfirmation" in r && r.needsConfirmation) {
        return setNotice("Check your inbox and open the link to finish creating your account.");
      }
      router.replace(safeNext(params.get("next")));
      router.refresh();
    });
  }

  if (notice) {
    return <p className="text-muted-foreground text-sm" role="status">{notice}</p>;
  }

  return (
    <form action={submit} noValidate>
      <FieldGroup>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required autoFocus className="h-11" />
        </Field>
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="password">Password</FieldLabel>
          <InputGroup className="h-11">
            <InputGroupInput
              id="password"
              name="password"
              type={show ? "text" : "password"}
              autoComplete={isUp ? "new-password" : "current-password"}
              minLength={isUp ? 8 : undefined}
              required
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)}>
                {show ? <EyeOff /> : <Eye />}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {isUp ? <FieldDescription>At least 8 characters.</FieldDescription> : null}
          {error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <Button type="submit" className="press h-11 w-full" disabled={pending}>
          {pending ? <Spinner /> : null}
          {isUp ? "Create account" : "Sign in"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="press h-11 w-full"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const r = await signInDemo();
              if (!r.ok) return setError(r.error);
              router.replace("/");
              router.refresh();
            })
          }
        >
          Try the demo
        </Button>
        <p className="text-muted-foreground -mt-2 text-center text-xs">Shared sample account. It resets every 6 hours.</p>
        <p className="text-muted-foreground text-center text-sm">
          {isUp ? "Already have an account? " : "New here? "}
          <Link href={isUp ? "/sign-in" : "/sign-up"} className="text-foreground font-medium underline-offset-4 hover:underline">
            {isUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </FieldGroup>
    </form>
  );
}
