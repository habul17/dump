"use client";

import { Download, LogOut, Monitor, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { Kbd } from "./board";
import { field } from "./fields";
import { signOut } from "./header";
import { Button, button } from "./ui";

const THEMES = [
  { value: "system", label: "Auto", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

const SHORTCUTS = [
  [["N"], "New idea"],
  [["/"], "Search"],
  [["↑", "↓"], "Move through the list"],
  [["Enter"], "Open the idea"],
  [["Esc"], "Leave a box, clear search"],
] as const;

function Section({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <h2 className="label">{title}</h2>
      {children}
    </section>
  );
}

const mounted = () => () => {};

function ThemePicker() {
  const { theme, setTheme } = useTheme();
  // The saved theme is only known in the browser.
  const ready = useSyncExternalStore(mounted, () => true, () => false);
  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-1 rounded-xl bg-surface p-1">
      {THEMES.map(({ value, label, icon: Icon }) => {
        const active = ready && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors",
              active ? "bg-bg text-ink shadow-sm" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </button>
        );
      })}
    </div>
  );
}

function ChangePassword() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const currentPassword = String(data.get("current"));
    const newPassword = String(data.get("new"));
    if (newPassword.length < 10) return setError("The new password needs at least 10 characters.");
    if (newPassword !== data.get("again")) return setError("The new passwords don't match.");
    setBusy(true);
    setError("");
    const { error } = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true });
    setBusy(false);
    if (error) {
      setError(
        error.status === 429
          ? "Too many tries. Wait a minute and try again."
          : error.code === "INVALID_PASSWORD"
            ? "Your current password is wrong."
            : "Couldn't change it. Try again.",
      );
      return;
    }
    form.reset();
    toast.success("Password changed", { description: "Other devices were signed out." });
  }

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <input name="current" type="password" autoComplete="current-password" required placeholder="Current password" aria-label="Current password" className={field} />
      <input name="new" type="password" autoComplete="new-password" required minLength={10} placeholder="New password (10+ characters)" aria-label="New password" className={field} />
      <input name="again" type="password" autoComplete="new-password" required placeholder="New password again" aria-label="New password again" className={field} />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" variant="secondary" disabled={busy} className="self-start">
        {busy ? "Changing…" : "Change password"}
      </Button>
    </form>
  );
}

export function Settings({ email }: { email: string }) {
  const router = useRouter();
  return (
    <>
      <Section title="Theme">
        <ThemePicker />
      </Section>

      <Section title="Backup">
        <p className="text-sm text-muted">Download everything: ideas, steps and build logs.</p>
        <div className="flex flex-wrap gap-2">
          <a href="/api/backup" download className={cn(button.base, button.secondary)}>
            <Download className="size-4" aria-hidden /> JSON, for the app
          </a>
          <a href="/api/backup?format=md" download className={cn(button.base, button.secondary)}>
            <Download className="size-4" aria-hidden /> Markdown, easy to read
          </a>
        </div>
      </Section>

      <Section title="Keyboard shortcuts" className="hidden sm:flex">
        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2.5 text-sm">
          {SHORTCUTS.map(([keys, what]) => (
            <div key={what} className="contents">
              <dt className="flex gap-1">
                {keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dt>
              <dd className="text-muted">{what}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Password">
        <ChangePassword />
      </Section>

      <Section title="Account">
        <p className="text-sm">
          Signed in as <span className="font-medium">{email}</span>
        </p>
        <Button variant="secondary" onClick={() => signOut(router)} className="self-start">
          <LogOut className="size-4" aria-hidden /> Sign out
        </Button>
      </Section>
    </>
  );
}
