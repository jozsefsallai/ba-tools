"use client";

import { PencilIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export type TimelineTitleInputProps = {
  value: string;
  onChange: (value: string) => void;
};

export function TimelineTitleInput({
  value,
  onChange,
}: TimelineTitleInputProps) {
  const t = useTranslations();

  return (
    <div className="group relative -mx-2">
      <textarea
        rows={1}
        value={value}
        aria-label={t("tools.timeline.titleLabel")}
        placeholder={t("common.untitledTimeline")}
        spellCheck={false}
        onChange={(event) =>
          onChange(event.target.value.replace(/\s*\n\s*/g, " "))
        }
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            event.currentTarget.blur();
          }
        }}
        className="block w-full resize-none rounded-md bg-transparent px-2 py-1 pr-10 text-3xl font-bold outline-none transition-colors field-sizing-content placeholder:font-bold placeholder:text-muted-foreground placeholder:italic hover:bg-accent/50 focus-visible:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50 max-md:text-2xl"
      />

      <PencilIcon
        aria-hidden
        className="pointer-events-none absolute top-3 right-3 size-4 text-muted-foreground opacity-50 transition-opacity group-hover:opacity-100 group-focus-within:opacity-0"
      />
    </div>
  );
}
