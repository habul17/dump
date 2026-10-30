"use server";

import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { ideas, logEntries, steps } from "@/db/schema";
import { cleanUrl } from "@/lib/format";
import { requireUser } from "@/lib/session";
import type { Snapshot } from "@/lib/types";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const id = z.uuid();
const title = z.string().trim().min(1, "Give it a title").max(200);
const words = z.array(z.string().trim().min(1).max(40)).max(30);

const refresh = () => revalidatePath("/", "layout");

const snapshotColumns = {
  id: ideas.id,
  status: ideas.status,
  position: ideas.position,
  startedAt: ideas.startedAt,
  finishedAt: ideas.finishedAt,
  archivedAt: ideas.archivedAt,
};

async function snapshot(tx: Tx | typeof db, userId: string, ideaId: string) {
  const [row] = await tx
    .select(snapshotColumns)
    .from(ideas)
    .where(and(eq(ideas.id, ideaId), eq(ideas.userId, userId)));
  if (!row) throw new Error("That idea doesn't exist anymore.");
  return row;
}

/** A position above everything in Up next, or below it. */
async function edgePosition(tx: Tx | typeof db, userId: string, edge: "top" | "bottom") {
  const [row] = await tx
    .select({
      value:
        edge === "top"
          ? sql<number>`coalesce(min(${ideas.position}), 1) - 1`
          : sql<number>`coalesce(max(${ideas.position}), -1) + 1`,
    })
    .from(ideas)
    .where(and(eq(ideas.userId, userId), eq(ideas.status, "queued")));
  return Number(row.value);
}

// ---------- The list ----------

export async function createIdea(input: string) {
  const user = await requireUser();
  const [idea] = await db
    .insert(ideas)
    .values({
      userId: user.id,
      title: title.parse(input),
      position: await edgePosition(db, user.id, "bottom"),
    })
    .returning();
  refresh();
  return idea;
}

/** Saves the Up next order. `ids` is every queued idea, top first. */
export async function reorderQueue(ids: string[]) {
  const user = await requireUser();
  const list = z.array(id).max(1000).parse(ids);
  if (!list.length) return;
  const array = sql`array[${sql.join(list.map((i) => sql`${i}`), sql`, `)}]::uuid[]`;
  await db.execute(sql`
    update ${ideas} set position = v.ord - 1
    from unnest(${array}) with ordinality as v(id, ord)
    where ${ideas.id} = v.id and ${ideas.userId} = ${user.id} and ${ideas.status} = 'queued'`);
  refresh();
}

export async function moveToTop(ideaId: string) {
  const user = await requireUser();
  await db
    .update(ideas)
    .set({ position: await edgePosition(db, user.id, "top") })
    .where(and(eq(ideas.id, id.parse(ideaId)), eq(ideas.userId, user.id), eq(ideas.status, "queued")));
  refresh();
}

/**
 * Moves an idea into Now building. If something else is there, it goes back
 * to the top of Up next.
 */
export async function startIdea(ideaId: string): Promise<Snapshot[]> {
  const user = await requireUser();
  const target = id.parse(ideaId);
  const undo = await db.transaction(async (tx) => {
    const before = [await snapshot(tx, user.id, target)];
    const [current] = await tx
      .select(snapshotColumns)
      .from(ideas)
      .where(and(eq(ideas.userId, user.id), eq(ideas.status, "building")));
    if (current && current.id !== target) {
      before.push(current);
      await tx
        .update(ideas)
        .set({ status: "queued", position: await edgePosition(tx, user.id, "top") })
        .where(eq(ideas.id, current.id));
    }
    await tx
      .update(ideas)
      .set({
        status: "building",
        startedAt: sql`coalesce(${ideas.startedAt}, now())`,
        finishedAt: null,
        archivedAt: null,
      })
      .where(eq(ideas.id, target));
    return before;
  });
  refresh();
  return undo;
}

export async function markDone(ideaId: string): Promise<Snapshot[]> {
  const user = await requireUser();
  const before = await snapshot(db, user.id, id.parse(ideaId));
  await db
    .update(ideas)
    .set({
      status: "done",
      finishedAt: new Date(),
      startedAt: sql`coalesce(${ideas.startedAt}, now())`,
    })
    .where(eq(ideas.id, before.id));
  refresh();
  return [before];
}

export async function archiveIdea(ideaId: string): Promise<Snapshot[]> {
  const user = await requireUser();
  const before = await snapshot(db, user.id, id.parse(ideaId));
  await db
    .update(ideas)
    .set({ status: "archived", archivedAt: new Date() })
    .where(eq(ideas.id, before.id));
  refresh();
  return [before];
}

/** Back to Up next: on top when paused or reopened, at the bottom when restored from the Archive. */
export async function moveToQueue(ideaId: string): Promise<Snapshot[]> {
  const user = await requireUser();
  const before = await snapshot(db, user.id, id.parse(ideaId));
  await db
    .update(ideas)
    .set({
      status: "queued",
      position: await edgePosition(db, user.id, before.status === "archived" ? "bottom" : "top"),
      finishedAt: null,
      archivedAt: null,
    })
    .where(eq(ideas.id, before.id));
  refresh();
  return [before];
}

const snapshotSchema = z.object({
  id,
  status: z.enum(["queued", "building", "done", "archived"]),
  position: z.number().int(),
  startedAt: z.date().nullable(),
  finishedAt: z.date().nullable(),
  archivedAt: z.date().nullable(),
});

export async function undoChange(snapshots: Snapshot[]) {
  const user = await requireUser();
  // The building one goes last, so there's never two in Now building at once.
  const ordered = z.array(snapshotSchema).max(2).parse(snapshots).sort(
    (a, b) => Number(a.status === "building") - Number(b.status === "building"),
  );
  await db.transaction(async (tx) => {
    for (const s of ordered) {
      await tx
        .update(ideas)
        .set({
          status: s.status,
          position: s.position,
          startedAt: s.startedAt,
          finishedAt: s.finishedAt,
          archivedAt: s.archivedAt,
        })
        .where(and(eq(ideas.id, s.id), eq(ideas.userId, user.id)));
    }
  });
  refresh();
}

/** Only ideas in the Archive can be deleted. */
export async function deleteForever(ideaId: string) {
  const user = await requireUser();
  await db
    .delete(ideas)
    .where(and(eq(ideas.id, id.parse(ideaId)), eq(ideas.userId, user.id), eq(ideas.status, "archived")));
  refresh();
}

// ---------- The idea page ----------

const ideaPatch = z
  .object({
    title,
    description: z.string().max(20_000),
    techStack: words,
    tags: words,
    repoUrl: z.string().max(2000),
    liveUrl: z.string().max(2000),
  })
  .partial();

export async function updateIdea(ideaId: string, patch: z.input<typeof ideaPatch>) {
  const user = await requireUser();
  const { repoUrl, liveUrl, ...rest } = ideaPatch.parse(patch);
  const values: Partial<typeof ideas.$inferInsert> = { ...rest };
  if (repoUrl !== undefined) values.repoUrl = cleanUrl(repoUrl);
  if (liveUrl !== undefined) values.liveUrl = cleanUrl(liveUrl);
  if (!Object.keys(values).length) return;
  await db
    .update(ideas)
    .set(values)
    .where(and(eq(ideas.id, id.parse(ideaId)), eq(ideas.userId, user.id)));
  refresh();
}

async function ownIdea(userId: string, ideaId: string) {
  const [row] = await db
    .select({ id: ideas.id })
    .from(ideas)
    .where(and(eq(ideas.id, id.parse(ideaId)), eq(ideas.userId, userId)));
  if (!row) throw new Error("That idea doesn't exist anymore.");
  return row.id;
}

/** The ids of steps (or log entries) that belong to the signed-in user. */
async function ownRows(table: typeof steps | typeof logEntries, userId: string, rowIds: string[]) {
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .innerJoin(ideas, eq(ideas.id, table.ideaId))
    .where(and(inArray(table.id, z.array(id).parse(rowIds)), eq(ideas.userId, userId)));
  return rows.map((r) => r.id);
}

const stepText = z.string().trim().min(1).max(500);

export async function addStep(ideaId: string, text: string) {
  const user = await requireUser();
  const owned = await ownIdea(user.id, ideaId);
  const [step] = await db
    .insert(steps)
    .values({
      ideaId: owned,
      text: stepText.parse(text),
      position: sql`(select coalesce(max(${steps.position}), -1) + 1 from ${steps} where ${steps.ideaId} = ${owned})`,
    })
    .returning();
  refresh();
  return step;
}

export async function updateStep(stepId: string, patch: { text?: string; done?: boolean }) {
  const user = await requireUser();
  const [owned] = await ownRows(steps, user.id, [stepId]);
  if (!owned) return;
  const values = z.object({ text: stepText, done: z.boolean() }).partial().parse(patch);
  await db.update(steps).set(values).where(eq(steps.id, owned));
  refresh();
}

export async function deleteStep(stepId: string) {
  const user = await requireUser();
  const [owned] = await ownRows(steps, user.id, [stepId]);
  if (owned) await db.delete(steps).where(eq(steps.id, owned));
  refresh();
}

export async function addLogEntry(ideaId: string, body: string) {
  const user = await requireUser();
  const owned = await ownIdea(user.id, ideaId);
  const [entry] = await db
    .insert(logEntries)
    .values({ ideaId: owned, body: z.string().trim().min(1).max(2000).parse(body) })
    .returning();
  refresh();
  return entry;
}

export async function deleteLogEntry(entryId: string) {
  const user = await requireUser();
  const [owned] = await ownRows(logEntries, user.id, [entryId]);
  if (owned) await db.delete(logEntries).where(eq(logEntries.id, owned));
  refresh();
}
