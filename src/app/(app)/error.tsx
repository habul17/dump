"use client";

import Link from "next/link";
import { Button, button } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted">It might be your connection. Your ideas are safe.</p>
      <div className="mt-2 flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link href="/" className={cn(button.base, button.secondary)}>
          Go to your list
        </Link>
      </div>
    </div>
  );
}
