"use client";

import {
  Archive,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  LoaderCircle,
  Play,
  RotateCcw,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addLogEntry,
  addStep,
  archiveIdea,
  deleteForever,
  deleteLogEntry,
  deleteStep,
  markDone,
  moveToQueue,
  startIdea,
  updateIdea,
  updateStep,
} from "@/app/actions";
import { cleanUrl, daysBetween, formatDate, formatRange, linkedInPost, plural } from "@/lib/format";
import type { Idea, LogEntry, Snapshot, Step } from "@/lib/types";
import { cn } from "@/lib/utils";
import { failed, undoToast } from "./changes";
import { AutoTextarea, ChipInput, field } from "./fields";
import { Button, Confirm } from "./ui";

type Patch = Parameters<typeof updateIdea>[1];
type SaveState = "idle" | "saving" | "saved" | "error";

/** Saves edits a moment after you stop typing, and right away when you leave. */
function useAutosave(ideaId: string) {
  const [state, setState] = useState<SaveState>("idle");
  const pending = useRef<Patch>({});
  const timer = useRef<number>(undefined);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const patch = pending.current;
    pending.current = {};
    if (!Object.keys(patch).length) return;
    try {
      await updateIdea(ideaId, patch);
      if (!Object.keys(pending.current).length) setState("saved");
    } catch {
      pending.current = { ...patch, ...pending.current };
      setState("error");
    }
  }, [ideaId]);

  const save = useCallback(
    (patch: Patch, now = false) => {
      Object.assign(pending.current, patch);
      setState("saving");
      window.clearTimeout(timer.current);
      if (now) flush();
      else timer.current = window.setTimeout(flush, 700);
    },
    [flush],
  );

  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && flush();
    const onLeave = (event: BeforeUnloadEvent) => {
      if (Object.keys(pending.current).length) event.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onLeave);
      flush();
    };
  }, [flush]);

  return { state, save };
}

const BACK = {
  queued: { href: "/", label: "Back" },
  building: { href: "/", label: "Back" },
  done: { href: "/done", label: "Done" },
  archived: { href: "/archive", label: "Archive" },
} as const;

const PILL = { queued: "Up next", building: "Now building", done: "Done", archived: "Archived" } as const;

export function IdeaEditor({ idea, steps, log }: { idea: Idea; steps: Step[]; log: LogEntry[] }) {
  const router = useRouter();
  const { state, save } = useAutosave(idea.id);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description);
  const [techStack, setTechStack] = useState(idea.techStack);
  const [tags, setTags] = useState(idea.tags);
  const [busy, startBusy] = useTransition();

  function change(action: (id: string) => Promise<Snapshot[]>, message: string) {
    startBusy(async () => {
      try {
        undoToast(message, await action(idea.id), idea.title);
      } catch {
        failed();
      }
    });
  }

  const current = { ...idea, title, description, techStack, tags };

  return (
    <div className="flex flex-col gap-7 pt-1">
      <div className="flex items-center justify-between">
        <Link
          href={BACK[idea.status].href}
          className="-ml-2 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium hover:bg-surface"
        >
          <ArrowLeft className="size-4" aria-hidden /> {BACK[idea.status].label}
        </Link>
        <SaveStatus state={state} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
              idea.status === "building" ? "bg-ink text-bg" : "border border-line text-muted",
            )}
          >
            {PILL[idea.status]}
          </span>
          <Dates idea={idea} />
        </div>
        <AutoTextarea
          value={title}
          aria-label="Title"
          placeholder="Untitled"
          maxLength={200}
          onChange={(e) => {
            const next = e.target.value.replace(/\n/g, " ");
            setTitle(next);
            if (next.trim()) save({ title: next });
          }}
          onBlur={() => {
            if (!title.trim()) setTitle(idea.title);
          }}
          onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
          className="-mx-2 rounded-xl bg-transparent px-2 py-1 text-2xl leading-tight font-semibold tracking-tight outline-none hover:bg-surface/60 focus:bg-surface/60"
        />
        <AutoTextarea
          value={description}
          aria-label="Description"
          placeholder="What is it? Who is it for? Why build it?"
          maxLength={20_000}
          onChange={(e) => {
            setDescription(e.target.value);
            save({ description: e.target.value });
          }}
          className={cn(field, "min-h-24 leading-relaxed")}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {idea.status === "queued" && (
          <>
            <Button disabled={busy} onClick={() => change(startIdea, "Started")} className="flex-1 sm:flex-none">
              <Play className="size-4 fill-current" aria-hidden /> Start building
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => change(archiveIdea, "Archived")} className="flex-1 sm:flex-none">
              <Archive className="size-4" aria-hidden /> Archive
            </Button>
          </>
        )}
        {idea.status === "building" && (
          <>
            <Button disabled={busy} onClick={() => change(markDone, "Moved to Done")} className="flex-1 sm:flex-none">
              <Check className="size-4" aria-hidden /> Mark as done
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => change(archiveIdea, "Archived")} className="flex-1 sm:flex-none">
              <Archive className="size-4" aria-hidden /> Archive
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => change(moveToQueue, "Back in Up next")} className="w-full sm:w-auto">
              <Undo2 className="size-4" aria-hidden /> Back to Up next
            </Button>
          </>
        )}
        {idea.status === "done" && (
          <>
            <Button variant="secondary" disabled={busy} onClick={() => change(moveToQueue, "Back in Up next")} className="flex-1 sm:flex-none">
              <RotateCcw className="size-4" aria-hidden /> Reopen
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => change(archiveIdea, "Archived")} className="flex-1 sm:flex-none">
              <Archive className="size-4" aria-hidden /> Archive
            </Button>
          </>
        )}
        {idea.status === "archived" && (
          <>
            <Button disabled={busy} onClick={() => change(moveToQueue, "Restored to Up next")} className="flex-1 sm:flex-none">
              <RotateCcw className="size-4" aria-hidden /> Restore
            </Button>
            <Confirm
              trigger={
                <Button variant="secondary" disabled={busy} className="flex-1 text-danger sm:flex-none">
                  <Trash2 className="size-4" aria-hidden /> Delete forever
                </Button>
              }
              title="Delete this idea for good?"
              description={`“${idea.title}” and its steps and build log will be gone. This can't be undone.`}
              action="Delete forever"
              onConfirm={() =>
                startBusy(async () => {
                  try {
                    await deleteForever(idea.id);
                    toast("Deleted for good", { description: idea.title });
                    router.replace("/archive");
                  } catch {
                    failed();
                  }
                })
              }
            />
          </>
        )}
      </div>

      <Section title="Tech stack">
        <ChipInput
          label="Tech stack"
          placeholder="Next.js, Postgres… press Enter after each"
          value={techStack}
          onChange={(next) => {
            setTechStack(next);
            save({ techStack: next }, true);
          }}
        />
      </Section>

      <Section title="Links">
        <div className="flex flex-col gap-2">
          <LinkField label="GitHub repo" placeholder="github.com/you/project" initial={idea.repoUrl} onSave={(v) => save({ repoUrl: v }, true)} />
          <LinkField label="Live site" placeholder="project.example.com" initial={idea.liveUrl} onSave={(v) => save({ liveUrl: v }, true)} />
        </div>
      </Section>

      <Steps ideaId={idea.id} initial={steps} />

      <Section title="Tags">
        <ChipInput
          label="Tags"
          placeholder="AI, portfolio, learning… press Enter after each"
          value={tags}
          onChange={(next) => {
            setTags(next);
            save({ tags: next }, true);
          }}
        />
      </Section>

      <BuildLog idea={current} initial={log} />
    </div>
  );
}

function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span role="status" className={cn("inline-flex items-center gap-1.5 text-sm", state === "error" ? "text-danger" : "text-muted")}>
      {state === "saving" && <LoaderCircle className="size-3.5 animate-spin" aria-hidden />}
      {state === "saved" && <Check className="size-3.5" aria-hidden />}
      {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Not saved. Check your connection."}
    </span>
  );
}

function Dates({ idea }: { idea: Idea }) {
  const now = new Date();
  let text = `Added ${formatDate(idea.createdAt)}`;
  if (idea.status === "building" && idea.startedAt) {
    text = `Started ${formatDate(idea.startedAt)} · day ${daysBetween(idea.startedAt, now)}`;
  } else if (idea.status === "done" && idea.finishedAt) {
    const from = idea.startedAt ?? idea.finishedAt;
    text = `${formatRange(from, idea.finishedAt)} · ${plural(daysBetween(from, idea.finishedAt), "day")}`;
  } else if (idea.status === "archived" && idea.archivedAt) {
    text = `Archived ${formatDate(idea.archivedAt)}`;
  }
  return <span className="font-mono text-xs text-muted">{text}</span>;
}

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="label flex items-baseline justify-between">
        <span>{title}</span>
        {aside}
      </h2>
      {children}
    </section>
  );
}

function LinkField({
  label,
  placeholder,
  initial,
  onSave,
}: {
  label: string;
  placeholder: string;
  initial: string | null;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initial ?? "");
  const [saved, setSaved] = useState(initial ?? "");
  const url = cleanUrl(value);
  const invalid = value.trim() !== "" && !url;

  function commit() {
    if (invalid || value.trim() === saved.trim()) return;
    setSaved(value);
    onSave(value);
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <label className={cn(field, "flex min-w-0 flex-1 items-center gap-3 py-0 focus-within:border-ink", invalid && "border-danger focus-within:border-danger")}>
          <span className="w-20 shrink-0 text-sm text-muted sm:w-24">{label}</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            placeholder={placeholder}
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-invalid={invalid}
            className="min-w-0 flex-1 bg-transparent py-2.5 outline-none"
          />
        </label>
        {url && !invalid && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open ${label}`}
            className="grid size-11 shrink-0 place-items-center rounded-xl border border-line text-muted hover:text-ink"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>
      {invalid && <p className="mt-1 text-xs text-danger">That doesn&apos;t look like a link.</p>}
    </div>
  );
}

function Steps({ ideaId, initial }: { ideaId: string; initial: Step[] }) {
  const [steps, setSteps] = useState(initial);
  const [draft, setDraft] = useState("");
  const done = steps.filter((s) => s.done).length;

  async function add() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    const temp = { id: `temp-${Date.now()}`, ideaId, text, done: false, position: steps.length, createdAt: new Date() };
    setSteps((all) => [...all, temp]);
    try {
      const step = await addStep(ideaId, text);
      setSteps((all) => all.map((s) => (s.id === temp.id ? step : s)));
    } catch {
      setSteps((all) => all.filter((s) => s.id !== temp.id));
      setDraft(text);
      failed();
    }
  }

  function toggle(step: Step) {
    setSteps((all) => all.map((s) => (s.id === step.id ? { ...s, done: !s.done } : s)));
    updateStep(step.id, { done: !step.done }).catch(() => {
      setSteps((all) => all.map((s) => (s.id === step.id ? step : s)));
      failed();
    });
  }

  function rename(step: Step, text: string) {
    if (!text.trim() || text.trim() === step.text) return;
    setSteps((all) => all.map((s) => (s.id === step.id ? { ...s, text: text.trim() } : s)));
    updateStep(step.id, { text }).catch(failed);
  }

  function remove(step: Step) {
    setSteps((all) => all.filter((s) => s.id !== step.id));
    deleteStep(step.id).catch(() => {
      setSteps((all) => [...all, step].sort((a, b) => a.position - b.position));
      failed();
    });
  }

  return (
    <Section title="Steps" aside={steps.length > 0 && <span className="font-mono normal-case tracking-normal">{done} of {steps.length}</span>}>
      {steps.length > 0 && (
        <ul className="flex flex-col">
          {steps.map((step) => {
            const pending = step.id.startsWith("temp-");
            return (
              <li key={step.id} className="group flex items-center gap-2.5">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={step.done}
                  aria-label={step.text}
                  disabled={pending}
                  onClick={() => toggle(step)}
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border-[1.5px] transition-colors",
                    step.done ? "border-ink bg-ink text-bg" : "border-line hover:border-muted",
                  )}
                >
                  {step.done && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                </button>
                <input
                  defaultValue={step.text}
                  aria-label="Step"
                  disabled={pending}
                  maxLength={500}
                  onBlur={(e) => rename(step, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  className={cn(
                    "min-w-0 flex-1 rounded-md bg-transparent py-2 text-[15px] outline-none focus:bg-surface/60 focus:px-2",
                    step.done && "text-muted line-through",
                  )}
                />
                <button
                  type="button"
                  aria-label={`Delete step: ${step.text}`}
                  disabled={pending}
                  onClick={() => remove(step)}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted opacity-60 hover:bg-surface hover:text-ink hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex items-center gap-2.5"
      >
        <span className="size-5 shrink-0 rounded-md border-[1.5px] border-dashed border-line" aria-hidden />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a step"
          aria-label="New step"
          maxLength={500}
          enterKeyHint="enter"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none"
        />
      </form>
    </Section>
  );
}

function BuildLog({ idea, initial }: { idea: Idea; initial: LogEntry[] }) {
  const [log, setLog] = useState(initial);
  const [draft, setDraft] = useState("");

  async function add() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    const temp = { id: `temp-${Date.now()}`, ideaId: idea.id, body, createdAt: new Date() };
    setLog((all) => [temp, ...all]);
    try {
      const entry = await addLogEntry(idea.id, body);
      setLog((all) => all.map((l) => (l.id === temp.id ? entry : l)));
    } catch {
      setLog((all) => all.filter((l) => l.id !== temp.id));
      setDraft(body);
      failed();
    }
  }

  function remove(entry: LogEntry) {
    setLog((all) => all.filter((l) => l.id !== entry.id));
    deleteLogEntry(entry.id).catch(() => {
      setLog((all) => [...all, entry].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)));
      failed();
    });
  }

  async function copy() {
    const post = linkedInPost(idea, log.filter((l) => !l.id.startsWith("temp-")));
    try {
      await navigator.clipboard.writeText(post);
      toast.success("Copied", { description: "Paste it into a new LinkedIn post and edit it to sound like you." });
    } catch {
      toast.error("Couldn't copy. Your browser blocked it.");
    }
  }

  return (
    <Section title="Build log">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What did you get done today?"
          aria-label="New build log entry"
          maxLength={2000}
          enterKeyHint="send"
          className={field}
        />
        <Button type="submit" variant="secondary" disabled={!draft.trim()} className="shrink-0">
          Add
        </Button>
      </form>
      {log.length > 0 && (
        <ul className="flex flex-col">
          {log.map((entry) => (
            <li key={entry.id} className="group flex items-start gap-3 py-1.5">
              <span className="w-14 shrink-0 pt-0.5 font-mono text-xs text-muted">{formatDate(entry.createdAt)}</span>
              <span className="min-w-0 flex-1 text-[15px] break-words">{entry.body}</span>
              <button
                type="button"
                aria-label="Delete entry"
                onClick={() => remove(entry)}
                disabled={entry.id.startsWith("temp-")}
                className="-mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-muted opacity-60 hover:bg-surface hover:text-ink hover:opacity-100 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" onClick={copy} className="mt-1 w-full">
        <Copy className="size-4" aria-hidden /> Copy as LinkedIn post
      </Button>
      <p className="text-center text-xs text-muted">
        Uses the title, description, stack, links, tags and this log.
      </p>
    </Section>
  );
}
