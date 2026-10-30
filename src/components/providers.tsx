"use client";

import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
import { OfflineBanner } from "./offline-banner";

function ThemedToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      position="bottom-center"
      offset={20}
      toastOptions={{
        classNames: {
          toast: "!rounded-xl !border-line !bg-bg !text-ink !shadow-lg !font-sans",
          description: "!text-muted",
          actionButton: "!rounded-lg !bg-ink !text-bg !font-semibold",
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <ThemedToaster />
      <OfflineBanner />
    </ThemeProvider>
  );
}
