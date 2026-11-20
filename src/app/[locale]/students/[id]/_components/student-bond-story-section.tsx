import { BookHeartIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { DetailSection } from "@/app/[locale]/students/[id]/_components/detail-section";
import type { StudentDetailBondStory } from "@/app/[locale]/students/[id]/_lib/student-detail.server";
import bondIcon from "@/assets/images/bond.png";
import { cn } from "@/lib/utils";

function episodeTitle(story: StudentDetailBondStory, locale: string) {
  return locale === "ja"
    ? (story.titleJP ?? story.title)
    : (story.title ?? story.titleJP);
}

export async function StudentBondStorySection({
  stories,
}: {
  stories: StudentDetailBondStory[];
}) {
  if (stories.length === 0) {
    return null;
  }

  const t = await getTranslations();
  const locale = await getLocale();

  return (
    <DetailSection
      title={t("tools.students.detail.sections.bondStory")}
      icon={BookHeartIcon}
    >
      <ol className="divide-y rounded-lg border">
        {stories.map((story) => {
          const unlocks = story.unlocksMemorialLobby || story.unlocksBondGear;

          return (
            <li
              key={story.episode}
              className={cn("flex items-center gap-3 px-3 py-2", {
                "bg-sky-50/60 dark:bg-sky-950/20": unlocks,
              })}
            >
              <span className="font-nexon-football-gothic text-muted-foreground w-6 shrink-0 text-center text-lg font-bold tabular-nums">
                {story.episode}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-sm font-medium">
                  {episodeTitle(story, locale) ??
                    t("tools.students.detail.bondStory.episode", {
                      episode: story.episode,
                    })}
                </span>

                {locale !== "ja" && !story.isReleasedGlobal && (
                  <span className="text-muted-foreground text-xs">
                    {t("tools.students.detail.bondStory.notOnGlobal")}
                  </span>
                )}

                {story.unlocksMemorialLobby && (
                  <span className="text-xs font-medium text-sky-700 dark:text-sky-300">
                    {t("tools.students.detail.bondStory.unlocksMemorialLobby")}
                  </span>
                )}

                {story.unlocksBondGear && (
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                    {t("tools.students.detail.bondStory.unlocksBondGear")}
                  </span>
                )}
              </div>

              <span
                className="inline-flex shrink-0 items-center gap-1"
                title={t("tools.students.detail.bondStory.bondRank", {
                  rank: story.bondRank,
                })}
              >
                <img src={bondIcon.src} alt="" aria-hidden className="size-5" />
                <span
                  aria-hidden
                  className="font-nexon-football-gothic w-5 text-right font-bold tabular-nums"
                >
                  {story.bondRank}
                </span>
                <span className="sr-only">
                  {t("tools.students.detail.bondStory.bondRank", {
                    rank: story.bondRank,
                  })}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </DetailSection>
  );
}
