import type { Idea, LogEntry, Step } from "./types";

// Dates are shown in one fixed time zone, so the server and the browser agree.
export const TIME_ZONE = process.env.NEXT_PUBLIC_TIME_ZONE || "Asia/Kolkata";

const dayMonth = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});
const dayMonthYear = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});
const isoDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const sameYear = (a: Date, b: Date) =>
  isoDay.format(a).slice(0, 4) === isoDay.format(b).slice(0, 4);

/** "30 Oct", or "30 Oct 2025" when it isn't this year. */
export function formatDate(date: Date, now = new Date()) {
  return sameYear(date, now) ? dayMonth.format(date) : dayMonthYear.format(date);
}

/** "3–15 Oct", "28 Sep – 4 Oct". */
export function formatRange(from: Date, to: Date) {
  const [a, b] = [dayMonth.formatToParts(from), dayMonth.formatToParts(to)];
  const part = (parts: Intl.DateTimeFormatPart[], type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  if (part(a, "month") === part(b, "month") && sameYear(from, to)) {
    return part(a, "day") === part(b, "day")
      ? formatDate(to)
      : `${part(a, "day")}–${formatDate(to)}`;
  }
  return `${formatDate(from, to)} – ${formatDate(to)}`;
}

/** Whole calendar days between two dates, at least 1. */
export function daysBetween(from: Date, to: Date) {
  const utc = (d: Date) => Date.parse(`${isoDay.format(d)}T00:00:00Z`);
  return Math.max(1, Math.round((utc(to) - utc(from)) / 86_400_000));
}

export const plural = (n: number, word: string) =>
  `${n} ${word}${n === 1 ? "" : "s"}`;

export const todayIso = () => isoDay.format(new Date());

/** Only http and https links are allowed. Adds https:// when it's missing. */
export function cleanUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

/** A LinkedIn post draft built from an idea and its build log. */
export function linkedInPost(idea: Idea, log: LogEntry[]) {
  const finished = idea.status === "done" && idea.finishedAt;
  const lines: string[] = [
    finished ? `I just finished building ${idea.title}.` : `I'm building ${idea.title}.`,
  ];
  if (idea.description.trim()) lines.push("", idea.description.trim());
  if (idea.techStack.length) lines.push("", `Built with ${idea.techStack.join(", ")}.`);
  if (finished && idea.startedAt) {
    lines.push(`It took ${plural(daysBetween(idea.startedAt, idea.finishedAt!), "day")}.`);
  }
  if (log.length) {
    lines.push("", "How it went:");
    for (const entry of [...log].reverse()) {
      lines.push(`• ${formatDate(entry.createdAt)}: ${entry.body}`);
    }
  }
  const links = [
    idea.repoUrl && `Code: ${idea.repoUrl}`,
    idea.liveUrl && `Try it: ${idea.liveUrl}`,
  ].filter(Boolean) as string[];
  if (links.length) lines.push("", ...links);
  const tags = ["buildinpublic", "learninpublic", ...idea.tags]
    .map((t) => t.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
  lines.push("", [...new Set(tags)].map((t) => `#${t}`).join(" "));
  return lines.join("\n");
}

type FullIdea = Idea & { steps: Step[]; log: LogEntry[] };

const SECTIONS = [
  ["building", "Now building"],
  ["queued", "Up next"],
  ["done", "Done"],
  ["archived", "Archive"],
] as const;

/** All ideas as one readable Markdown file. */
export function toMarkdown(all: FullIdea[]) {
  const out = [`# Dump backup, ${todayIso()}`];
  for (const [status, heading] of SECTIONS) {
    const group = all.filter((i) => i.status === status);
    if (!group.length) continue;
    out.push("", `## ${heading}`);
    for (const idea of group) {
      out.push("", `### ${idea.title}`);
      if (idea.description.trim()) out.push("", idea.description.trim());
      const facts = [
        idea.techStack.length && `- Tech stack: ${idea.techStack.join(", ")}`,
        idea.tags.length && `- Tags: ${idea.tags.join(", ")}`,
        idea.repoUrl && `- Repo: ${idea.repoUrl}`,
        idea.liveUrl && `- Live: ${idea.liveUrl}`,
        idea.startedAt && `- Started: ${formatDate(idea.startedAt)}`,
        idea.finishedAt && `- Finished: ${formatDate(idea.finishedAt)}`,
      ].filter(Boolean) as string[];
      if (facts.length) out.push("", ...facts);
      if (idea.steps.length) {
        out.push("", ...idea.steps.map((s) => `- [${s.done ? "x" : " "}] ${s.text}`));
      }
      if (idea.log.length) {
        out.push("", ...idea.log.map((l) => `- ${formatDate(l.createdAt)}: ${l.body}`));
      }
    }
  }
  return out.join("\n") + "\n";
}
