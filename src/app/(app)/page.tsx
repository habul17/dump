import { Board } from "@/components/board";
import { listIdeas } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export default async function HomePage() {
  const user = await requireUser();
  return <Board ideas={await listIdeas(user.id)} />;
}
