import { CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import type { TimelineItem } from "@/app/[locale]/timeline-visualizer/_components/timeline-preview";
import { Button } from "@/components/ui/button";
import { track } from "@/lib/analytics/posthog.client";
import { serializeTimelineToText } from "@/lib/timeline-text-format";

export type CopyTextTimelineButtonProps = {
  items: TimelineItem[];
};

export function CopyTextTimelineButton({ items }: CopyTextTimelineButtonProps) {
  const t = useTranslations();

  const [copied, setCopied] = useState(false);

  async function copyToClipboard() {
    const output = serializeTimelineToText(items);
    await navigator.clipboard.writeText(output);
    track("timeline_text_copied", {
      source: "view",
      item_count: items.length,
    });

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
