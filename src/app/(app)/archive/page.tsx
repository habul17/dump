import { ArchiveList } from "@/components/archive-list";
import { PageTitle } from "@/components/page-title";
import { listIdeas } from "@/lib/queries";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Archive" };

export default async function ArchivePage() {
  const user = await requireUser();
  const archived = (await listIdeas(user.id))
    .filter((i) => i.status === "archived")
    .sort((a, b) => +(b.archivedAt ?? b.updatedAt) - +(a.archivedAt ?? a.updatedAt));

  return (
    <div className="flex flex-col gap-5">
      <PageTitle title="Archive" count={archived.length}>
        {archived.length > 0 && (
          <p className="text-sm text-muted">Ideas you put aside. Restore one to put it back at the bottom of Up next.</p>
        )}
      </PageTitle>
      <ArchiveList ideas={archived} />
    </div>
  );
}
