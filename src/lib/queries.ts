import { and, asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { db } from "@/db";
import { ideas, logEntries, steps } from "@/db/schema";
import type { ListIdea } from "./types";

/** Every idea, with step progress. Small enough to load in one go. */
export async function listIdeas(userId: string): Promise<ListIdea[]> {
  return db
    .select({
      ...getTableColumns(ideas),
      stepsTotal: sql<number>`count(${steps.id})::int`,
      stepsDone: sql<number>`(count(${steps.id}) filter (where ${steps.done}))::int`,
    })
    .from(ideas)
    .leftJoin(steps, eq(steps.ideaId, ideas.id))
    .where(eq(ideas.userId, userId))
    .groupBy(ideas.id)
    .orderBy(asc(ideas.position), asc(ideas.createdAt));
}

export async function getIdea(userId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [idea] = await db
    .select()
    .from(ideas)
    .where(and(eq(ideas.id, id), eq(ideas.userId, userId)));
  if (!idea) return null;
  const [ideaSteps, log] = await Promise.all([
    db.select().from(steps).where(eq(steps.ideaId, id)).orderBy(asc(steps.position), asc(steps.createdAt)),
    db.select().from(logEntries).where(eq(logEntries.ideaId, id)).orderBy(desc(logEntries.createdAt)),
  ]);
  return { idea, steps: ideaSteps, log };
}

/** Everything, for the backup download. */
export async function exportIdeas(userId: string) {
  const all = await db
    .select()
    .from(ideas)
    .where(eq(ideas.userId, userId))
    .orderBy(asc(ideas.position), asc(ideas.createdAt));
  const ids = all.map((i) => i.id);
  if (!ids.length) return [];
  const idList = sql.join(ids.map((id) => sql`${id}`), sql`, `);
  const [allSteps, allLog] = await Promise.all([
    db.select().from(steps).where(sql`${steps.ideaId} in (${idList})`).orderBy(asc(steps.position)),
    db.select().from(logEntries).where(sql`${logEntries.ideaId} in (${idList})`).orderBy(asc(logEntries.createdAt)),
  ]);
  return all.map((idea) => ({
    ...idea,
    steps: allSteps.filter((s) => s.ideaId === idea.id),
    log: allLog.filter((l) => l.ideaId === idea.id),
  }));
}
