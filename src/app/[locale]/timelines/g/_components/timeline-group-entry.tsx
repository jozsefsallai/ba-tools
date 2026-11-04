import { useTranslations } from "next-intl";
import {
  TimelineCard,
  type TimelineCardEntry,
} from "@/components/timelines/timeline-card";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export type TimelineGroupEntryProps = {
  entry: TimelineCardEntry;
};

export function TimelineGroupEntry({ entry }: TimelineGroupEntryProps) {
  const t = useTranslations();

  return (
    <TimelineCard
      entry={entry}
      actions={
        entry.visibility === "public" && (
          <Button size="sm" asChild>
            <Link href={`/timelines/${entry._id}`}>
              {t("tools.timelineGroupView.viewTimeline")}
            </Link>
          </Button>
        )
      }
    />
  );
}
