"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToParentElement, restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Archive,
  ArrowUp,
  Check,
  ChevronRight,
  CircleCheck,
  Ellipsis,
  GripVertical,
  Play,
  Plus,
  Search,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useOptimistic, useRef, useState } from "react";
import {
  archiveIdea,
  createIdea,
  markDone,
  moveToQueue,
  moveToTop,
  reorderQueue,
  startIdea,
} from "@/app/actions";
import { daysBetween, formatDate } from "@/lib/format";
import type { IdeaStatus, ListIdea, Snapshot } from "@/lib/types";
import { cn, isNew } from "@/lib/utils";
import { failed, undoToast } from "./changes";
import { Chip, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./ui";

type Change =
  | { type: "add"; idea: ListIdea }
  | { type: "status"; id: string; status: IdeaStatus }
  | { type: "reorder"; ids: string[] }
  | { type: "top"; id: string };

const byPosition = (a: ListIdea, b: ListIdea) =>
  a.position - b.position || +new Date(a.createdAt) - +new Date(b.createdAt);

function apply(ideas: ListIdea[], change: Change): ListIdea[] {
  const queued = ideas.filter((i) => i.status === "queued");
  const top = Math.min(1, ...queued.map((i) => i.position)) - 1;
  switch (change.type) {
    case "add":
      return [...ideas, change.idea];
    case "reorder":
      return ideas.map((i) =>
        change.ids.includes(i.id) ? { ...i, position: change.ids.indexOf(i.id) } : i,
      );
    case "top":
      return ideas.map((i) => (i.id === change.id ? { ...i, position: top } : i));
    case "status": {
      const now = new Date();
      return ideas.map((i) => {
        if (i.id === change.id) {
          return {
            ...i,
            status: change.status,
            startedAt: change.status === "building" ? (i.startedAt ?? now) : i.startedAt,
            finishedAt: change.status === "done" ? now : null,
            position: change.status === "queued" ? top : i.position,
          };
        }
        // Starting something sends the current project back to the top of Up next.
        if (change.status === "building" && i.status === "building") {
          return { ...i, status: "queued", position: top };
        }
        return i;
      });
    }
  }
}

/** Moves focus to the next or previous row in the list. */
function moveFocus(step: 1 | -1) {
  const rows = [...document.querySelectorAll<HTMLElement>("[data-nav]")];
  if (!rows.length) return;
  const at = rows.indexOf(document.activeElement as HTMLElement);
  const next = at === -1 ? (step === 1 ? 0 : rows.length - 1) : at + step;
  rows[Math.max(0, Math.min(rows.length - 1, next))]?.focus();
}

export function Board({ ideas: saved }: { ideas: ListIdea[] }) {
  const router = useRouter();
  const [ideas, change] = useOptimistic(saved, apply);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    // Drag starts only from the handle, after a small move, so taps and scrolling still work.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const building = ideas.find((i) => i.status === "building");
  const queue = ideas.filter((i) => i.status === "queued").sort(byPosition);
  const doneCount = ideas.filter((i) => i.status === "done").length;
  const archivedCount = ideas.filter((i) => i.status === "archived").length;

  const tags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const idea of saved) for (const t of idea.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  }, [saved]);

  const filtering = query.trim() !== "" || tag !== null;
  const results = useMemo(() => {
    if (!filtering) return [];
    const q = query.trim().toLowerCase();
    return ideas
      .filter((i) => !tag || i.tags.includes(tag))
      .filter(
        (i) =>
          !q ||
          [i.title, i.description, ...i.tags, ...i.techStack].some((text) =>
            text.toLowerCase().includes(q),
          ),
      )
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || byPosition(a, b));
  }, [filtering, ideas, query, tag]);

  // Keyboard shortcuts: N adds, / searches, arrows move, Enter opens, Esc leaves a box.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable], [role=menu], [role=dialog]")) {
        if (event.key === "Escape" && target instanceof HTMLInputElement) {
          if (target === searchRef.current) setQuery("");
          target.blur();
        }
        return;
      }
      if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        addRef.current?.focus();
      } else if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        moveFocus(1);
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        moveFocus(-1);
      } else if (event.key === "Escape" && filtering) {
        setQuery("");
        setTag(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtering]);

  function run(optimistic: Change, action: () => Promise<Snapshot[]>, message: string, description?: string) {
    startTransition(async () => {
      change(optimistic);
      try {
        undoToast(message, await action(), description);
      } catch {
        failed();
      }
    });
  }

  const actions: RowActions = {
    start(idea) {
      run(
        { type: "status", id: idea.id, status: "building" },
        () => startIdea(idea.id),
        `Started ${idea.title}`,
        building && building.id !== idea.id ? `${building.title} went back to Up next.` : undefined,
      );
    },
    done(idea) {
      run({ type: "status", id: idea.id, status: "done" }, () => markDone(idea.id), "Moved to Done", idea.title);
    },
    pause(idea) {
      run({ type: "status", id: idea.id, status: "queued" }, () => moveToQueue(idea.id), "Back in Up next", idea.title);
    },
    archive(idea) {
      run({ type: "status", id: idea.id, status: "archived" }, () => archiveIdea(idea.id), "Archived", idea.title);
    },
    top(idea) {
      startTransition(async () => {
        change({ type: "top", id: idea.id });
        await moveToTop(idea.id).catch(failed);
      });
    },
    open(idea) {
      router.push(`/ideas/${idea.id}`);
    },
  };

  function add(title: string) {
    const now = new Date();
    startTransition(async () => {
      change({
        type: "add",
        idea: {
          id: `temp-${now.getTime()}`,
          userId: "",
          title,
          description: "",
          techStack: [],
          tags: [],
          repoUrl: null,
          liveUrl: null,
          status: "queued",
          position: Math.max(-1, ...queue.map((i) => i.position)) + 1,
          startedAt: null,
          finishedAt: null,
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
          stepsDone: 0,
          stepsTotal: 0,
        },
      });
      try {
        await createIdea(title);
      } catch {
        failed();
      }
    });
  }

  function reorder({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const ids = queue.map((i) => i.id);
    const next = arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
    startTransition(async () => {
      change({ type: "reorder", ids: next });
      await reorderQueue(next).catch(failed);
    });
  }

  return (
    <div className="flex flex-col gap-5 pt-1">
      <AddIdea inputRef={addRef} onAdd={add} />

      {saved.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2.5 rounded-xl bg-surface px-3.5 text-muted focus-within:text-ink">
            <Search className="size-4 shrink-0" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ideas…"
              aria-label="Search ideas"
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[15px] text-ink outline-none [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="-mr-1 rounded-md p-1 hover:text-ink">
                <X className="size-4" aria-hidden />
              </button>
            )}
          </label>
          {tags.length > 0 && (
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
              <TagButton active={tag === null} onClick={() => setTag(null)}>
                All
              </TagButton>
              {tags.map((t) => (
                <TagButton key={t} active={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                  {t}
                </TagButton>
              ))}
            </div>
          )}
        </div>
      )}

      {filtering ? (
        <Results ideas={results} queue={queue} />
      ) : (
        <>
          <section aria-labelledby="now-heading">
            <h2 id="now-heading" className="label mb-2">
              Now building
            </h2>
            {building ? (
              <NowCard idea={building} actions={actions} />
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-center text-sm text-muted">
                {queue.length
                  ? "Nothing in progress. Pick an idea below and tap Start."
                  : "Nothing in progress yet."}
              </p>
            )}
          </section>

          <section aria-labelledby="next-heading">
            <h2 id="next-heading" className="label mb-2 flex justify-between">
              <span>Up next</span>
              {queue.length > 0 && <span className="font-mono normal-case tracking-normal">{queue.length}</span>}
            </h2>
            {queue.length ? (
              <DndContext
                id="up-next"
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
                onDragEnd={reorder}
              >
                <SortableContext items={queue.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <ol className="rounded-2xl border border-line">
                    {queue.map((idea, index) => (
                      <QueueRow key={idea.id} idea={idea} number={index + 1} actions={actions} />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            ) : (
              <p className="rounded-2xl border border-dashed border-line px-5 py-6 text-center text-sm text-muted">
                {saved.length ? "No ideas waiting." : "Your list is empty. Dump your first idea above."}
              </p>
            )}
          </section>

          <nav className="grid gap-2 sm:grid-cols-2" aria-label="Finished and archived ideas">
            <Pile href="/done" icon={<CircleCheck aria-hidden />} label="Done" count={doneCount} />
            <Pile href="/archive" icon={<Archive aria-hidden />} label="Archive" count={archivedCount} />
          </nav>

          <p className="hidden text-center text-xs text-muted sm:block">
            <Kbd>N</Kbd> new idea · <Kbd>/</Kbd> search · <Kbd>↑</Kbd> <Kbd>↓</Kbd> move · <Kbd>Enter</Kbd> open
          </p>
        </>
      )}
    </div>
  );
}

const ORDER: Record<IdeaStatus, number> = { building: 0, queued: 1, done: 2, archived: 3 };

type RowActions = Record<"start" | "done" | "pause" | "archive" | "top" | "open", (idea: ListIdea) => void>;

function AddIdea({ inputRef, onAdd }: { inputRef: React.RefObject<HTMLInputElement | null>; onAdd: (title: string) => void }) {
  const [title, setTitle] = useState("");
  return (
    <form
      className="flex items-center gap-2 rounded-2xl border border-line py-1.5 pr-1.5 pl-3.5 transition-colors focus-within:border-ink"
      onSubmit={(e) => {
        e.preventDefault();
        const clean = title.trim();
        if (!clean) return;
        onAdd(clean);
        setTitle("");
      }}
    >
      <Plus className="size-4 shrink-0 text-muted" aria-hidden />
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Dump an idea…"
        aria-label="New idea"
        maxLength={200}
        enterKeyHint="done"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] outline-none"
      />
      <button
        type="submit"
        disabled={!title.trim()}
        className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-bg transition-opacity disabled:opacity-40"
      >
        Add
      </button>
    </form>
  );
}

function TagButton({ active, ...props }: React.ComponentProps<"button"> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap transition-colors",
        active ? "border-ink bg-ink text-bg" : "border-line text-muted hover:text-ink",
      )}
      {...props}
    />
  );
}

function NowCard({ idea, actions }: { idea: ListIdea; actions: RowActions }) {
  const pending = idea.id.startsWith("temp-");
  const day = idea.startedAt ? daysBetween(idea.startedAt, new Date()) : 1;
  return (
    <article className="relative flex flex-col gap-3 rounded-2xl border border-soft-line bg-soft p-4">
      <div className="flex items-start gap-2.5 pr-9">
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-ink text-bg">
          <Play className="size-2.5 fill-current" aria-hidden />
        </span>
        <Link
          href={`/ideas/${idea.id}`}
          data-nav
          className="rounded-md text-[17px] leading-snug font-semibold after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink"
        >
          {idea.title}
        </Link>
      </div>
      {idea.description && <p className="line-clamp-2 text-sm text-muted">{idea.description}</p>}
      {idea.stepsTotal > 0 && (
        <div className="flex items-center gap-3 font-mono text-xs text-muted">
          <div
            className="h-1 flex-1 overflow-hidden rounded-full bg-soft-line"
            role="progressbar"
            aria-label="Steps done"
            aria-valuenow={idea.stepsDone}
            aria-valuemax={idea.stepsTotal}
          >
            <div className="h-full rounded-full bg-ink transition-[width]" style={{ width: `${(idea.stepsDone / idea.stepsTotal) * 100}%` }} />
          </div>
          {idea.stepsDone}/{idea.stepsTotal}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        {idea.techStack.slice(0, 4).map((t) => (
          <Chip key={t}>{t}</Chip>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-muted">
          Day {day}
          {idea.startedAt && ` · started ${formatDate(idea.startedAt)}`}
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => actions.done(idea)}
          className="relative z-10 inline-flex items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 text-xs font-semibold text-bg hover:opacity-90"
        >
          <Check className="size-3.5" aria-hidden /> Mark as done
        </button>
      </div>
      <div className="absolute top-2.5 right-2.5 z-10">
        <Menu>
          <MenuTrigger asChild>
            <IconButton aria-label={`More for ${idea.title}`} disabled={pending}>
              <Ellipsis className="size-[18px]" aria-hidden />
            </IconButton>
          </MenuTrigger>
          <MenuContent>
            <MenuItem onSelect={() => actions.done(idea)}>
              <CircleCheck /> Mark as done
            </MenuItem>
            <MenuItem onSelect={() => actions.pause(idea)}>
              <Undo2 /> Back to Up next
            </MenuItem>
            <MenuSeparator />
            <MenuItem onSelect={() => actions.archive(idea)}>
              <Archive /> Archive
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
    </article>
  );
}

function QueueRow({ idea, number, actions }: { idea: ListIdea; number: number; actions: RowActions }) {
  const pending = idea.id.startsWith("temp-");
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: idea.id, disabled: pending });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-1 border-t border-line bg-bg py-1 pr-1 pl-1 first:rounded-t-2xl first:border-t-0 last:rounded-b-2xl",
        isDragging && "z-10 rounded-2xl! border-transparent shadow-lg ring-1 ring-line",
        pending && "opacity-60",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${idea.title}`}
        className="grid h-9 w-7 shrink-0 cursor-grab touch-none place-items-center rounded-lg text-muted/70 hover:text-ink active:cursor-grabbing"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <span className="w-6 shrink-0 font-mono text-xs text-muted tabular-nums">{number}</span>
      {pending ? (
        <span className="min-w-0 flex-1 truncate py-2 text-[15px]">{idea.title}</span>
      ) : (
        <Link href={`/ideas/${idea.id}`} data-nav className="min-w-0 flex-1 truncate rounded-md py-2 text-[15px]">
          {idea.title}
        </Link>
      )}
      {isNew(idea.createdAt) ? (
        <span className="shrink-0 px-1 text-xs font-semibold">new</span>
      ) : (
        idea.tags[0] && <span className="hidden max-w-24 shrink-0 truncate px-1 text-xs text-muted sm:inline">{idea.tags[0]}</span>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => actions.start(idea)}
        className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-full border border-line px-2.5 py-1 text-xs font-semibold transition-colors hover:border-ink hover:bg-ink hover:text-bg"
      >
        <Play className="size-3 fill-current" aria-hidden /> Start
      </button>
      <Menu>
        <MenuTrigger asChild>
          <IconButton aria-label={`More for ${idea.title}`} disabled={pending}>
            <Ellipsis className="size-[18px]" aria-hidden />
          </IconButton>
        </MenuTrigger>
        <MenuContent>
          <MenuItem onSelect={() => actions.start(idea)}>
            <Play /> Start building
          </MenuItem>
          {number > 1 && (
            <MenuItem onSelect={() => actions.top(idea)}>
              <ArrowUp /> Move to top
            </MenuItem>
          )}
          <MenuItem onSelect={() => actions.open(idea)}>
            <ChevronRight /> Open
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => actions.archive(idea)}>
            <Archive /> Archive
          </MenuItem>
        </MenuContent>
      </Menu>
    </li>
  );
}

const STATUS_LABEL: Record<IdeaStatus, string> = {
  building: "Now building",
  queued: "Up next",
  done: "Done",
  archived: "Archive",
};

function Results({ ideas, queue }: { ideas: ListIdea[]; queue: ListIdea[] }) {
  if (!ideas.length) {
    return <p className="py-10 text-center text-sm text-muted">No ideas match.</p>;
  }
  return (
    <section aria-label="Search results">
      <h2 className="label mb-2">
        {ideas.length} {ideas.length === 1 ? "match" : "matches"}
      </h2>
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {ideas.map((idea) => {
          const place = queue.indexOf(idea) + 1;
          return (
            <li key={idea.id}>
              <Link
                href={`/ideas/${idea.id}`}
                data-nav
                className="flex items-center gap-3 rounded-2xl px-3.5 py-3 hover:bg-surface/60"
              >
                <span className="min-w-0 flex-1 truncate text-[15px]">{idea.title}</span>
                <span className="shrink-0 text-xs text-muted">
                  {STATUS_LABEL[idea.status]}
                  {place > 0 && ` · ${place}`}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Pile({ href, icon, label, count }: { href: string; icon: React.ReactNode; label: string; count: number }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-xl bg-surface px-3.5 py-3 text-sm text-muted transition-colors hover:text-ink [&_svg]:size-4"
    >
      <span className="flex items-center gap-2">
        {icon} {label} · {count}
      </span>
      <ChevronRight aria-hidden />
    </Link>
  );
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid min-w-5 place-items-center rounded-md border border-line bg-surface px-1.5 py-px font-mono text-[11px] text-ink">
      {children}
    </kbd>
  );
}
