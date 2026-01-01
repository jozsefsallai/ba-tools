"use client";

import type { GiftWithStudents } from "@/app/bond/_components/bond-view";
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
import { type PropsWithChildren, useMemo } from "react";

import giftAdoredImage from "@/assets/images/gift_adored.png";
import giftLovedImage from "@/assets/images/gift_loved.png";
import giftLikedImage from "@/assets/images/gift_liked.png";
import giftNormalImage from "@/assets/images/gift_normal.png";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";

export type GiftBreakdownProps = PropsWithChildren<{
  gifts: GiftWithStudents[];
  giftCounts: Record<number, number>;
  giftEnabled: Record<number, boolean>;
  giftBoxesUsed: number;
  selectedStudentId: string;
  exp: number;
}>;

function GiftRow({
  gift,
  count,
  selectedStudentId,
}: { gift: GiftWithStudents; count: number; selectedStudentId: string }) {
  const t = useTranslations();
  const locale = useLocale();

  const isAdored =
    gift.adoredBy.some((s) => s.id === selectedStudentId) ||
    (gift.isLovedByEveryone && gift.expValue === 60);

  const isLoved =
    gift.lovedBy.some((s) => s.id === selectedStudentId) ||
    (gift.isLovedByEveryone && gift.expValue !== 60);

  const isLiked = gift.likedBy.some((s) => s.id === selectedStudentId);

  const exp = useMemo(() => {
    if (isAdored) {
      return gift.expValue * 4;
    }

    if (isLoved) {
      return gift.expValue * 3;
    }

    if (isLiked) {
      return gift.expValue * 2;
    }

    return gift.rarity === "SSR" ? gift.expValue * 2 : gift.expValue;
  }, [isAdored, isLoved, isLiked, gift]);

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
          {isAdored && (
            <Image
              src={giftAdoredImage}
              alt={t("tools.bond.item.adored")}
              className="size-6"
            />
          )}

          {isLoved && (
            <Image
              src={giftLovedImage}
              alt={t("tools.bond.item.loved")}
              className="size-6"
            />
          )}

          {isLiked && (
            <Image
              src={giftLikedImage}
              alt={t("tools.bond.item.liked")}
              className="size-6"
            />
          )}

          {!isAdored && !isLoved && !isLiked && (
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
  giftCounts,
  giftEnabled,
  giftBoxesUsed,
  selectedStudentId,
  exp,
  children,
}: GiftBreakdownProps) {
  const t = useTranslations();

  const giftsWithCounts = useMemo(() => {
    return gifts.filter(
      (gift) => giftCounts[gift.id] > 0 && giftEnabled[gift.id],
    );
  }, [gifts, giftCounts, giftEnabled]);

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
                count={giftCounts[gift.id]}
                selectedStudentId={selectedStudentId}
              />
            ))}

            {giftBoxesUsed > 0 && (
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

                <TableCell>{giftBoxesUsed}</TableCell>

                <TableCell>{giftBoxesUsed * 60}</TableCell>
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
