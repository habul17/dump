"use client";

import { RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";
import { deleteForever, moveToQueue } from "@/app/actions";
import { formatDate } from "@/lib/format";
import type { ListIdea } from "@/lib/types";
import { failed, undoToast } from "./changes";
import { Confirm, IconButton } from "./ui";

export function ArchiveList({ ideas: saved }: { ideas: ListIdea[] }) {
  const [ideas, hide] = useOptimistic(saved, (all, id: string) => all.filter((i) => i.id !== id));

  if (!ideas.length) {
    return (
      <p className="rounded-2xl border border-dashed border-line px-5 py-8 text-center text-sm text-muted">
        Nothing archived.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-line rounded-2xl border border-line">
      {ideas.map((idea) => (
        <li key={idea.id} className="flex items-center gap-1 py-1 pr-1.5 pl-3.5">
          <Link href={`/ideas/${idea.id}`} className="min-w-0 flex-1 truncate rounded-md py-2 text-[15px]">
            {idea.title}
          </Link>
          {idea.archivedAt && (
            <span className="hidden shrink-0 px-2 font-mono text-xs text-muted sm:inline">{formatDate(idea.archivedAt)}</span>
          )}
          <IconButton
            aria-label={`Restore ${idea.title}`}
            title="Restore"
            onClick={() =>
              startTransition(async () => {
                hide(idea.id);
                try {
                  undoToast("Restored to Up next", await moveToQueue(idea.id), idea.title);
                } catch {
                  failed();
                }
              })
            }
          >
            <RotateCcw className="size-4" aria-hidden />
          </IconButton>
          <Confirm
            trigger={
              <IconButton aria-label={`Delete ${idea.title} forever`} title="Delete forever" className="hover:text-danger">
                <Trash2 className="size-4" aria-hidden />
              </IconButton>
            }
            title="Delete this idea for good?"
            description={`“${idea.title}” and its steps and build log will be gone. This can't be undone.`}
            action="Delete forever"
            onConfirm={() =>
              startTransition(async () => {
                hide(idea.id);
                try {
                  await deleteForever(idea.id);
                  toast("Deleted for good", { description: idea.title });
                } catch {
                  failed();
                }
              })
            }
          />
        </li>
      ))}
    </ul>
  );
}
