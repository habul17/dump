import { auth } from "@/lib/auth";
import { todayIso, toMarkdown } from "@/lib/format";
import { exportIdeas } from "@/lib/queries";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return new Response("Sign in first.", { status: 401 });

  const ideas = await exportIdeas(session.user.id);
  const markdown = new URL(request.url).searchParams.get("format") === "md";
  const body = markdown
    ? toMarkdown(ideas)
    : JSON.stringify({ app: "dump", exportedAt: new Date().toISOString(), ideas }, null, 2);

  return new Response(body, {
    headers: {
      "Content-Type": markdown ? "text/markdown; charset=utf-8" : "application/json",
      "Content-Disposition": `attachment; filename="dump-${todayIso()}.${markdown ? "md" : "json"}"`,
      "Cache-Control": "no-store",
    },
  });
}
