import type { TimelineItem } from "@/app/timeline-visualizer/_components/timeline-preview";
import { Button } from "@/components/ui/button";
import { getShorthand } from "@/lib/student-utils";
import { CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

export type CopyTextTimelineButtonProps = {
  items: TimelineItem[];
};

export function CopyTextTimelineButton({ items }: CopyTextTimelineButtonProps) {
  const t = useTranslations();

  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    let output = "";

    for (const item of items) {
      if (item.type === "separator" && item.orientation === "horizontal") {
        continue;
      }

      if (item.type === "separator" && item.orientation === "vertical") {
        output += "\n";
        continue;
      }

      if (item.type === "text") {
        output += `[${item.text.split("\n").join(" ")}] `;
        continue;
      }

      if (item.type === "student") {
        const shorthand = getShorthand(item.student);

        let ex = "";

        if (item.trigger) {
          if (item.trigger.includes(" ")) {
            ex += `\n[${item.trigger}] `;
          } else {
            ex += `\n${item.trigger} `;
          }
        }

        if (item.target) {
          const targetShorthand = getShorthand(item.target);
          ex += `(${shorthand} → ${targetShorthand}) `;
        } else {
          ex += `${shorthand} `;
        }

        if (item.notes) {
          ex += `[${item.notes.split("\n").join(" ")}] `;
        }

        if (item.copy) {
          ex += "(C) ";
        }

        output += ex;
      }
    }

    await navigator.clipboard.writeText(output.trim());

    toast.success(t("tools.timeline.copy.copiedToast"));

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" onClick={copyToClipboard} disabled={copied}>
      <CopyIcon />
      {copied
        ? t("tools.timeline.copy.copied")
        : t("tools.timeline.copy.button")}
    </Button>
  );
}
