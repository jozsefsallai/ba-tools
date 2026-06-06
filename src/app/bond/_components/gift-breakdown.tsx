"use client";

import type {
  GiftWithStudents,
  StudentWithGifts,
} from "@/app/bond/_lib/types";
import { getGiftAffinity, getGiftExpValue } from "@/app/bond/_lib/gift-utils";
import giftAdoredImage from "@/assets/images/gift_adored.png";
import giftLikedImage from "@/assets/images/gift_liked.png";
import giftLovedImage from "@/assets/images/gift_loved.png";
import giftNormalImage from "@/assets/images/gift_normal.png";
import { ItemCard } from "@/components/common/item-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { type PropsWithChildren, useMemo } from "react";

export type GiftBreakdownProps = PropsWithChildren<{
  gifts: GiftWithStudents[];
  allocatedCounts: Record<number, number>;
  allocatedBoxCount: number;
  selectedStudent: StudentWithGifts;
  exp: number;
}>;

function GiftRow({
  gift,
  count,
  selectedStudent,
}: {
  gift: GiftWithStudents;
  count: number;
  selectedStudent: StudentWithGifts;
}) {
  const t = useTranslations();
  const locale = useLocale();

  const affinity = getGiftAffinity(gift, selectedStudent);
  const exp = getGiftExpValue(gift, selectedStudent);

  const giftName = useMemo(() => {
    switch (locale) {
      case "en":
        return gift.name;
      case "jp":
        return gift.nameJP;
    }
  }, [gift, locale]);

  const giftDescription = useMemo(() => {
    switch (locale) {
      case "en":
        return gift.description;
      case "jp":
        return gift.descriptionJP;
    }
  }, [gift, locale]);

  return (
    <TableRow className="table table-fixed w-full">
      <TableCell>
        <ItemCard
          name={giftName}
          iconName={gift.iconName}
          description={giftDescription}
          rarity={gift.rarity}
          displayName={false}
        />
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-1">
          {affinity === "adored" && (
            <Image
              src={giftAdoredImage}
              alt={t("tools.bond.item.adored")}
              className="size-6"
            />
          )}

          {affinity === "loved" && (
            <Image
              src={giftLovedImage}
              alt={t("tools.bond.item.loved")}
              className="size-6"
            />
          )}

          {affinity === "liked" && (
            <Image
              src={giftLikedImage}
              alt={t("tools.bond.item.liked")}
              className="size-6"
            />
          )}

          {affinity === "normal" && (
            <Image
              src={giftNormalImage}
              alt={t("tools.bond.item.normal")}
              className="size-6"
            />
          )}

          {exp}
        </div>
      </TableCell>

      <TableCell>{count}</TableCell>

      <TableCell>{exp * count}</TableCell>
    </TableRow>
  );
}

export function GiftBreakdown({
  gifts,
  allocatedCounts,
  allocatedBoxCount,
  selectedStudent,
  exp,
  children,
}: GiftBreakdownProps) {
  const t = useTranslations();

  const giftsWithCounts = useMemo(() => {
    return gifts.filter((gift) => (allocatedCounts[gift.id] ?? 0) > 0);
  }, [gifts, allocatedCounts]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tools.bond.breakdown.title")}</DialogTitle>

          <DialogDescription>
            {t("tools.bond.breakdown.description")}
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader className="block">
            <TableRow className="table table-fixed w-full">
              <TableHead>{t("tools.bond.breakdown.table.gift")}</TableHead>

              <TableHead>{t("tools.bond.breakdown.table.unitExp")}</TableHead>

              <TableHead>{t("tools.bond.breakdown.table.count")}</TableHead>

              <TableHead>{t("tools.bond.breakdown.table.totalExp")}</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="block max-h-[400px] overflow-y-auto">
            {giftsWithCounts.map((gift) => (
              <GiftRow
                key={gift.id}
                gift={gift}
                count={allocatedCounts[gift.id] ?? 0}
                selectedStudent={selectedStudent}
              />
            ))}

            {allocatedBoxCount > 0 && (
              <TableRow className="table table-fixed w-full">
                <TableCell>
                  <ItemCard
                    name={t("tools.bond.choiceBox.name")}
                    iconName="item_icon_favor_selection"
                    description={t("tools.bond.choiceBox.description")}
                    rarity="SR"
                    displayName={false}
                  />
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-1">
                    <Image
                      src={giftLovedImage}
                      alt="Loved"
                      className="size-6"
                    />
                    60
                  </div>
                </TableCell>

                <TableCell>{allocatedBoxCount}</TableCell>

                <TableCell>{allocatedBoxCount * 60}</TableCell>
              </TableRow>
            )}
          </TableBody>

          <TableFooter className="block">
            <TableRow className="text-lg table table-fixed w-full">
              <TableCell colSpan={3} className="text-right font-bold">
                {t("tools.bond.breakdown.total")}
              </TableCell>
              <TableCell>{exp}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        <DialogFooter>
          <DialogClose asChild>
            <Button>{t("tools.bond.breakdown.close")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
