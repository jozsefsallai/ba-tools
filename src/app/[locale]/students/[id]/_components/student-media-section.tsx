"use client";

import { DetailSection } from "@/app/[locale]/students/[id]/_components/detail-section";
import { FallbackImage } from "@/components/common/fallback-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FAVOR_EMBLEM_RANKS } from "@/lib/emblems";
import {
  buildSkillPortraitUrl,
  buildStudentDefaultSpriteUrl,
  buildStudentIconUrl,
  buildStudentPortraitUrl,
} from "@/lib/url";
import { cn } from "@/lib/utils";
import { ExternalLinkIcon, ImagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Student } from "~prisma";

type MediaItem = {
  key: string;
  label: string;
  src: string;
  className: string;
};

function MediaTile({ item, name }: { item: MediaItem; name: string }) {
  const t = useTranslations();

  return (
    <figure className="bg-background flex flex-col overflow-hidden rounded-lg border">
      <div className="flex flex-1 items-center justify-center bg-[repeating-conic-gradient(var(--color-muted)_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-3">
        <FallbackImage
          src={item.src}
          alt={`${name} – ${item.label}`}
          loading="lazy"
          className={cn("object-contain", item.className)}
        />
      </div>

      <figcaption className="flex items-center justify-between gap-2 border-t px-3 py-2 text-sm">
        <span className="truncate font-medium">{item.label}</span>

        <a
          href={item.src}
          target="_blank"
          rel="noreferrer"
          className="text-muted-foreground hover:text-foreground"
          title={t("tools.students.detail.media.open")}
        >
          <ExternalLinkIcon className="size-4" />

          <span className="sr-only">
            {t("tools.students.detail.media.open")}
          </span>
        </a>
      </figcaption>
    </figure>
  );
}

export function StudentMediaSection({
  student,
  name,
}: {
  student: Pick<Student, "id" | "devName">;
  name: string;
}) {
  const t = useTranslations();

  const icons: MediaItem[] = [
    {
      key: "icon",
      label: t("tools.students.detail.media.icon"),
      src: buildStudentIconUrl(student),
      className: "h-32",
    },
    {
      key: "skillPortrait",
      label: t("tools.students.detail.media.skillPortrait"),
      src: buildSkillPortraitUrl(student),
      className: "h-32",
    },
  ];

  const portraits: MediaItem[] = [
    {
      key: "portrait",
      label: t("tools.students.detail.media.portrait"),
      src: buildStudentPortraitUrl(student),
      className: "h-80",
    },
    {
      key: "sprite",
      label: t("tools.students.detail.media.sprite"),
      src: buildStudentDefaultSpriteUrl(student.id),
      className: "h-80",
    },
  ];

  const bondTitles: MediaItem[] = FAVOR_EMBLEM_RANKS.map((rank) => ({
    key: `bond-${rank.id}`,
    label: t("tools.students.detail.media.bondRank", { rank: rank.id }),
    src: `/api/emblem/favor/${student.id}/${rank.id}.png`,
    className: "w-full max-w-[420px]",
  }));

  return (
    <DetailSection
      title={t("tools.students.detail.sections.media")}
      icon={ImagesIcon}
    >
      <Tabs defaultValue="portraits">
        <TabsList className="mb-3">
          <TabsTrigger value="portraits">
            {t("tools.students.detail.media.portraits")}
          </TabsTrigger>

          <TabsTrigger value="icons">
            {t("tools.students.detail.media.icons")}
          </TabsTrigger>

          <TabsTrigger value="bondTitles">
            {t("tools.students.detail.media.bondTitles")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="portraits">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {portraits.map((item) => (
              <MediaTile key={item.key} item={item} name={name} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="icons">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {icons.map((item) => (
              <MediaTile key={item.key} item={item} name={name} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bondTitles">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {bondTitles.map((item) => (
              <MediaTile key={item.key} item={item} name={name} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </DetailSection>
  );
}
