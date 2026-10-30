import { notFound } from "next/navigation";
import { IdeaEditor } from "@/components/idea-editor";
import { getIdea } from "@/lib/queries";
import { requireUser } from "@/lib/session";

async function load(id: string) {
  const user = await requireUser();
  const found = await getIdea(user.id, id);
  if (!found) notFound();
  return found;
}

export async function generateMetadata({ params }: PageProps<"/ideas/[id]">) {
  const { idea } = await load((await params).id);
  return { title: idea.title };
}

export default async function IdeaPage({ params }: PageProps<"/ideas/[id]">) {
  const { idea, steps, log } = await load((await params).id);
  return <IdeaEditor key={idea.id} idea={idea} steps={steps} log={log} />;
}
