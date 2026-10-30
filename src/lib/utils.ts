import { clsx, type ClassValue } from "clsx";

export const cn = (...classes: ClassValue[]) => clsx(classes);

/** True for ideas added in the last day. */
export const isNew = (createdAt: Date) =>
  Date.now() - new Date(createdAt).getTime() < 86_400_000;
