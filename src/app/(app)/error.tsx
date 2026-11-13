"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Empty className="mx-auto mt-16 max-w-sm border">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="text-money-out">
          <AlertTriangle aria-hidden />
        </EmptyMedia>
        <EmptyTitle>
          <h1 className="text-lg font-semibold">Something went wrong</h1>
        </EmptyTitle>
        <EmptyDescription className="text-xs break-words">{error.message || "Unexpected error."}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button onClick={reset}>Retry</Button>
      </EmptyContent>
    </Empty>
  );
}
