"use client";

import { toast } from "sonner";
import { undoChange } from "@/app/actions";
import type { Snapshot } from "@/lib/types";

export const failed = () =>
  toast.error("That didn't save. Check your connection and try again.");

/** A toast with an Undo button that puts things back the way they were. */
export function undoToast(message: string, snapshots: Snapshot[], description?: string) {
  toast(message, {
    description,
    action: {
      label: "Undo",
      onClick: () => {
        undoChange(snapshots).catch(failed);
      },
    },
  });
}
