import type { TimelineItem } from "@/app/timeline-visualizer/_components/timeline-preview";
import { Button } from "@/components/ui/button";
import { getShorthand } from "@/lib/student-utils";
import { useState } from "react";
import { toast } from "sonner";

export type CopyTextTimelineButtonProps = {
  items: TimelineItem[];
};

export function CopyTextTimelineButton({ items }: CopyTextTimelineButtonProps) {
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
        output += `[${item.text}] `;
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

        if (item.copy) {
          ex += "(C) ";
        }

        output += ex;
      }
    }

    await navigator.clipboard.writeText(output.trim());

    toast.success("Copied text TL to clipboard");

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" onClick={copyToClipboard} disabled={copied}>
      {copied ? "Copied to Clipboard" : "Copy Text Timeline"}
    </Button>
  );
}
