"use client";

import { X } from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export const field =
  "w-full rounded-xl border border-line bg-bg px-3.5 py-2.5 text-[15px] outline-none transition-colors focus:border-ink";

/** A textarea that grows with its text. */
export function AutoTextarea({ className, value, ...props }: React.ComponentProps<"textarea"> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return <textarea ref={ref} rows={1} value={value} className={cn("resize-none overflow-hidden", className)} {...props} />;
}

/** Type a word and press Enter (or comma) to add it as a chip. */
export function ChipInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  label: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(text: string) {
    const words = text.split(",").map((w) => w.trim().slice(0, 40)).filter(Boolean);
    const next = [...value];
    for (const word of words) {
      if (!next.some((v) => v.toLowerCase() === word.toLowerCase())) next.push(word);
    }
    if (next.length !== value.length) onChange(next.slice(0, 30));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-line px-2 py-1.5 transition-colors focus-within:border-ink">
      {value.map((word) => (
        <span key={word} className="inline-flex items-center gap-0.5 rounded-full border border-line bg-surface py-0.5 pr-1 pl-2.5 text-sm">
          {word}
          <button
            type="button"
            aria-label={`Remove ${word}`}
            onClick={() => onChange(value.filter((v) => v !== word))}
            className="grid size-5 place-items-center rounded-full text-muted hover:bg-line hover:text-ink"
          >
            <X className="size-3" aria-hidden />
          </button>
        </span>
      ))}
      <input
        value={draft}
        aria-label={label}
        placeholder={value.length ? "Add more…" : placeholder}
        enterKeyHint="enter"
        onChange={(e) => {
          const text = e.target.value;
          if (text.includes(",")) {
            commit(text);
            setDraft("");
          } else {
            setDraft(text);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            setDraft("");
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => {
          commit(draft);
          setDraft("");
        }}
        className="min-w-32 flex-1 bg-transparent px-1.5 py-1 text-[15px] outline-none"
      />
    </div>
  );
}
