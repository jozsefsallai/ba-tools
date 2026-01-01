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
import { LessonsTable } from "@/app/bond/_components/lessons-table";
import { useTranslations } from "next-intl";

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
  currentBond: string;
  targetBond: string | null;
  expNeeded: number;
  breakdown: RemainingExpBreakdown;
};

const ALL_BREAKDOWN_KEYS: (keyof RemainingExpBreakdown)[] = [
  "headpats",
  "normalSRGifts",
  "likedSRGifts",
  "lovedSRGifts",
  "adoredSRGifts",
  "likedSSRGifts",
  "lovedSSRGifts",
  "adoredSSRGifts",
];

const NON_SSR_BREAKDOWN_KEYS: (keyof RemainingExpBreakdown)[] = [
  "headpats",
  "normalSRGifts",
  "likedSRGifts",
  "lovedSRGifts",
  "adoredSRGifts",
];

type WastedEXPResult = {
  hasWastedEXP: boolean;
  wastedEXPMap: RemainingExpBreakdown;
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
  const t = useTranslations();

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
          {t("tools.bond.remaining.wasted", { wasted })}
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
  const t = useTranslations();

  const [excludeSSRGifts, setExcludeSSRGifts] = useState(false);

  const wastedEXP = useMemo<WastedEXPResult>(() => {
    const result: WastedEXPResult = {
      hasWastedEXP: false,
      wastedEXPMap: {
        headpats: 0,
        normalSRGifts: 0,
        likedSRGifts: 0,
        lovedSRGifts: 0,
        adoredSRGifts: 0,
        likedSSRGifts: 0,
        lovedSSRGifts: 0,
        adoredSSRGifts: 0,
      },
    };

    ALL_BREAKDOWN_KEYS.forEach((key) => {
      const count = breakdown[key];
      const expPerUnit = EXP_VALUES[key];
      const totalExp = count * expPerUnit;

      if (totalExp >= expNeeded) {
        result.hasWastedEXP = true;
        result.wastedEXPMap[key] = totalExp - expNeeded;
      }
    });

    return result;
  }, [expNeeded, breakdown]);

  const paddedExp = useMemo(() => {
    return expNeeded % 15 === 0
      ? expNeeded
      : expNeeded + (15 - (expNeeded % 15));
  }, [expNeeded]);

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

    const BREAKDOWN_KEYS = (
      excludeSSRGifts ? NON_SSR_BREAKDOWN_KEYS : ALL_BREAKDOWN_KEYS
    ).filter((key) => breakdown[key] > 0);

    const localExpValues = BREAKDOWN_KEYS.map((key) => EXP_VALUES[key]);

    const dp = new Array(paddedExp + 1).fill(Number.POSITIVE_INFINITY);
    dp[0] = 0;

    for (const expValue of localExpValues) {
      for (let j = expValue; j <= paddedExp; ++j) {
        if (dp[j - expValue] !== Number.POSITIVE_INFINITY) {
          dp[j] = Math.min(dp[j], dp[j - expValue] + 1);
        }
      }
    }

    if (dp[paddedExp] === Number.POSITIVE_INFINITY) {
      // should probably never happen tbh
      return result;
    }

    let current = paddedExp;

    while (current > 0) {
      for (let i = BREAKDOWN_KEYS.length - 1; i >= 0; --i) {
        const key = BREAKDOWN_KEYS[i];
        const expValue = EXP_VALUES[key];

        if (current >= expValue && dp[current] === dp[current - expValue] + 1) {
          result[key]++;
          current -= expValue;
          break;
        }
      }
    }

    return result;
  }, [breakdown, expNeeded, excludeSSRGifts]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>
          {t("tools.bond.remaining.title", {
            targetBond: targetBond ?? "",
            expNeeded,
          })}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        <div className="text-xs text-muted-foreground">
          {t.rich("tools.bond.remaining.description", {
            strong: (children) => <strong>{children}</strong>,
            currentBond,
            targetBond: targetBond ?? "",
          })}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-4">
          <BreakdownItem
            image={headpatImage}
            label={t("tools.bond.remaining.headpats")}
            count={breakdown.headpats}
            wasted={wastedEXP.wastedEXPMap.headpats}
          />

          <BreakdownItem
            image={giftLikedImage}
            label={t("tools.bond.remaining.likedSSR")}
            count={breakdown.likedSSRGifts}
            wasted={wastedEXP.wastedEXPMap.likedSSRGifts}
          />

          <BreakdownItem
            image={giftLovedImage}
            label={t("tools.bond.remaining.lovedSSR")}
            count={breakdown.lovedSSRGifts}
            wasted={wastedEXP.wastedEXPMap.lovedSSRGifts}
          />

          <BreakdownItem
            image={giftAdoredImage}
            label={t("tools.bond.remaining.adoredSSR")}
            count={breakdown.adoredSSRGifts}
            wasted={wastedEXP.wastedEXPMap.adoredSSRGifts}
          />

          <BreakdownItem
            image={giftNormalImage}
            label={t("tools.bond.remaining.normalSR")}
            count={breakdown.normalSRGifts}
            wasted={wastedEXP.wastedEXPMap.normalSRGifts}
          />

          <BreakdownItem
            image={giftLikedImage}
            label={t("tools.bond.remaining.likedSR")}
            count={breakdown.likedSRGifts}
            wasted={wastedEXP.wastedEXPMap.likedSRGifts}
          />

          <BreakdownItem
            image={giftLovedImage}
            label={t("tools.bond.remaining.lovedSR")}
            count={breakdown.lovedSRGifts}
            wasted={wastedEXP.wastedEXPMap.lovedSRGifts}
          />

          <BreakdownItem
            image={giftAdoredImage}
            label={t("tools.bond.remaining.adoredSR")}
            count={breakdown.adoredSRGifts}
            wasted={wastedEXP.wastedEXPMap.adoredSRGifts}
          />
        </div>

        {wastedEXP.hasWastedEXP && <Separator />}

        {wastedEXP.hasWastedEXP && (
          <div className="flex flex-col gap-4">
            <div className="font-semibold">
              {t("tools.bond.remaining.optimal")}
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="exclude-ssr-gifts"
                checked={excludeSSRGifts}
                onCheckedChange={setExcludeSSRGifts}
              />

              <Label htmlFor="exclude-ssr-gifts">
                {t("tools.bond.remaining.excludeSSR")}
              </Label>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 grid-rows-4 md:grid-rows-2 gap-4">
              <BreakdownItem
                image={headpatImage}
                label={t("tools.bond.remaining.headpats")}
                count={optimalBreakdown.headpats}
                wasted={0}
              />

              <BreakdownItem
                image={giftLikedImage}
                label={t("tools.bond.remaining.likedSSR")}
                count={optimalBreakdown.likedSSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftLovedImage}
                label={t("tools.bond.remaining.lovedSSR")}
                count={optimalBreakdown.lovedSSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftAdoredImage}
                label={t("tools.bond.remaining.adoredSSR")}
                count={optimalBreakdown.adoredSSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftNormalImage}
                label={t("tools.bond.remaining.normalSR")}
                count={optimalBreakdown.normalSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftLikedImage}
                label={t("tools.bond.remaining.likedSR")}
                count={optimalBreakdown.likedSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftLovedImage}
                label={t("tools.bond.remaining.lovedSR")}
                count={optimalBreakdown.lovedSRGifts}
                wasted={0}
              />

              <BreakdownItem
                image={giftAdoredImage}
                label={t("tools.bond.remaining.adoredSR")}
                count={optimalBreakdown.adoredSRGifts}
                wasted={0}
              />
            </div>

            {paddedExp > expNeeded && (
              <div className="text-xs text-muted-foreground">
                {t("tools.bond.remaining.optimalNote", { paddedExp })}
              </div>
            )}
          </div>
        )}

        <Separator />

        <LessonsTable exp={expNeeded} />
      </CardContent>
    </Card>
  );
}
