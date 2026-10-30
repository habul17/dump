import Link from "next/link";
import { button } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-3 px-5 py-16 text-center">
      <h1 className="text-xl font-semibold">Nothing here</h1>
      <p className="text-sm text-muted">That idea was deleted, or the link is wrong.</p>
      <Link href="/" className={cn(button.base, button.primary, "mt-2")}>
        Go to your list
      </Link>
    </main>
  );
}
