import { Header } from "@/components/header";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  await requireUser();
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-6">
        {children}
      </main>
    </>
  );
}
