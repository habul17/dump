// Creates the one Dump account, or gives it a new password.
//
//   bun run account        the live site (uses .env.live)
//   bun run account:dev    the testing database (uses .env.local)
//
// The password is typed in hidden, and only its hash is stored.

import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { hashPassword } from "better-auth/crypto";
import { and, eq, ne } from "drizzle-orm";
import { db, pool } from "../src/db";
import { account, session, user } from "../src/db/schema";

async function ask(question: string) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim();
}

/** Reads a line without showing what's typed. */
function askHidden(question: string): Promise<string> {
  process.stdout.write(question);
  const stdin = process.stdin;
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");
  let value = "";
  return new Promise((resolve) => {
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          process.stdout.write("\n");
          process.exit(1);
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1);
        } else {
          value += char;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  const email = (process.env.DUMP_EMAIL ?? (await ask("Email: "))).toLowerCase();
  if (!email.includes("@")) throw new Error("That doesn't look like an email.");

  const others = await db
    .select({ email: user.email })
    .from(user)
    .where(ne(user.email, email));
  if (others.length > 0) {
    throw new Error(`Dump already has an account (${others[0].email}). It only allows one.`);
  }

  let password = process.env.DUMP_PASSWORD;
  if (!password) {
    password = await askHidden("New password (10+ characters, hidden): ");
    const again = await askHidden("Type it again: ");
    if (password !== again) throw new Error("The two passwords don't match.");
  }
  if (password.length < 10) throw new Error("Use at least 10 characters.");

  const hash = await hashPassword(password);
  const [existing] = await db.select().from(user).where(eq(user.email, email));

  if (existing) {
    await db
      .update(account)
      .set({ password: hash })
      .where(and(eq(account.userId, existing.id), eq(account.providerId, "credential")));
    // Signs you out everywhere, so the old password can't linger anywhere.
    await db.delete(session).where(eq(session.userId, existing.id));
    console.log(`New password saved for ${email}. Sign in again with it.`);
    return;
  }

  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(user).values({ id, email, name: email.split("@")[0], emailVerified: true });
    await tx.insert(account).values({
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: hash,
    });
  });
  console.log(`Account created for ${email}. You can sign in now.`);
}

main()
  .catch((error: Error) => {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
