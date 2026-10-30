"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { field } from "./fields";
import { Button } from "./ui";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    setBusy(true);
    setError("");
    const { error } = await authClient.signIn.email({
      email: String(data.get("email")).trim(),
      password: String(data.get("password")),
      rememberMe: true,
    });
    if (error) {
      setBusy(false);
      setError(
        error.status === 429
          ? "Too many tries. Wait a minute and try again."
          : error.status === 401 || error.status === 400
            ? "Wrong email or password."
            : "Couldn't sign in. Check your connection and try again.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit(e.currentTarget);
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
        Email
        <input name="email" type="email" autoComplete="username" required autoFocus className={field + " text-ink"} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium text-muted">
        Password
        <input name="password" type="password" autoComplete="current-password" required className={field + " text-ink"} />
      </label>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="mt-1 py-3">
        {busy ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
