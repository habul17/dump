import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function PageTitle({ title, count, children }: { title: string; count?: number; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 pt-1">
      <Link
        href="/"
        className="-ml-2 inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-surface"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">
        {title}
        {count !== undefined && <span className="ml-2 font-mono text-base font-normal text-muted">{count}</span>}
      </h1>
      {children}
    </div>
  );
}
