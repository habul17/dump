"use client";

import { AlertDialog, DropdownMenu } from "radix-ui";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const button = {
  base: "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-[opacity,background-color] disabled:pointer-events-none disabled:opacity-50",
  primary: "bg-ink text-bg hover:opacity-90",
  secondary: "border border-line bg-bg text-ink hover:bg-surface",
  danger: "bg-danger text-white hover:opacity-90",
  ghost: "text-muted hover:bg-surface hover:text-ink",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: React.ComponentProps<"button"> & { variant?: keyof Omit<typeof button, "base"> }) {
  return <button type="button" className={cn(button.base, button[variant], className)} {...props} />;
}

export function IconButton({ className, ...props }: React.ComponentProps<"button"> & { "aria-label": string }) {
  return (
    <button
      type="button"
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface hover:text-ink data-[state=open]:bg-surface data-[state=open]:text-ink",
        className,
      )}
      {...props}
    />
  );
}

export function Chip({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 truncate rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs text-muted",
        className,
      )}
      {...props}
    />
  );
}

// ---------- Menus ----------

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({ className, ...props }: DropdownMenu.DropdownMenuContentProps) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          "z-40 min-w-48 rounded-xl border border-line bg-bg p-1 text-sm shadow-lg shadow-black/10",
          className,
        )}
        {...props}
      />
    </DropdownMenu.Portal>
  );
}

export function MenuItem({ className, danger, ...props }: DropdownMenu.DropdownMenuItemProps & { danger?: boolean }) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-default items-center gap-2.5 rounded-lg px-2.5 py-2 outline-none select-none data-[highlighted]:bg-surface [&_svg]:size-4 [&_svg]:text-muted",
        danger && "text-danger [&_svg]:text-danger",
        className,
      )}
      {...props}
    />
  );
}

export const MenuSeparator = () => <DropdownMenu.Separator className="my-1 h-px bg-line" />;

// ---------- Confirm ----------

/** Asks before something that can't be undone. */
export function Confirm({
  trigger,
  title,
  description,
  action,
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  action: string;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger asChild>{trigger}</AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-1/2 rounded-2xl border border-line bg-bg p-5 shadow-xl">
          <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-1.5 text-sm text-muted">{description}</AlertDialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Cancel</Button>
            </AlertDialog.Cancel>
            <Button
              variant="danger"
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {action}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
