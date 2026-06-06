"use client";

import type { GiftWithStudents, StudentWithGifts } from "@/app/bond/_lib/types";
import giftAdoredImage from "@/assets/images/gift_adored.png";
import giftLikedImage from "@/assets/images/gift_liked.png";
import giftLovedImage from "@/assets/images/gift_loved.png";
import giftNormalImage from "@/assets/images/gift_normal.png";
import { ItemCard } from "@/components/common/item-card";
import { StudentCard } from "@/components/common/student-card";
import { cn } from "@/lib/utils";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo } from "react";

export function GiftItemCard({ gift }: { gift: GiftWithStudents }) {
  const locale = useLocale();

  const giftName = useMemo(() => {
    switch (locale) {
      case "en":
        return gift.name;
      case "jp":
        return gift.nameJP || gift.name;
    }
  }, [gift, locale]);

  const giftDescription = useMemo(() => {
    switch (locale) {
      case "en":
        return gift.description;
      case "jp":
        return gift.descriptionJP || gift.description;
    }
  }, [gift, locale]);

  return (
    <ItemCard
      name={giftName}
      iconName={gift.iconName}
      description={giftDescription}
      rarity={gift.rarity}
      displayName={false}
      className="cursor-pointer"
    />
  );
}

export function GiftInfo({ gift }: { gift: GiftWithStudents }) {
  const t = useTranslations();
  const locale = useLocale();

  const giftName = useMemo(() => {
    switch (locale) {
      case "en":
        return gift.name;
      case "jp":
        return gift.nameJP || gift.name;
    }
  }, [gift, locale]);

  const giftDescription = useMemo(() => {
    switch (locale) {
      case "en":
        return gift.description;
      case "jp":
        return gift.descriptionJP || gift.description;
    }
  }, [gift, locale]);

  return (
    <div
      className={cn("flex flex-col gap-4 p-4", {
        "bg-yellow-500/10": gift.rarity === "SR",
        "bg-purple-500/10": gift.rarity === "SSR",
      })}
    >
      <div className="text-lg font-bold">{giftName}</div>

      {giftDescription && (
        <div className="text-sm text-muted-foreground">{giftDescription}</div>
      )}

      {gift.isLovedByEveryone && (
        <div className="flex gap-2 items-center justify-center">
          <Image
            src={gift.expValue === 60 ? giftAdoredImage : giftLovedImage}
            alt={
              gift.expValue === 60
                ? t("tools.bond.item.adored")
                : t("tools.bond.item.loved")
            }
            className="size-6"
          />
          {t.rich("tools.bond.item.universal", {
            strong: (children) => <strong>{children}</strong>,
            expValue: gift.expValue,
            exp: (gift.expValue === 60 ? 4 : 3) * gift.expValue,
          })}
        </div>
      )}

      {gift.adoredBy.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="font-semibold flex gap-2 items-center">
            <Image
              src={giftAdoredImage}
              alt={t("tools.bond.item.adored")}
              className="size-6"
            />
            {t("tools.bond.item.adoredBy", { exp: 4 * gift.expValue })}
          </div>

          <div className="flex flex-wrap gap-2">
            {gift.adoredBy.map((student) => (
              <div key={student.id} style={{ zoom: 0.6 }} title={student.name}>
                <StudentCard student={student} noDisplayRole />
              </div>
            ))}
          </div>
        </div>
      )}

      {gift.lovedBy.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="font-semibold flex gap-2 items-center">
            <Image
              src={giftLovedImage}
              alt={t("tools.bond.item.loved")}
              className="size-6"
            />
            {t("tools.bond.item.lovedBy", { exp: 3 * gift.expValue })}
          </div>

          <div className="flex flex-wrap gap-2">
            {gift.lovedBy.map((student) => (
              <div key={student.id} style={{ zoom: 0.6 }} title={student.name}>
                <StudentCard student={student} noDisplayRole />
              </div>
            ))}
          </div>
        </div>
      )}

      {gift.likedBy.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="font-semibold flex gap-2 items-center">
            <Image
              src={giftLikedImage}
              alt={t("tools.bond.item.liked")}
              className="size-6"
            />
            {t("tools.bond.item.likedBy", { exp: 2 * gift.expValue })}
          </div>

          <div className="flex flex-wrap gap-2">
            {gift.likedBy.map((student) => (
              <div key={student.id} style={{ zoom: 0.6 }} title={student.name}>
                <StudentCard student={student} noDisplayRole />
              </div>
            ))}
          </div>
        </div>
      )}

      {!gift.isLovedByEveryone && (
        <div className="flex gap-2 items-center justify-center">
          <Image
            src={gift.rarity === "SSR" ? giftLikedImage : giftNormalImage}
            alt={gift.rarity === "SSR" ? "Liked" : "Normal"}
            className="size-6"
          />
          {t.rich("tools.bond.item.everyoneElse", {
            strong: (children) => <strong>{children}</strong>,
            exp: gift.rarity === "SSR" ? gift.expValue * 2 : gift.expValue,
          })}
        </div>
      )}
    </div>
  );
}

export function GiftAffinityIcon({
  gift,
  student,
  className = "size-6 shrink-0",
}: {
  gift: GiftWithStudents;
  student: StudentWithGifts;
  className?: string;
}) {
  const t = useTranslations();

  const isAdored =
    student.giftsAdored.some((g) => g.id === gift.id) ||
    (gift.isLovedByEveryone && gift.expValue === 60);
  const isLoved =
    student.giftsLoved.some((g) => g.id === gift.id) ||
    (gift.isLovedByEveryone && gift.expValue !== 60);
  const isLiked = student.giftsLiked.some((g) => g.id === gift.id);

  if (isAdored) {
    return (
      <Image
        src={giftAdoredImage}
        alt={t("tools.bond.item.adored")}
        className={className}
        title={`${gift.expValue * 4} EXP`}
      />
    );
  }

  if (isLoved) {
    return (
      <Image
        src={giftLovedImage}
        alt={t("tools.bond.item.loved")}
        className={className}
        title={`${gift.expValue * 3} EXP`}
      />
    );
  }

  if (isLiked) {
    return (
      <Image
        src={giftLikedImage}
        alt={t("tools.bond.item.liked")}
        className={className}
        title={`${gift.expValue * 2} EXP`}
      />
    );
  }

  return (
    <Image
      src={gift.rarity === "SSR" ? giftLikedImage : giftNormalImage}
      alt={t("tools.bond.item.normal")}
      className={className}
      title={`${gift.rarity === "SSR" ? gift.expValue * 2 : gift.expValue} EXP`}
    />
  );
}
