"use client";

import { Archive, CircleCheck, Download, Ellipsis, LogOut, Moon, Settings, Sun } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from "./ui";

export async function signOut(router: ReturnType<typeof useRouter>) {
  await authClient.signOut();
  router.replace("/sign-in");
  router.refresh();
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <IconButton aria-label={dark ? "Switch to light mode" : "Switch to dark mode"} onClick={() => setTheme(dark ? "light" : "dark")}>
      <Sun className="size-[18px] dark:hidden" aria-hidden />
      <Moon className="hidden size-[18px] dark:block" aria-hidden />
    </IconButton>
  );
}

export function Header() {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 sm:px-6">
        <Link href="/" className="rounded-lg text-xl font-semibold tracking-tight">
          Dump
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <Menu>
            <MenuTrigger asChild>
              <IconButton aria-label="Menu">
                <Ellipsis className="size-[18px]" aria-hidden />
              </IconButton>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={() => router.push("/done")}>
                <CircleCheck /> Done
              </MenuItem>
              <MenuItem onSelect={() => router.push("/archive")}>
                <Archive /> Archive
              </MenuItem>
              <MenuItem onSelect={() => router.push("/settings")}>
                <Settings /> Settings
              </MenuItem>
              <MenuItem asChild>
                <a href="/api/backup" download>
                  <Download /> Download backup
                </a>
              </MenuItem>
              <MenuSeparator />
              <MenuItem onSelect={() => signOut(router)}>
                <LogOut /> Sign out
              </MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>
    </header>
  );
}
