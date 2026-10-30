import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { PageTitle } from "@/components/page-title";
import { daysBetween, formatRange, plural } from "@/lib/format";
import { listIdeas } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Done" };

export default async function DonePage() {
  const user = await requireUser();
  const done = (await listIdeas(user.id))
    .filter((i) => i.status === "done")
    .map((i) => {
      const finished = i.finishedAt ?? i.updatedAt;
      const started = i.startedAt ?? finished;
      return { ...i, finished, started, days: daysBetween(started, finished) };
    })
    .sort((a, b) => +b.finished - +a.finished);
  const totalDays = done.reduce((sum, i) => sum + i.days, 0);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Done" count={done.length}>
        {done.length > 0 && (
          <p className="text-sm text-muted">
            {plural(done.length, "project")} finished, {plural(totalDays, "day")} of building.
          </p>
        )}
      </PageTitle>
      {done.length ? (
        <ul className="divide-y divide-line rounded-2xl border border-line">
          {done.map((idea) => (
            <li key={idea.id}>
              <Link href={`/ideas/${idea.id}`} className="flex items-center gap-3 rounded-2xl px-3.5 py-3 hover:bg-surface/60">
                <CircleCheck className="size-4 shrink-0 text-muted" aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[15px]">{idea.title}</span>
                <span className="hidden shrink-0 font-mono text-xs text-muted sm:inline">
                  {formatRange(idea.started, idea.finished)}
                </span>
                <span className="w-16 shrink-0 text-right font-mono text-xs text-muted">{plural(idea.days, "day")}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
          Nothing finished yet. Your first one will show up here.
        </p>
      )}
    </div>
  );
}
