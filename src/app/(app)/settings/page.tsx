import { PageTitle } from "@/components/page-title";
import { Settings } from "@/components/settings";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="flex flex-col gap-8">
      <PageTitle title="Settings" />
      <Settings email={user.email} />
    </div>
  );
}
