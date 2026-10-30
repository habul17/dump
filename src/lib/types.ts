import type { ideas, logEntries, steps } from "@/db/schema";

export type Idea = typeof ideas.$inferSelect;
export type IdeaStatus = Idea["status"];
export type Step = typeof steps.$inferSelect;
export type LogEntry = typeof logEntries.$inferSelect;

/** An idea plus how far along its step checklist is. */
export type ListIdea = Idea & { stepsDone: number; stepsTotal: number };

/** What an idea looked like before a change, so the change can be undone. */
export type Snapshot = Pick<
  Idea,
  "id" | "status" | "position" | "startedAt" | "finishedAt" | "archivedAt"
>;
