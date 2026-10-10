import {
  type BirthdayGiftPreference,
  BirthdaysView,
} from "@/app/[locale]/birthdays/_components/birthdays-view";
import { db } from "@/lib/db";
import { getCardMetadata } from "@/lib/og-metadata.server";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata() {
  return getCardMetadata("birthdays", await getLocale());
}

export default async function BirthdaysPage() {
  const t = await getTranslations();
  const preferenceOrder = {
    adored: 0,
    loved: 1,
    liked: 2,
  } as const;
  const rarityOrder = {
    SSR: 0,
    SR: 1,
    R: 2,
    N: 3,
  } as const;

  const studentsWithGiftPreferences = await db.student.findMany({
    select: {
      id: true,
      giftsAdored: {
        select: {
          id: true,
          iconName: true,
          name: true,
          nameJP: true,
          rarity: true,
        },
      },
      giftsLoved: {
        select: {
          id: true,
          iconName: true,
          name: true,
          nameJP: true,
          rarity: true,
        },
      },
      giftsLiked: {
        select: {
          id: true,
          iconName: true,
          name: true,
          nameJP: true,
          rarity: true,
        },
      },
    },
  });

  const favoriteGiftsByStudentId: Record<string, BirthdayGiftPreference[]> = {};
  for (const student of studentsWithGiftPreferences) {
    const gifts = [
      ...student.giftsAdored.map((gift) => ({
        ...gift,
        preference: "adored" as const,
      })),
      ...student.giftsLoved.map((gift) => ({
        ...gift,
        preference: "loved" as const,
      })),
      ...student.giftsLiked.map((gift) => ({
        ...gift,
        preference: "liked" as const,
      })),
    ];
    favoriteGiftsByStudentId[student.id] = gifts.sort((a, b) => {
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityDiff !== 0) {
        return rarityDiff;
      }

      const preferenceDiff =
        preferenceOrder[a.preference] - preferenceOrder[b.preference];
      if (preferenceDiff !== 0) {
        return preferenceDiff;
      }

      return a.id - b.id;
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold">{t("tools.birthdays.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("tools.birthdays.description")}
        </p>
      </div>

      <BirthdaysView favoriteGiftsByStudentId={favoriteGiftsByStudentId} />
    </div>
  );
}
