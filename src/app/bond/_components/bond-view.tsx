"use client";

import { ItemCard } from "@/components/common/item-card";
import { StudentCard } from "@/components/common/student-card";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { buildStudentIconUrl, buildStudentPortraitUrl } from "@/lib/url";
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

type StudentWithGifts = Student & {
  giftsAdored: Gift[];
  giftsLoved: Gift[];
  giftsLiked: Gift[];
};

type GiftWithStudents = Gift & {
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

  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);

  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithGifts | null>(null);

  const [giftCounts, setGiftCounts] = useState<Record<number, number>>(
    Object.fromEntries(gifts.map((gift) => [gift.id, 0])),
  );

  const [currentBond, setCurrentBond] = useState(1);

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

    return total;
  }, [giftCounts, selectedStudent, expOffset]);

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
  }, [onlyDisplayRelevantGifts, selectedStudent, giftCounts]);

  function updateCount(giftId: number, count: number) {
    setGiftCounts((prev) => ({
      ...prev,
      [giftId]: count,
    }));
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
                    key={gift.id}
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
                value={giftCounts[gift.id]}
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
        </div>
      </div>

      <div className="flex flex-col gap-8 items-center md:basis-1/3">
        <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedStudent ? `${selectedStudent.name}` : "Select Student"}
              <ChevronsUpDownIcon />
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-[90vw] md:w-[450px] p-0">
            <Command>
              <CommandInput placeholder="Search student..." className="h-9" />
              <CommandList>
                <CommandEmpty>No such student.</CommandEmpty>
                <CommandGroup>
                  {students.map((student) => (
                    <CommandItem
                      key={student.id}
                      value={student.name}
                      onSelect={() => {
                        setSelectedStudent(student);
                        setStudentPopoverOpen(false);
                      }}
                    >
                      <div className="flex gap-2 items-center">
                        <img
                          src={buildStudentIconUrl(student)}
                          alt={student.name}
                          className="w-12"
                        />
                        {student.name}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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

            <div className="flex items-center gap-2 w-2/3">
              <Label className="shrink-0" htmlFor="current-bond">
                Current Rank:
              </Label>

              <Input
                type="number"
                min={1}
                max={100}
                value={currentBond}
                onChange={(e) => {
                  const value = Number(e.target.value);

                  if (Number.isNaN(value)) {
                    setCurrentBond(1);
                  } else {
                    setCurrentBond(Math.max(1, Math.min(value, 100)));
                  }
                }}
              />
            </div>

            <BondProgress startingExp={expOffset} exp={totalExp} />
          </>
        )}
      </div>
    </div>
  );
}
