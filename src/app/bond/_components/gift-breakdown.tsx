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

export type GiftBreakdownProps = PropsWithChildren<{
  gifts: GiftWithStudents[];
  giftCounts: Record<number, number>;
  giftBoxesUsed: number;
  selectedStudentId: string;
  exp: number;
}>;

function GiftRow({
  gift,
  count,
  selectedStudentId,
}: { gift: GiftWithStudents; count: number; selectedStudentId: string }) {
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

  return (
    <TableRow className="table table-fixed w-full">
      <TableCell>
        <ItemCard
          name={gift.name}
          iconName={gift.iconName}
          description={gift.description}
          rarity={gift.rarity}
          displayName={false}
        />
      </TableCell>

      <TableCell>
        <div className="flex items-center gap-1">
          {isAdored && (
            <Image src={giftAdoredImage} alt="Adored" className="size-6" />
          )}

          {isLoved && (
            <Image src={giftLovedImage} alt="Loved" className="size-6" />
          )}

          {isLiked && (
            <Image src={giftLikedImage} alt="Liked" className="size-6" />
          )}

          {!isAdored && !isLoved && !isLiked && (
            <Image src={giftNormalImage} alt="Normal" className="size-6" />
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
  giftBoxesUsed,
  selectedStudentId,
  exp,
  children,
}: GiftBreakdownProps) {
  const giftsWithCounts = useMemo(() => {
    return gifts.filter((gift) => giftCounts[gift.id] > 0);
  }, [gifts, giftCounts]);

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gift Breakdown</DialogTitle>

          <DialogDescription>
            Breakdown of gifts and their EXP values.
          </DialogDescription>
        </DialogHeader>

        <Table>
          <TableHeader className="block">
            <TableRow className="table table-fixed w-full">
              <TableHead>Gift</TableHead>

              <TableHead>Unit EXP</TableHead>

              <TableHead>Count</TableHead>

              <TableHead>Total EXP</TableHead>
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
                    name="Gift Choice Box"
                    iconName="item_icon_favor_selection"
                    description="A gift box that lets you choose the gift you want."
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
                Total
              </TableCell>
              <TableCell>{exp}</TableCell>
            </TableRow>
          </TableFooter>
        </Table>

        <DialogFooter>
          <DialogClose asChild>
            <Button>Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
