"use client";

import { GlobeIcon, LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type CSSProperties, type ReactNode, type Ref, useMemo } from "react";
import { FormationRowsReadonly } from "@/app/[locale]/formation-display/_components/formation-rows-readonly";
import { StudentCard } from "@/components/common/student-card";
import { RaidChips } from "@/components/raid/raid-chips";
import { RaidThumbnail } from "@/components/raid/raid-thumbnail";
import { useStudents } from "@/hooks/use-students";
import { getRaidBossLabel } from "@/lib/raid-labels";
import {
  formationSourceToState,
  hasFormationSlots,
} from "@/lib/timeline-formation";
import type { Doc } from "~convex/dataModel";
import type { Student } from "~prisma";

export type TimelineCardEntry = Pick<
  Doc<"timeline">,
  "_id" | "name" | "items" | "formation" | "raid" | "visibility"
>;

export function TimelineCardPreview({ entry }: { entry: TimelineCardEntry }) {
  const { students: allStudents } = useStudents();

  const formation = useMemo(
    () =>
      entry.formation
        ? formationSourceToState(entry.formation, allStudents)
        : null,
    [
      entry.formation,
      allStudents,
    ],
  );

  const uniqueStudents = useMemo<Student[]>(() => {
    const studentIds = new Set<string>();

    for (const item of entry.items) {
      if (item.type === "student") {
        studentIds.add(item.studentId);
      }
    }

    return allStudents.filter((student) => studentIds.has(student.id));
  }, [
    allStudents,
    entry.items,
  ]);

  if (formation && hasFormationSlots(formation)) {
    return (
      <div className="flex max-w-full overflow-x-auto">
        <div className="shrink-0 [zoom:0.55]">
          <FormationRowsReadonly
            className="w-max max-w-none"
            rows={formation.rows}
            type={formation.type}
            rowGap={formation.rowGap}
            displayOverline={formation.displayOverline}
            noDisplayRole={formation.noDisplayRole}
            groupsVertical={formation.groupsVertical}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {uniqueStudents.map((student) => (
        <div
          style={{
            zoom: 0.55,
          }}
          key={student.id}
        >
          <StudentCard student={student} />
        </div>
      ))}
    </div>
  );
}

export type TimelineCardProps = {
  entry: TimelineCardEntry;
  actions?: ReactNode;
  dragHandle?: ReactNode;
  showVisibility?: boolean;
  ref?: Ref<HTMLElement>;
  style?: CSSProperties;
};

export function TimelineCard({
  entry,
  actions,
  dragHandle,
  showVisibility,
  ref,
  style,
}: TimelineCardProps) {
  const t = useTranslations();

  const boss = entry.raid
    ? getRaidBossLabel(t, entry.raid.type, entry.raid.boss)
    : undefined;

  return (
    <article
      ref={ref}
      style={style}
      id={entry._id}
      className="flex gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-foreground/20 max-md:flex-col"
    >
      <div className="flex min-w-0 flex-1 gap-3">
        {dragHandle}

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-w-0 items-center gap-3">
            {entry.raid && (
              <RaidThumbnail type={entry.raid.type} boss={entry.raid.boss} />
            )}

            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex min-w-0 items-center gap-2">
                {entry.name ? (
                  <h3 className="min-w-0 text-base font-semibold wrap-break-word">
                    {entry.name}
                  </h3>
                ) : (
                  <h3 className="text-base font-semibold text-muted-foreground italic">
                    {t("tools.myTimelines.editGroup.untitledTimeline")}
                  </h3>
                )}

                {showVisibility &&
                  (entry.visibility === "public" ? (
                    <GlobeIcon className="size-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <LockIcon className="size-4 shrink-0 text-muted-foreground" />
                  ))}
              </div>

              {entry.raid && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <RaidChips raid={entry.raid} />
                  {boss && entry.name && !entry.name.includes(boss) && (
                    <span className="text-xs text-muted-foreground">
                      {boss}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <TimelineCardPreview entry={entry} />
        </div>
      </div>

      {actions && (
        <div className="flex shrink-0 items-start gap-2 max-md:justify-end">
          {actions}
        </div>
      )}
    </article>
  );
}
