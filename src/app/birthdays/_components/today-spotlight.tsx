"use client";

import birthdayHat from "@/app/birthdays/_assets/Icon_Momotalk_BirthdayHat.png";
import birthdayDeco from "@/app/birthdays/_assets/Momotalk_Birthday_Deco.png";
import type { BirthdayGiftPreference } from "@/app/birthdays/_components/birthdays-view";
import giftAdoredImage from "@/assets/images/gift_adored.png";
import giftLikedImage from "@/assets/images/gift_liked.png";
import giftLovedImage from "@/assets/images/gift_loved.png";
import type { BirthdayStudent } from "@/lib/birthdays";
import { buildItemIconUrl, buildStudentPortraitUrlFromId } from "@/lib/url";
import { PartyPopperIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

type TodaySpotlightProps = {
  todayBirthdays: BirthdayStudent[];
  favoriteGiftsByStudentId: Record<string, BirthdayGiftPreference[]>;
};

function getPreferenceIcon(preference: BirthdayGiftPreference["preference"]) {
  switch (preference) {
    case "adored":
      return giftAdoredImage.src;
    case "loved":
      return giftLovedImage.src;
    case "liked":
      return giftLikedImage.src;
  }
}

export function TodaySpotlight({
  todayBirthdays,
  favoriteGiftsByStudentId,
}: TodaySpotlightProps) {
  const t = useTranslations();
  const locale = useLocale();

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <PartyPopperIcon className="size-4 text-pink-500" />
        <h2 className="font-semibold">{t("tools.birthdays.today.title")}</h2>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {todayBirthdays.map((row) => (
          <div
            key={row.student.id}
            className="relative w-full max-w-[520px] justify-self-start flex flex-col items-center justify-center gap-2 overflow-hidden rounded-md border bg-card px-4 py-18 pb-8"
          >
            <div className="bg-gradient-to-r from-transparent via-blue-400/15 dark:via-blue-400/35 to-transparent absolute top-0 bottom-0 left-1/5 w-4/5 -skew-x-[45deg]" />

            <img
              src={birthdayDeco.src}
              alt=""
              aria-hidden
              className="pointer-events-none absolute top-8 left-0 w-[45%] opacity-70 -rotate-20"
            />

            <img
              src={birthdayDeco.src}
              alt=""
              aria-hidden
              className="pointer-events-none absolute top-8 right-0 w-[45%] opacity-70 rotate-20 -scale-x-[1]"
            />

            <div className="relative flex flex-col items-center gap-3">
              <div className="relative">
                <img
                  src={buildStudentPortraitUrlFromId(row.student.id)}
                  alt={row.student.name}
                  className="size-24 rounded-full border-4 border-white object-cover shadow-md"
                />
                <img
                  src={birthdayHat.src}
                  alt=""
                  aria-hidden
                  className="pointer-events-none absolute -top-8 right-1 w-8 rotate-28"
                />
              </div>
              <div className="text-lg font-bold leading-tight">
                {row.student.name}
              </div>
              <div className="text-sm font-medium text-pink-600 dark:text-pink-300">
                {t("tools.birthdays.today.celebrating")}
              </div>

              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {(favoriteGiftsByStudentId[row.student.id] ?? [])
                  .slice(0, 8)
                  .map((gift) => (
                    <div
                      key={`${row.student.id}-${gift.preference}-${gift.id}`}
                      className="group relative size-16 flex items-center justify-center border-2 bg-background/70 rounded-full"
                      title={
                        locale === "jp" ? gift.nameJP || gift.name : gift.name
                      }
                    >
                      <img
                        src={buildItemIconUrl(gift.iconName)}
                        alt={
                          locale === "jp" ? gift.nameJP || gift.name : gift.name
                        }
                        className="w-16"
                      />
                      <img
                        src={getPreferenceIcon(gift.preference)}
                        alt={gift.preference}
                        className="absolute -top-2 -right-2 size-6"
                      />
                    </div>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
