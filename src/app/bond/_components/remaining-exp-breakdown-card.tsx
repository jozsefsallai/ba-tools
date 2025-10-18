import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import headpatImage from "@/assets/images/headpat.png";
import giftAdoredImage from "@/assets/images/gift_adored.png";
import giftLovedImage from "@/assets/images/gift_loved.png";
import giftLikedImage from "@/assets/images/gift_liked.png";
import giftNormalImage from "@/assets/images/gift_normal.png";

import Image, { type StaticImageData } from "next/image";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export type RemainingExpBreakdown = {
  headpats: number;
  normalSRGifts: number;
  likedSRGifts: number;
  lovedSRGifts: number;
  adoredSRGifts: number;
  likedSSRGifts: number;
  lovedSSRGifts: number;
  adoredSSRGifts: number;
};

export const EXP_VALUES: RemainingExpBreakdown = {
  headpats: 15,
  normalSRGifts: 20,
  likedSRGifts: 40,
  lovedSRGifts: 60,
  adoredSRGifts: 80,
  likedSSRGifts: 120,
  lovedSSRGifts: 180,
  adoredSSRGifts: 240,
};

export type RemainingExpBreakdownCardProps = {
  currentBond: number;
  targetBond: number | null;
  expNeeded: number;
  breakdown: RemainingExpBreakdown;
};

function BreakdownItem({
  image,
  label,
  count,
  wasted,
}: {
  image: string | StaticImageData;
  label: string;
  count: number;
  wasted: number;
}) {
  return (
    <div
      className={cn("flex flex-col items-center gap-1", {
        "grayscale opacity-50": count <= 0,
      })}
    >
      <Image src={image} className="size-9" alt={label} />
      <span className="text-xs font-semibold">{label}</span>
      <span className="text-lg font-bold">{count || "N/A"}</span>
      {wasted > 0 && (
        <span className="text-xs text-muted-foreground">
          Wasted {wasted} EXP
        </span>
      )}
    </div>
  );
}

export function RemainingExpBreakdownCard({
  currentBond,
  targetBond,
  expNeeded,
  breakdown,
}: RemainingExpBreakdownCardProps) {
  const [excludeSSRGifts, setExcludeSSRGifts] = useState(false);

  const wastedEXPMap = useMemo<RemainingExpBreakdown>(() => {
    const map: RemainingExpBreakdown = {
      headpats: 0,
      normalSRGifts: 0,
      likedSRGifts: 0,
      lovedSRGifts: 0,
      adoredSRGifts: 0,
      likedSSRGifts: 0,
      lovedSSRGifts: 0,
      adoredSSRGifts: 0,
    };

    (Object.keys(breakdown) as (keyof RemainingExpBreakdown)[]).forEach(
      (key) => {
        const count = breakdown[key];
        const expPerUnit = EXP_VALUES[key];
        const totalExp = count * expPerUnit;

        if (totalExp >= expNeeded) {
          map[key] = totalExp - expNeeded;
        }
      },
    );

    return map;
  }, [expNeeded, breakdown]);

  const hasWastedEXP = useMemo(() => {
    return Object.values(wastedEXPMap).some((wasted) => wasted > 0);
  }, [wastedEXPMap]);

  const optimalBreakdown = useMemo<RemainingExpBreakdown>(() => {
    const result: RemainingExpBreakdown = {
      headpats: 0,
      normalSRGifts: 0,
      likedSRGifts: 0,
      lovedSRGifts: 0,
      adoredSRGifts: 0,
      likedSSRGifts: 0,
      lovedSSRGifts: 0,
      adoredSSRGifts: 0,
    };

    const dp = new Array(expNeeded + 1).fill(Number.POSITIVE_INFINITY);
    dp[0] = 0;

    for (const key of Object.keys(
      breakdown,
    ) as (keyof RemainingExpBreakdown)[]) {
      if (excludeSSRGifts && key.endsWith("SSRGifts")) {
        continue;
      }

      const expPerUnit = EXP_VALUES[key];
      const maxCount = breakdown[key];

      for (let count = 1; count <= maxCount; count++) {
        const totalExp = count * expPerUnit;

        for (let j = expNeeded; j >= totalExp; j--) {
          if (dp[j - totalExp] + count < dp[j]) {
            dp[j] = dp[j - totalExp] + count;
          }
        }
      }
    }

    let remainingExp = expNeeded;

    for (const key of Object.keys(
      breakdown,
    ) as (keyof RemainingExpBreakdown)[]) {
      const expPerUnit = EXP_VALUES[key];
      let count = 0;

      while (
        remainingExp >= expPerUnit &&
        dp[remainingExp] === dp[remainingExp - expPerUnit] + 1
      ) {
        remainingExp -= expPerUnit;
        count++;
      }

      result[key] = count;
    }

    return result;
  }, [breakdown, expNeeded, excludeSSRGifts]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          EXP Needed to Reach Rank {targetBond}: {expNeeded}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="text-xs text-muted-foreground">
          In order to go from <strong>Rank {currentBond}</strong> to{" "}
          <strong>Rank {targetBond}</strong>, you will need one of the
          following:
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-4">
          <BreakdownItem
            image={headpatImage}
            label="Headpats"
            count={breakdown.headpats}
            wasted={wastedEXPMap.headpats}
          />

          <BreakdownItem
            image={giftLikedImage}
            label="Liked SSR Gifts"
            count={breakdown.likedSSRGifts}
            wasted={wastedEXPMap.likedSSRGifts}
          />

          <BreakdownItem
            image={giftLovedImage}
            label="Loved SSR Gifts"
            count={breakdown.lovedSSRGifts}
            wasted={wastedEXPMap.lovedSSRGifts}
          />

          <BreakdownItem
            image={giftAdoredImage}
            label="Adored SSR Gifts"
            count={breakdown.adoredSSRGifts}
            wasted={wastedEXPMap.adoredSSRGifts}
          />

          <BreakdownItem
            image={giftNormalImage}
            label="Normal SR Gifts"
            count={breakdown.normalSRGifts}
            wasted={wastedEXPMap.normalSRGifts}
          />

          <BreakdownItem
            image={giftLikedImage}
            label="Liked SR Gifts"
            count={breakdown.likedSRGifts}
            wasted={wastedEXPMap.likedSRGifts}
          />

          <BreakdownItem
            image={giftLovedImage}
            label="Loved SR Gifts"
            count={breakdown.lovedSRGifts}
            wasted={wastedEXPMap.lovedSRGifts}
          />

          <BreakdownItem
            image={giftAdoredImage}
            label="Adored SR Gifts"
            count={breakdown.adoredSRGifts}
            wasted={wastedEXPMap.adoredSRGifts}
          />
        </div>

        {hasWastedEXP && <Separator />}

        {hasWastedEXP && (
          <div className="flex flex-col gap-4">
            <div className="font-semibold">
              Optimal Gift and Headpat Breakdown
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="exclude-ssr-gifts"
                checked={excludeSSRGifts}
                onCheckedChange={setExcludeSSRGifts}
              />

              <Label htmlFor="exclude-ssr-gifts">Exclude SSR Gifts</Label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-4">
              <BreakdownItem
                image={headpatImage}
                label="Headpats"
                count={optimalBreakdown.headpats}
                wasted={0}
              />

              <BreakdownItem
                image={giftLikedImage}
                label="Liked SSR Gifts"
                count={optimalBreakdown.likedSSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftLovedImage}
                label="Loved SSR Gifts"
                count={optimalBreakdown.lovedSSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftAdoredImage}
                label="Adored SSR Gifts"
                count={optimalBreakdown.adoredSSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftNormalImage}
                label="Normal SR Gifts"
                count={optimalBreakdown.normalSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftLikedImage}
                label="Liked SR Gifts"
                count={optimalBreakdown.likedSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftLovedImage}
                label="Loved SR Gifts"
                count={optimalBreakdown.lovedSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftAdoredImage}
                label="Adored SR Gifts"
                count={optimalBreakdown.adoredSRGifts}
                wasted={0}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
