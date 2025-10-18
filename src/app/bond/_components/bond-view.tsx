"use client";

import { ItemCard } from "@/components/common/item-card";
import { StudentCard } from "@/components/common/student-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { buildStudentPortraitUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { Gift, Student } from "@prisma/client";
import { AlertCircleIcon, ChevronsUpDownIcon } from "lucide-react";
import { useMemo, useState } from "react";

import giftAdoredImage from "@/assets/images/gift_adored.png";
import giftLovedImage from "@/assets/images/gift_loved.png";
import giftLikedImage from "@/assets/images/gift_liked.png";
import giftNormalImage from "@/assets/images/gift_normal.png";

import Image from "next/image";
import { BondProgress } from "@/app/bond/_components/bond-progress";
import { favorTable } from "@/lib/favor-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GiftBreakdown } from "@/app/bond/_components/gift-breakdown";
import { StudentPicker } from "@/components/common/student-picker";
import { studentStorage } from "@/lib/storage/students";
import {
  EXP_VALUES,
  type RemainingExpBreakdown,
  RemainingExpBreakdownCard,
} from "@/app/bond/_components/remaining-exp-breakdown-card";

export type StudentWithGifts = Student & {
  giftsAdored: Gift[];
  giftsLoved: Gift[];
  giftsLiked: Gift[];
};

export type GiftWithStudents = Gift & {
  adoredBy: Student[];
  lovedBy: Student[];
  likedBy: Student[];
};

export type BondViewProps = {
  students: StudentWithGifts[];
  gifts: GiftWithStudents[];
};

function isGiftAdoredByStudent(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  return student.giftsAdored.some((g) => g.id === gift.id);
}

function isGiftLovedByStudent(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  return student.giftsLoved.some((g) => g.id === gift.id);
}

function isGiftLikedByStudent(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  return student.giftsLiked.some((g) => g.id === gift.id);
}

function GiftInfo({
  gift,
}: {
  gift: GiftWithStudents;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-lg font-bold">{gift.name}</div>

      {gift.description && (
        <div className="text-sm text-muted-foreground">{gift.description}</div>
      )}

      {gift.isLovedByEveryone && (
        <div className="flex gap-2 items-center justify-center">
          <Image
            src={gift.expValue === 60 ? giftAdoredImage : giftLovedImage}
            alt={gift.expValue === 60 ? "Adored" : "Loved"}
            className="size-6"
          />
          This gift is {gift.expValue === 60 ? "adored" : "loved"} by everyone
          and gives{" "}
          <strong>{(gift.expValue === 60 ? 4 : 3) * gift.expValue} EXP!</strong>
        </div>
      )}

      {gift.adoredBy.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="font-semibold flex gap-2 items-center">
            <Image src={giftAdoredImage} alt="Adored" className="size-6" />
            Adored by ({4 * gift.expValue} EXP):
          </div>

          <div className="flex flex-wrap gap-2">
            {gift.adoredBy.map((student) => (
              <div key={student.id} style={{ zoom: 0.6 }} title={student.name}>
                <StudentCard key={student.id} student={student} noDisplayRole />
              </div>
            ))}
          </div>
        </div>
      )}

      {gift.lovedBy.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="font-semibold flex gap-2 items-center">
            <Image src={giftLovedImage} alt="Loved" className="size-6" />
            Loved by ({3 * gift.expValue} EXP):
          </div>

          <div className="flex flex-wrap gap-2">
            {gift.lovedBy.map((student) => (
              <div key={student.id} style={{ zoom: 0.6 }} title={student.name}>
                <StudentCard key={student.id} student={student} noDisplayRole />
              </div>
            ))}
          </div>
        </div>
      )}

      {gift.likedBy.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="font-semibold flex gap-2 items-center">
            <Image src={giftLikedImage} alt="Liked" className="size-6" />
            Liked by ({2 * gift.expValue} EXP):
          </div>

          <div className="flex flex-wrap gap-2">
            {gift.likedBy.map((student) => (
              <div key={student.id} style={{ zoom: 0.6 }} title={student.name}>
                <StudentCard key={student.id} student={student} noDisplayRole />
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
          Gives{" "}
          <strong>
            {gift.rarity === "SSR" ? gift.expValue * 2 : gift.expValue}
          </strong>{" "}
          EXP to everyone else.
        </div>
      )}
    </div>
  );
}

export function BondView({ students, gifts }: BondViewProps) {
  const [onlyDisplayRelevantGifts, setOnlyDisplayRelevantGifts] =
    useState(false);

  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithGifts | null>(null);

  const [giftCounts, setGiftCounts] = useState<Record<number, number>>(
    Object.fromEntries(gifts.map((gift) => [gift.id, 0])),
  );

  const [currentBond, setCurrentBond] = useState(1);
  const [targetBond, setTargetBond] = useState<number | null>(null);

  const [giftBoxesUsed, setGiftBoxesUsed] = useState(0);

  const displayedGifts = useMemo(() => {
    if (!onlyDisplayRelevantGifts || !selectedStudent) {
      return gifts;
    }

    return gifts.filter((gift) => {
      return (
        gift.isLovedByEveryone ||
        isGiftAdoredByStudent(gift, selectedStudent) ||
        isGiftLovedByStudent(gift, selectedStudent) ||
        isGiftLikedByStudent(gift, selectedStudent)
      );
    });
  }, [onlyDisplayRelevantGifts, selectedStudent]);

  const expOffset = useMemo(() => {
    const entry = favorTable.find((e) => e.level === currentBond);
    if (!entry) {
      return 0;
    }

    return entry.totalExp;
  }, [currentBond]);

  const studentGiftKinds = useMemo(() => {
    if (!selectedStudent) {
      return {
        hasAdoredSSR: false,
        hasLovedSSR: false,
        hasLikedSSR: false,
        hasAdoredSR: false,
        hasLovedSR: false,
        hasLikedSR: false,
        hasNormalSR: false,
      };
    }

    const hasAdoredSSR = true; // Everyone adores red and purple bouquets
    const hasLovedSSR = true; // Everyone loves the normal bouquets
    const hasLikedSSR = true; // Everyone likes SSR gifts

    const hasAdoredSR = selectedStudent.giftsAdored.some(
      (g) => g.rarity === "SR",
    );
    const hasLovedSR = selectedStudent.giftsLoved.some(
      (g) => g.rarity === "SR",
    );
    const hasLikedSR = selectedStudent.giftsLiked.some(
      (g) => g.rarity === "SR",
    );
    const hasNormalSR = true; // Everyone is content with a gift of any kind

    return {
      hasAdoredSSR,
      hasLovedSSR,
      hasLikedSSR,
      hasAdoredSR,
      hasLovedSR,
      hasLikedSR,
      hasNormalSR,
    };
  }, [gifts, selectedStudent]);

  const totalExp = useMemo(() => {
    if (!selectedStudent) {
      return 0;
    }

    let total = expOffset;

    for (const gift of gifts) {
      const isAdored = gift.adoredBy.some((s) => s.id === selectedStudent.id);
      if (isAdored) {
        total += giftCounts[gift.id] * gift.expValue * 4;
        continue;
      }

      const isLoved = gift.lovedBy.some((s) => s.id === selectedStudent.id);
      if (isLoved) {
        total += giftCounts[gift.id] * gift.expValue * 3;
        continue;
      }

      const isLiked = gift.likedBy.some((s) => s.id === selectedStudent.id);
      if (isLiked) {
        total += giftCounts[gift.id] * gift.expValue * 2;
        continue;
      }

      if (gift.isLovedByEveryone) {
        if (gift.expValue === 60) {
          total += giftCounts[gift.id] * gift.expValue * 4;
        } else {
          total += giftCounts[gift.id] * gift.expValue * 3;
        }

        continue;
      }

      if (gift.rarity === "SSR") {
        total += giftCounts[gift.id] * gift.expValue * 2;
      } else {
        total += giftCounts[gift.id] * gift.expValue;
      }
    }

    if (studentGiftKinds.hasAdoredSR) {
      total += giftBoxesUsed * 80;
      return total;
    }

    if (studentGiftKinds.hasLovedSR) {
      total += giftBoxesUsed * 60;
      return total;
    }

    total += giftBoxesUsed * 40;
    return total;
  }, [giftCounts, selectedStudent, expOffset, giftBoxesUsed]);

  const hasIrrelevantGifts = useMemo(() => {
    if (!selectedStudent || !onlyDisplayRelevantGifts) {
      return false;
    }

    return gifts.some((gift) => {
      if (giftCounts[gift.id] === 0) {
        return false;
      }

      return (
        !gift.isLovedByEveryone &&
        !isGiftAdoredByStudent(gift, selectedStudent) &&
        !isGiftLovedByStudent(gift, selectedStudent) &&
        !isGiftLikedByStudent(gift, selectedStudent)
      );
    });
  }, [onlyDisplayRelevantGifts, selectedStudent, giftCounts, studentGiftKinds]);

  const expForTargetBond = useMemo(() => {
    if (targetBond === null) {
      return 0;
    }

    const entry = favorTable.find((e) => e.level === targetBond);
    if (!entry) {
      return 0;
    }

    return entry.totalExp;
  }, [targetBond]);

  const remainingExpBreakdown = useMemo<RemainingExpBreakdown | null>(() => {
    if (expForTargetBond === null) {
      return null;
    }

    const difference = expForTargetBond - totalExp;
    if (difference <= 0) {
      return null;
    }

    const result: RemainingExpBreakdown = {
      headpats: Math.ceil(difference / EXP_VALUES.headpats),
      normalSRGifts: 0,
      likedSRGifts: 0,
      lovedSRGifts: 0,
      adoredSRGifts: 0,
      likedSSRGifts: 0,
      lovedSSRGifts: 0,
      adoredSSRGifts: 0,
    };

    if (studentGiftKinds.hasNormalSR) {
      result.normalSRGifts = Math.ceil(difference / EXP_VALUES.normalSRGifts);
    }

    if (studentGiftKinds.hasLikedSR) {
      result.likedSRGifts = Math.ceil(difference / EXP_VALUES.likedSRGifts);
    }

    if (studentGiftKinds.hasLovedSR) {
      result.lovedSRGifts = Math.ceil(difference / EXP_VALUES.lovedSRGifts);
    }

    if (studentGiftKinds.hasAdoredSR) {
      result.adoredSRGifts = Math.ceil(difference / EXP_VALUES.adoredSRGifts);
    }

    if (studentGiftKinds.hasLikedSSR) {
      result.likedSSRGifts = Math.ceil(difference / EXP_VALUES.likedSSRGifts);
    }

    if (studentGiftKinds.hasLovedSSR) {
      result.lovedSSRGifts = Math.ceil(difference / EXP_VALUES.lovedSSRGifts);
    }

    if (studentGiftKinds.hasAdoredSSR) {
      result.adoredSSRGifts = Math.ceil(difference / EXP_VALUES.adoredSSRGifts);
    }

    return result;
  }, [expForTargetBond, totalExp, studentGiftKinds]);

  function updateCount(giftId: number, count: number) {
    setGiftCounts((prev) => ({
      ...prev,
      [giftId]: count,
    }));
  }

  function updateCurrentBond(value: number) {
    const clampedValue = Math.max(1, Math.min(value, 100));

    setCurrentBond(clampedValue);

    if (!selectedStudent) {
      return;
    }

    studentStorage.addOrUpdateStudent({
      id: selectedStudent.id,
      bond: clampedValue,
    });
  }

  function updateStudent(student: StudentWithGifts) {
    setSelectedStudent(student);

    const storedStudent = studentStorage.getStudent(student.id);
    if (storedStudent?.bond) {
      setCurrentBond(storedStudent.bond);
    }
  }

  return (
    <div className="flex flex-col-reverse md:flex-row gap-6">
      <div className="md:basis-2/3">
        <div className="flex flex-wrap gap-4 justify-center">
          {displayedGifts.map((gift) => (
            <div
              key={gift.id}
              className="flex flex-col items-center gap-2 relative"
            >
              <Popover>
                <PopoverTrigger className="flex-1 flex">
                  <ItemCard
                    name={gift.name}
                    iconName={gift.iconName}
                    description={gift.description}
                    rarity={gift.rarity}
                    className="cursor-pointer"
                  />
                </PopoverTrigger>

                <PopoverContent className="w-[90vw] md:w-[450px] p-4 ring-4 ring-primary/75 max-h-[500px] overflow-y-auto">
                  <GiftInfo gift={gift} />
                </PopoverContent>
              </Popover>

              <Input
                type="number"
                defaultValue={giftCounts[gift.id]}
                min={0}
                onClick={(e) => {
                  e.currentTarget.select();
                }}
                onChange={(e) => {
                  const value = Number(e.target.value);

                  if (Number.isNaN(value)) {
                    updateCount(gift.id, 0);
                  } else {
                    updateCount(gift.id, value);
                  }
                }}
                className={cn("w-16 no-arrows", {
                  "border-yellow-200 shadow-yellow-200 focus-visible:ring-yellow-200/50":
                    giftCounts[gift.id] > 0,
                })}
              />

              {selectedStudent && (
                <div className="absolute -top-3 -right-3">
                  {(gift.adoredBy.some((s) => s.id === selectedStudent.id) ||
                    (gift.isLovedByEveryone && gift.expValue === 60)) && (
                    <Image
                      src={giftAdoredImage}
                      alt="Adored"
                      className="size-8"
                      title={`${gift.expValue * 4} EXP`}
                    />
                  )}

                  {(gift.lovedBy.some((s) => s.id === selectedStudent.id) ||
                    (gift.isLovedByEveryone && gift.expValue !== 60)) && (
                    <Image
                      src={giftLovedImage}
                      alt="Loved"
                      className="size-8"
                      title={`${gift.expValue * 3} EXP`}
                    />
                  )}

                  {gift.likedBy.some((s) => s.id === selectedStudent.id) && (
                    <Image
                      src={giftLikedImage}
                      alt="Liked"
                      className="size-8"
                      title={`${gift.expValue * 2} EXP`}
                    />
                  )}
                </div>
              )}
            </div>
          ))}

          <div className="flex flex-col items-center gap-2 relative">
            <ItemCard
              name="Gift Choice Box"
              iconName="item_icon_favor_selection"
              description="A gift box that lets you choose the gift you want."
              rarity="SR"
              className="cursor-pointer"
            />

            <Input
              type="number"
              defaultValue={giftBoxesUsed}
              min={0}
              onClick={(e) => {
                e.currentTarget.select();
              }}
              onChange={(e) => {
                const value = Number(e.target.value);

                if (Number.isNaN(value)) {
                  setGiftBoxesUsed(0);
                } else {
                  setGiftBoxesUsed(Math.max(0, value));
                }
              }}
              className={cn("w-16 no-arrows", {
                "border-yellow-200 shadow-yellow-200 focus-visible:ring-yellow-200/50":
                  giftBoxesUsed > 0,
              })}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 items-center md:basis-1/3">
        <StudentPicker
          students={students}
          onStudentSelected={updateStudent}
          className="w-[90vw] md:w-[450px]"
        >
          <Button variant="outline" className="w-full justify-between">
            {selectedStudent ? `${selectedStudent.name}` : "Select Student"}
            <ChevronsUpDownIcon />
          </Button>
        </StudentPicker>

        {!selectedStudent && (
          <div className="text-sm text-muted-foreground border rounded-md w-full p-6 text-center">
            To get started, select a student from the dropdown above.
          </div>
        )}

        {selectedStudent && (
          <>
            <div className="flex gap-2 items-center">
              <Switch
                id="only-relevant-gifts"
                checked={onlyDisplayRelevantGifts}
                onCheckedChange={setOnlyDisplayRelevantGifts}
              />
              <Label htmlFor="only-relevant-gifts">
                Only Display Favorite Gifts
              </Label>
            </div>

            {hasIrrelevantGifts && (
              <Alert>
                <AlertCircleIcon />
                <AlertTitle>Notice</AlertTitle>
                <AlertDescription>
                  Some of the gifts you selected will not be displayed because
                  they are not relevant to the selected student. In order to
                  change them, uncheck the "Only Display Favorite Gifts" option.
                </AlertDescription>
              </Alert>
            )}

            <div className="text-center">
              <img
                src={buildStudentPortraitUrl(selectedStudent)}
                alt={selectedStudent.name}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 w-1/2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Current Rank</Label>

                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={currentBond}
                  onChange={(e) => {
                    const value = Number(e.target.value);

                    if (Number.isNaN(value)) {
                      updateCurrentBond(1);
                    } else {
                      updateCurrentBond(value);
                    }
                  }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <Label className="text-xs">Target Rank</Label>

                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={targetBond ?? ""}
                  placeholder="Any"
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "") {
                      setTargetBond(null);
                      return;
                    }

                    const numValue = Number(value);
                    if (Number.isNaN(numValue)) {
                      setTargetBond(null);
                    } else {
                      setTargetBond(numValue);
                    }
                  }}
                />
              </div>
            </div>

            <BondProgress startingExp={expOffset} exp={totalExp} />

            {remainingExpBreakdown && (
              <RemainingExpBreakdownCard
                currentBond={currentBond}
                targetBond={targetBond}
                expNeeded={expForTargetBond - totalExp}
                breakdown={remainingExpBreakdown}
              />
            )}

            <GiftBreakdown
              gifts={gifts}
              giftCounts={giftCounts}
              giftBoxesUsed={giftBoxesUsed}
              selectedStudentId={selectedStudent.id}
              exp={totalExp}
            >
              <Button variant="outline">View Gift Breakdown</Button>
            </GiftBreakdown>
          </>
        )}
      </div>
    </div>
  );
}
