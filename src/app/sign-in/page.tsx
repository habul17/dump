import { redirect } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";
import { getSession } from "@/lib/session";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getSession()) redirect("/");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-5 py-12">
      <div className="mb-8 flex flex-col items-center gap-2.5 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-ink text-bg">
          <svg viewBox="0 0 24 24" className="ml-0.5 size-5" aria-hidden>
            <path d="M7 4.8v14.4a1 1 0 0 0 1.5.86l11.6-7.2a1 1 0 0 0 0-1.72L8.5 3.94A1 1 0 0 0 7 4.8z" fill="currentColor" />
          </svg>
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Dump</h1>
        <p className="text-sm text-muted">Your project ideas, in order.</p>
      </div>
      <SignInForm />
      <p className="mt-6 text-center text-sm text-muted">Only you have an account here.</p>
    </main>
  );
}
