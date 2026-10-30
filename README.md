# Dump

A private place to dump project ideas, put them in order and build them one at a time.

- **Now building**: the one project I'm working on. It stays empty until I pick the next one.
- **Up next**: every other idea, in the order I want to build them. Drag the handle to reorder.
- **Done** and **Archive**: finished projects, and ideas I put aside.

Live at [dump.abulhassan.dev](https://dump.abulhassan.dev). Only I can sign in.

## What it does

- Add an idea in one line, then fill in the details on its own page: description, tech stack, GitHub and live links, a step checklist and tags. Everything saves as I type.
- Start, finish and archive ideas, with Undo for every move.
- Done projects show when I started, when I finished and how many days it took.
- Search ideas and filter them by tag.
- A build log for each project, with **Copy as LinkedIn post** to turn it into a post draft.
- Keyboard shortcuts on a laptop: <kbd>N</kbd> new idea, <kbd>/</kbd> search, <kbd>↑</kbd> <kbd>↓</kbd> move, <kbd>Enter</kbd> open.
- Download a backup as JSON or Markdown.
- Light and dark mode. It installs on a phone home screen like an app.

## Stack

- [Next.js](https://nextjs.org) (App Router) and Tailwind CSS
- [Neon](https://neon.tech) Postgres with [Drizzle ORM](https://orm.drizzle.team)
- [Better Auth](https://www.better-auth.com) for email and password sign-in (sign-ups are turned off)
- Hosted on [Vercel](https://vercel.com)

## Run it locally

1. Install packages:

   ```bash
   bun install
   ```

2. Copy `.env.example` to `.env.local` and fill it in. Use the connection string of the Neon `dev` branch, so testing never touches real data.

3. Create the tables, then make the account (it asks for an email and a password):

   ```bash
   bun run db:migrate
   bun run account:dev
   ```

4. Start it:

   ```bash
   bun dev
   ```

   Then open http://localhost:3000.

## Live database

`.env.live` holds the connection string of the Neon `main` branch. It is never committed.

```bash
bun run db:migrate:live   # apply new migrations to the live database
bun run account           # create the account, or reset its password
```

`bun run account` also signs out every device, so it doubles as "forgot password".

## Changing the database

Edit `src/db/schema.ts`, then:

```bash
bun run db:generate
bun run db:migrate
```
