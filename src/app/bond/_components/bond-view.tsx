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
import type { Gift, Student } from "~prisma";
import {
  AlertCircleIcon,
  ChevronsUpDownIcon,
  EditIcon,
  PlusIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import giftAdoredImage from "@/assets/images/gift_adored.png";
import giftLovedImage from "@/assets/images/gift_loved.png";
import giftLikedImage from "@/assets/images/gift_liked.png";
import giftNormalImage from "@/assets/images/gift_normal.png";

import Image from "next/image";
import { BondProgress } from "@/app/bond/_components/bond-progress";
import {
  favorTable,
  type FavorTableEntry,
  favorTableMap,
} from "@/lib/favor-table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GiftBreakdown } from "@/app/bond/_components/gift-breakdown";
import { StudentPicker } from "@/components/common/student-picker";
import { studentStorage } from "@/lib/storage/students";
import {
  EXP_VALUES,
  type RemainingExpBreakdown,
  RemainingExpBreakdownCard,
} from "@/app/bond/_components/remaining-exp-breakdown-card";
import { useUser } from "@clerk/nextjs";
import type { Id } from "~convex/dataModel";
import { useQueryWithStatus } from "@/lib/convex";
import { api } from "~convex/api";
import { Authenticated, useMutation } from "convex/react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStudents } from "@/hooks/use-students";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateGiftInventoryDialog } from "@/components/dialogs/create-gift-inventory-dialog";
import { RenameGiftInventoryDialog } from "@/components/dialogs/rename-gift-inventory-dialog";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { useDirtyStateTracker } from "@/hooks/use-dirty-state-tracker";
import { useNavigationGuard } from "next-navigation-guard";
import { SaveDialog } from "@/components/dialogs/save-dialog";
import { SaveStatus } from "@/components/common/save-status";
import { useLocale, useTranslations } from "next-intl";

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

type GiftSortMethod = "default" | "studentPreference";

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

function GiftItemCard({ gift }: { gift: GiftWithStudents }) {
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
    <ItemCard
      name={giftName}
      iconName={gift.iconName}
      description={giftDescription}
      rarity={gift.rarity}
      className="cursor-pointer"
    />
  );
}

function GiftInfo({ gift }: { gift: GiftWithStudents }) {
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
                <StudentCard key={student.id} student={student} noDisplayRole />
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
                <StudentCard key={student.id} student={student} noDisplayRole />
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
          {t.rich("tools.bond.item.everyoneElse", {
            strong: (children) => <strong>{children}</strong>,
            exp: gift.rarity === "SSR" ? gift.expValue * 2 : gift.expValue,
          })}
        </div>
      )}
    </div>
  );
}

export function BondView({ students, gifts }: BondViewProps) {
  const t = useTranslations();

  const { isSignedIn } = useUser();

  const { studentMap } = useStudents();

  const [onlyDisplayRelevantGifts, setOnlyDisplayRelevantGifts] =
    useState(false);

  const [sortMethod, setSortMethod] = useState<GiftSortMethod>("default");

  const [selectedInvenetoryId, setSelectedInventoryId] =
    useState<Id<"giftInventory"> | null>(null);

  const [selectedTargetId, setSelectedTargetId] =
    useState<Id<"giftTarget"> | null>(null);

  const { hasUnsavedChanges, useSaveableState, markAsSaved } =
    useDirtyStateTracker({
      enabled: !!selectedInvenetoryId,
    });

  const navigationGuard = useNavigationGuard({
    enabled: hasUnsavedChanges,
  });

  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithGifts | null>(null);

  const [giftCounts, setGiftCounts, setGiftCountsUnchecked] = useSaveableState<
    Record<number, number>
  >(
    Object.fromEntries(gifts.map((gift) => [gift.id, 0])),
    useCallback(
      (a: Record<number, number>, b: Record<number, number>) => {
        for (const gift of gifts) {
          if ((a[gift.id] || 0) !== (b[gift.id] || 0)) {
            return false;
          }
        }

        return true;
      },
      [gifts],
    ),
  );

  const [giftEnabled, setGiftEnabled, setGiftEnabledUnchecked] =
    useSaveableState<Record<number, boolean>>(
      Object.fromEntries(gifts.map((gift) => [gift.id, true])),
      useCallback(
        (a: Record<number, boolean>, b: Record<number, boolean>) => {
          for (const gift of gifts) {
            if ((a[gift.id] || false) !== (b[gift.id] || false)) {
              return false;
            }
          }

          return true;
        },
        [gifts],
      ),
    );

  const [currentBondExp, setCurrentBondExp, setCurrentBondExpUnchecked] =
    useSaveableState<number>(0);
  const [targetBondExp, setTargetBondExp, setTargetBondExpUnchecked] =
    useSaveableState<number | null>(null);

  const [currentBondStr, setCurrentBondStr] = useState("1");
  const [targetBondStr, setTargetBondStr] = useState("");

  const [currentBondExpStr, setCurrentBondExpStr] = useState("0");
  const [targetBondExpStr, setTargetBondExpStr] = useState("");

  const [giftBoxesUsed, setGiftBoxesUsed, setGiftBoxesUsedUnchecked] =
    useSaveableState(0);
  const [giftBoxesEnabled, setGiftBoxesEnabled, setGiftBoxesEnabledUnchecked] =
    useSaveableState(true);

  const [busy, setBusy] = useState(false);

  const inventoriesQuery = useQueryWithStatus(
    api.gifts.getOwn,
    isSignedIn ? {} : "skip",
  );

  const inventoryQuery = useQueryWithStatus(
    api.gifts.getOwnById,
    selectedInvenetoryId
      ? {
          id: selectedInvenetoryId,
        }
      : "skip",
  );

  const createInventoryMutation = useMutation(api.gifts.createInventory);
  const createTargetMutation = useMutation(api.gifts.createTarget);

  const updateInventoryMutation = useMutation(api.gifts.updateInventory);
  const updateTargetMutation = useMutation(api.gifts.updateTarget);

  const destroyInventoryMutation = useMutation(api.gifts.destroyInventory);
  const destroyTargetMutation = useMutation(api.gifts.destroyTarget);

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

  const sortedGifts = useMemo(() => {
    if (sortMethod === "default" || !selectedStudent) {
      return displayedGifts;
    }

    const adored = displayedGifts
      .filter(
        (gift) =>
          isGiftAdoredByStudent(gift, selectedStudent) ||
          (gift.isLovedByEveryone && gift.expValue === 60),
      )
      .sort((a, b) => b.expValue - a.expValue);

    const loved = displayedGifts
      .filter(
        (gift) =>
          isGiftLovedByStudent(gift, selectedStudent) ||
          (gift.isLovedByEveryone && gift.expValue === 20),
      )
      .sort((a, b) => b.expValue - a.expValue);

    const liked = displayedGifts
      .filter((gift) => isGiftLikedByStudent(gift, selectedStudent))
      .sort((a, b) => b.expValue - a.expValue);

    const ids = new Set([
      ...adored.map((g) => g.id),
      ...loved.map((g) => g.id),
      ...liked.map((g) => g.id),
    ]);

    const normal = displayedGifts
      .filter((gift) => !ids.has(gift.id))
      .sort((a, b) => b.expValue - a.expValue);

    return [...adored, ...loved, ...liked, ...normal];
  }, [displayedGifts, sortMethod, selectedStudent]);

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

    let total = currentBondExp;

    for (const gift of gifts) {
      if (!giftEnabled[gift.id]) {
        continue;
      }

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

    if (!giftBoxesEnabled) {
      return total;
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
  }, [
    giftCounts,
    giftEnabled,
    selectedStudent,
    currentBondExp,
    giftBoxesUsed,
    giftBoxesEnabled,
  ]);

  const hasIrrelevantGifts = useMemo(() => {
    if (!selectedStudent || !onlyDisplayRelevantGifts) {
      return false;
    }

    return gifts.some((gift) => {
      if (giftCounts[gift.id] === 0 || !giftEnabled[gift.id]) {
        return false;
      }

      return (
        !gift.isLovedByEveryone &&
        !isGiftAdoredByStudent(gift, selectedStudent) &&
        !isGiftLovedByStudent(gift, selectedStudent) &&
        !isGiftLikedByStudent(gift, selectedStudent)
      );
    });
  }, [
    onlyDisplayRelevantGifts,
    selectedStudent,
    giftCounts,
    giftEnabled,
    studentGiftKinds,
  ]);

  const remainingExpBreakdown = useMemo<RemainingExpBreakdown | null>(() => {
    if (targetBondExp === null) {
      return null;
    }

    const difference = targetBondExp - totalExp;
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
  }, [targetBondExp, totalExp, studentGiftKinds]);

  const targetAlreadyExists = useMemo(() => {
    if (!selectedStudent) {
      return false;
    }

    if (!inventoryQuery.data) {
      return false;
    }

    return inventoryQuery.data.targets.some(
      (t) => t.studentId === selectedStudent.id,
    );
  }, [selectedStudent]);

  function updateCount(giftId: number, count: number) {
    setGiftCounts((prev) => ({
      ...prev,
      [giftId]: count,
    }));
  }

  const updateCurrentBond = useCallback(
    (raw: string, unchecked = false) => {
      setCurrentBondStr(raw);

      if (raw === "") {
        return;
      }

      const value = Number.parseInt(raw, 10);
      if (Number.isNaN(value)) {
        return;
      }

      const clampedValue = Math.max(1, Math.min(value, 100));

      const entry = favorTableMap[clampedValue];

      if (!entry) {
        return;
      }

      if (unchecked) {
        setCurrentBondExpUnchecked(entry.totalExp);
      } else {
        setCurrentBondExp(entry.totalExp);
      }

      if (!selectedStudent) {
        return;
      }

      studentStorage.addOrUpdateStudent({
        id: selectedStudent.id,
        bondExp: entry.totalExp,
      });

      setCurrentBondExpStr(entry.totalExp.toString());
      setCurrentBondStr(clampedValue.toString());
    },
    [selectedStudent],
  );

  const updateCurrentBondExp = useCallback(
    (raw: string, unchecked = false) => {
      setCurrentBondExpStr(raw);

      const value = Number.parseInt(raw, 10);
      if (Number.isNaN(value)) {
        return;
      }

      let clampedValue = Math.max(
        0,
        Math.min(value, favorTable[favorTable.length - 2].totalExp),
      );
      if (clampedValue > favorTable[favorTable.length - 2].totalExp) {
        clampedValue = favorTable[favorTable.length - 2].totalExp;
      }

      const nextEntry =
        favorTable.find((entry) => entry.totalExp > clampedValue) ??
        favorTable[favorTable.length - 2];
      const entry = favorTableMap[nextEntry.level - 1];

      if (!entry) {
        return;
      }

      if (unchecked) {
        setCurrentBondExpUnchecked(clampedValue);
      } else {
        setCurrentBondExp(clampedValue);
      }

      setCurrentBondStr(entry.level.toString());
      setCurrentBondExpStr(clampedValue.toString());

      if (!selectedStudent) {
        return;
      }

      studentStorage.addOrUpdateStudent({
        id: selectedStudent.id,
        bondExp: clampedValue,
      });
    },
    [selectedStudent],
  );

  const updateTargetBond = useCallback((raw: string, unchecked = false) => {
    setTargetBondStr(raw);

    const setter = unchecked ? setTargetBondExpUnchecked : setTargetBondExp;

    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
      setter(null);
      return;
    }

    const clampedValue = Math.max(1, Math.min(value, 100));

    const entry = favorTableMap[clampedValue];

    if (!entry) {
      setter(null);
      return;
    }

    setter(entry.totalExp);
    setTargetBondExpStr(entry.totalExp.toString());
    setTargetBondStr(clampedValue.toString());
  }, []);

  const updateTargetBondExp = useCallback((raw: string, unchecked = false) => {
    setTargetBondExpStr(raw);

    const setter = unchecked ? setTargetBondExpUnchecked : setTargetBondExp;

    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
      setter(null);
      return;
    }

    let clampedValue = Math.max(
      0,
      Math.min(value, favorTable[favorTable.length - 2].totalExp),
    );
    if (clampedValue > favorTable[favorTable.length - 2].totalExp) {
      clampedValue = favorTable[favorTable.length - 2].totalExp;
    }

    setter(clampedValue);
    setTargetBondStr(
      (
        favorTable.find((entry) => entry.totalExp >= clampedValue)?.level ?? 1
      ).toString(),
    );
    setTargetBondExpStr(clampedValue.toString());
  }, []);

  function updateStudent(baseStudent: Student) {
    const student = students.find((s) => s.id === baseStudent.id);
    if (!student) {
      return;
    }

    setSelectedStudent(student);

    const storedStudent = studentStorage.getStudent(student.id);

    let bondUpdated = false;

    if (typeof storedStudent?.bondExp !== "undefined") {
      const bondExp = storedStudent.bondExp;
      const nextEntry =
        favorTable.find((entry) => entry.totalExp > bondExp) ??
        favorTable[favorTable.length - 2];
      const entry = favorTableMap[nextEntry.level - 1];

      if (entry) {
        setCurrentBondExp(entry.totalExp);
        setCurrentBondStr(entry.level.toString());
        setCurrentBondExpStr(bondExp.toString());
        bondUpdated = true;
      }
    } else if (storedStudent?.bond) {
      const entry = favorTableMap[storedStudent.bond];
      if (entry) {
        setCurrentBondExp(entry.totalExp);
        setCurrentBondStr(entry.level.toString());
        setCurrentBondExpStr(entry.totalExp.toString());
        bondUpdated = true;
      }
    }

    if (!bondUpdated) {
      setCurrentBondExp(0);
      setCurrentBondStr("1");
      setCurrentBondExpStr("0");
    }
  }

  const startingLevel = useMemo(() => {
    let result: FavorTableEntry | undefined;

    for (const entry of favorTable) {
      if (entry.totalExp > currentBondExp) {
        break;
      }

      result = entry;
    }

    if (result?.level === 101) {
      return favorTable[99];
    }

    return result ?? favorTable[0];
  }, [currentBondExp]);

  const nextLevel = useMemo(() => {
    let result: FavorTableEntry | undefined;

    for (const entry of favorTable) {
      result = entry;

      if (entry.totalExp > totalExp) {
        break;
      }
    }

    return result ?? favorTable[0];
  }, [totalExp]);

  const currentLevel = useMemo(() => {
    return (
      favorTable.find((entry) => entry.level === nextLevel.level - 1) ??
      favorTable[0]
    );
  }, [nextLevel]);

  async function handleCreateInventory(name?: string) {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      const id = await createInventoryMutation({
        name,
        gifts: Array.from(Object.entries(giftCounts)).map(
          ([giftId, count]) => ({
            id: Number(giftId),
            count,
          }),
        ),
        giftBoxes: giftBoxesUsed,
      });

      markAsSaved();

      if (navigationGuard.active) {
        navigationGuard.accept();
      }

      setSelectedInventoryId(id);
    } catch (err) {
      console.error(err);
      toast.error(t("tools.bond.toasts.inventoryCreateFail"));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateInventory(name?: string) {
    if (busy || !selectedInvenetoryId) {
      return;
    }

    setBusy(true);

    try {
      await updateInventoryMutation({
        id: selectedInvenetoryId,
        name,
        gifts: Array.from(Object.entries(giftCounts)).map(
          ([giftId, count]) => ({
            id: Number(giftId),
            count,
          }),
        ),
        giftBoxes: giftBoxesUsed,
      });

      markAsSaved();

      if (navigationGuard.active) {
        navigationGuard.accept();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("tools.bond.toasts.inventoryUpdateFail"));
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateTarget() {
    if (busy || !selectedInvenetoryId || !selectedStudent) {
      return;
    }

    setBusy(true);

    try {
      const id = await createTargetMutation({
        giftInventoryId: selectedInvenetoryId,
        studentId: selectedStudent.id,
        currentExp: currentBondExp,
        targetExp: targetBondExp ?? undefined,
        gifts: Array.from(Object.entries(giftEnabled)).map(
          ([giftId, enabled]) => ({
            id: Number(giftId),
            enabled,
          }),
        ),
        useGiftBoxes: giftBoxesEnabled,
      });

      setSelectedTargetId(id);

      markAsSaved();

      if (navigationGuard.active) {
        navigationGuard.accept();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("tools.bond.toasts.targetCreateFail"));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpdateTarget() {
    if (busy || !selectedTargetId) {
      return;
    }

    setBusy(true);

    try {
      await updateTargetMutation({
        id: selectedTargetId,
        studentId: selectedStudent?.id,
        currentExp: currentBondExp,
        targetExp: targetBondExp ?? undefined,
        gifts: Array.from(Object.entries(giftEnabled)).map(
          ([giftId, enabled]) => ({
            id: Number(giftId),
            enabled,
          }),
        ),
        useGiftBoxes: giftBoxesEnabled,
      });

      markAsSaved();

      if (navigationGuard.active) {
        navigationGuard.accept();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("tools.bond.toasts.targetUpdateFail"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (selectedInvenetoryId) {
      await handleUpdateInventory();
    }

    if (selectedTargetId) {
      await handleUpdateTarget();
    }
  }

  async function handleDeleteInventory() {
    if (busy || !selectedInvenetoryId) {
      return;
    }

    setBusy(true);

    try {
      await destroyInventoryMutation({
        id: selectedInvenetoryId,
      });

      toast.success(t("tools.bond.toasts.inventoryDeleteSuccess"));

      setSelectedInventoryId(null);
      setSelectedTargetId(null);
      updateCurrentBondExp("0");
      updateTargetBondExp("");
      setSelectedStudent(null);
      setGiftCounts(Object.fromEntries(gifts.map((gift) => [gift.id, 0])));
      setGiftEnabled(Object.fromEntries(gifts.map((gift) => [gift.id, false])));

      markAsSaved();

      if (navigationGuard.active) {
        navigationGuard.accept();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("tools.bond.toasts.inventoryDeleteFail"));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteTarget() {
    if (busy || !selectedTargetId) {
      return;
    }

    setBusy(true);

    try {
      await destroyTargetMutation({
        id: selectedTargetId,
      });

      toast.success(t("tools.bond.toasts.targetDeleteSuccess"));

      setSelectedTargetId(null);
      updateCurrentBondExp("0");
      updateTargetBondExp("");
      setSelectedStudent(null);
      setGiftEnabled(Object.fromEntries(gifts.map((gift) => [gift.id, false])));

      markAsSaved();

      if (navigationGuard.active) {
        navigationGuard.accept();
      }
    } catch (err) {
      console.error(err);
      toast.error(t("tools.bond.toasts.targetDeleteFail"));
    } finally {
      setBusy(false);
    }
  }

  function handleInventorySelectValueChange(value: string) {
    if (value === "_") {
      setSelectedInventoryId(null);
      setSelectedTargetId(null);
      updateCurrentBondExp("0", true);
      updateTargetBondExp("", true);
      setSelectedStudent(null);
      setGiftCountsUnchecked(
        Object.fromEntries(gifts.map((gift) => [gift.id, 0])),
      );
      setGiftEnabledUnchecked(
        Object.fromEntries(gifts.map((gift) => [gift.id, false])),
      );
      return;
    }

    if (value === selectedInvenetoryId) {
      return;
    }

    setSelectedInventoryId(value as Id<"giftInventory">);
    setSelectedTargetId(null);
  }

  function handleTargetValueChange(value: string) {
    if (value === "_") {
      setSelectedTargetId(null);
      updateCurrentBondExp("0", true);
      updateTargetBondExp("", true);
      setSelectedStudent(null);
      setGiftEnabledUnchecked(
        Object.fromEntries(gifts.map((gift) => [gift.id, false])),
      );
      return;
    }

    if (value === selectedTargetId) {
      return;
    }

    setSelectedTargetId(value as Id<"giftTarget">);
  }

  useEffect(() => {
    if (isSignedIn) {
      setGiftEnabledUnchecked(
        Object.fromEntries(gifts.map((gift) => [gift.id, false])),
      );

      setGiftBoxesEnabledUnchecked(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    if (inventoryQuery.status !== "success") {
      return;
    }

    const newGiftCounts: Record<number, number> = {};

    for (const gift of inventoryQuery.data.inventory.gifts) {
      newGiftCounts[gift.id] = gift.count;
    }

    setGiftCountsUnchecked((prev) => ({
      ...prev,
      ...newGiftCounts,
    }));

    if (typeof inventoryQuery.data.inventory.giftBoxes === "number") {
      setGiftBoxesUsedUnchecked(inventoryQuery.data.inventory.giftBoxes);
    }
  }, [inventoryQuery.status]);

  useEffect(() => {
    if (!inventoryQuery.data) {
      return;
    }

    const target = inventoryQuery.data.targets.find(
      (t) => t._id === selectedTargetId,
    );
    if (!target) {
      return;
    }

    const newGiftEnabled: Record<number, boolean> = {};

    for (const gift of target.gifts) {
      newGiftEnabled[gift.id] = gift.enabled;
    }

    setGiftEnabledUnchecked((prev) => ({
      ...prev,
      ...newGiftEnabled,
    }));

    if (typeof target.useGiftBoxes === "boolean") {
      setGiftBoxesEnabledUnchecked(target.useGiftBoxes);
    }

    setSelectedStudent(students.find((s) => s.id === target.studentId) || null);

    updateCurrentBondExp(target.currentExp.toString(), true);
    updateTargetBondExp(target.targetExp?.toString() ?? "", true);
  }, [selectedTargetId]);

  return (
    <div className="flex flex-col-reverse md:flex-row gap-6">
      <div className="md:basis-2/3">
        <Authenticated>
          <TooltipProvider>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <Label className="text-xs" htmlFor="gift-inventory">
                  {t("tools.bond.inventory.select.label")}
                </Label>

                <div className="flex flex-col md:flex-row gap-2 items-center">
                  <Select
                    value={selectedInvenetoryId ?? "_"}
                    onValueChange={handleInventorySelectValueChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="_">
                        {t("tools.bond.inventory.select.none")}
                      </SelectItem>

                      {inventoriesQuery.data?.map((inventory) => (
                        <SelectItem key={inventory._id} value={inventory._id}>
                          {inventory.name ??
                            t("tools.bond.inventory.select.unnamed")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2 items-center justify-between w-full md:w-auto">
                    <Tooltip>
                      <CreateGiftInventoryDialog
                        onCreate={handleCreateInventory}
                      >
                        <TooltipTrigger asChild>
                          <Button variant="outline" disabled={busy}>
                            <PlusIcon />
                          </Button>
                        </TooltipTrigger>
                      </CreateGiftInventoryDialog>

                      <TooltipContent className="text-center">
                        {t("tools.bond.inventory.select.new")}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <RenameGiftInventoryDialog
                        current={inventoryQuery.data?.inventory.name ?? ""}
                        onRename={handleUpdateInventory}
                      >
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            disabled={busy || !selectedInvenetoryId}
                          >
                            <EditIcon />
                          </Button>
                        </TooltipTrigger>
                      </RenameGiftInventoryDialog>

                      <TooltipContent className="text-center">
                        {t("tools.bond.inventory.select.rename")}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={busy || !selectedInvenetoryId}
                          onClick={() => handleSave()}
                        >
                          <SaveIcon />
                        </Button>
                      </TooltipTrigger>

                      <TooltipContent className="text-center">
                        {t("tools.bond.inventory.select.save")}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <ConfirmDialog
                        title={t("tools.bond.dialogs.deleteInventory.title")}
                        description={t(
                          "tools.bond.dialogs.deleteInventory.description",
                        )}
                        confirmVariant="destructive"
                        onConfirm={handleDeleteInventory}
                      >
                        <TooltipTrigger asChild>
                          <Button
                            variant="destructive"
                            disabled={busy || !selectedInvenetoryId}
                          >
                            <XIcon />
                          </Button>
                        </TooltipTrigger>
                      </ConfirmDialog>

                      <TooltipContent className="text-center">
                        {t("tools.bond.inventory.select.delete")}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs" htmlFor="gift-target">
                  {t("tools.bond.inventory.target.label")}
                </Label>

                <div className="flex gap-2 items-center">
                  <Select
                    value={selectedTargetId ?? "_"}
                    onValueChange={handleTargetValueChange}
                    disabled={!selectedInvenetoryId}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>

                    <SelectContent>
                      <SelectItem value="_">
                        {t("tools.bond.inventory.target.none")}
                      </SelectItem>

                      {inventoryQuery.data?.targets.map((target) => (
                        <SelectItem key={target._id} value={target._id}>
                          {studentMap[target.studentId]?.name ??
                            t("tools.bond.inventory.target.unknown", {
                              studentId: target.studentId,
                            })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        disabled={
                          busy ||
                          !selectedInvenetoryId ||
                          !selectedStudent ||
                          targetAlreadyExists
                        }
                        onClick={handleCreateTarget}
                      >
                        <PlusIcon />
                      </Button>
                    </TooltipTrigger>

                    <TooltipContent className="text-center">
                      {t("tools.bond.inventory.target.new", {
                        studentName: selectedStudent?.name ?? "N/A",
                      })}
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <ConfirmDialog
                      title={t("tools.bond.dialogs.deleteTarget.title")}
                      description={t(
                        "tools.bond.dialogs.deleteTarget.description",
                      )}
                      confirmVariant="destructive"
                      onConfirm={handleDeleteTarget}
                    >
                      <TooltipTrigger asChild>
                        <Button
                          variant="destructive"
                          disabled={busy || !selectedTargetId}
                        >
                          <XIcon />
                        </Button>
                      </TooltipTrigger>
                    </ConfirmDialog>

                    <TooltipContent className="text-center">
                      {t("tools.bond.inventory.target.delete", {
                        studentName: selectedStudent?.name ?? "N/A",
                      })}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </Authenticated>

        <div className="flex items-center gap-2 mb-6">
          <Label className="shrink-0">{t("tools.bond.sort.label")}</Label>

          <Select
            value={sortMethod}
            onValueChange={(value) => setSortMethod(value as GiftSortMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="default">
                {t("tools.bond.sort.default")}
              </SelectItem>
              <SelectItem value="by-relevance" disabled={!selectedStudent}>
                {selectedStudent
                  ? t("tools.bond.sort.relevance.student", {
                      studentName: selectedStudent.name,
                    })
                  : t("tools.bond.sort.relevance.noStudent")}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-8 justify-center">
          {sortedGifts.map((gift) => (
            <div
              key={gift.id}
              className="flex flex-col items-center gap-2 relative"
            >
              <Popover>
                <PopoverTrigger className="flex-1 flex">
                  <GiftItemCard gift={gift} />
                </PopoverTrigger>

                <PopoverContent className="w-[90vw] md:w-[450px] ring-4 max-h-[500px] overflow-y-auto shadow-lg ring-black/75 dark:ring-white/75 p-0">
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
                  "border-green-200 shadow-green-200 focus-visible:ring-green-200/50 bg-green-200/10":
                    giftCounts[gift.id] > 0 && giftEnabled[gift.id],
                })}
              />

              {selectedStudent && (
                <div className="absolute -top-3 -right-3">
                  {(gift.adoredBy.some((s) => s.id === selectedStudent.id) ||
                    (gift.isLovedByEveryone && gift.expValue === 60)) && (
                    <Image
                      src={giftAdoredImage}
                      alt={t("tools.bond.item.adored")}
                      className="size-8"
                      title={`${gift.expValue * 4} EXP`}
                    />
                  )}

                  {(gift.lovedBy.some((s) => s.id === selectedStudent.id) ||
                    (gift.isLovedByEveryone && gift.expValue !== 60)) && (
                    <Image
                      src={giftLovedImage}
                      alt={t("tools.bond.item.loved")}
                      className="size-8"
                      title={`${gift.expValue * 3} EXP`}
                    />
                  )}

                  {gift.likedBy.some((s) => s.id === selectedStudent.id) && (
                    <Image
                      src={giftLikedImage}
                      alt={t("tools.bond.item.liked")}
                      className="size-8"
                      title={`${gift.expValue * 2} EXP`}
                    />
                  )}
                </div>
              )}

              <Authenticated>
                <Switch
                  checked={giftEnabled[gift.id]}
                  onCheckedChange={(checked) => {
                    setGiftEnabled((prev) => ({
                      ...prev,
                      [gift.id]: checked,
                    }));
                  }}
                />
              </Authenticated>
            </div>
          ))}

          <div className="flex flex-col items-center gap-2 relative">
            <ItemCard
              name={t("tools.bond.choiceBox.name")}
              iconName="item_icon_favor_selection"
              description={t("tools.bond.choiceBox.description")}
              rarity="SR"
              className="cursor-pointer"
            />

            <Input
              type="number"
              value={giftBoxesUsed}
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
                "border-green-200 shadow-green-200 focus-visible:ring-green-200/50 bg-green-200/10":
                  giftBoxesUsed > 0 && giftBoxesEnabled,
              })}
            />

            <Authenticated>
              <Switch
                checked={giftBoxesEnabled}
                onCheckedChange={setGiftBoxesEnabled}
              />
            </Authenticated>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8 items-center md:basis-1/3">
        <Authenticated>
          <div className="flex items-center justify-center">
            <SaveStatus isDirty={hasUnsavedChanges} isSaving={busy} />
          </div>
        </Authenticated>

        <StudentPicker
          onStudentSelected={updateStudent}
          className="w-[90vw] md:w-[450px]"
        >
          <Button variant="outline" className="w-full justify-between">
            {selectedStudent
              ? `${selectedStudent.name}`
              : t("tools.bond.student.select")}
            <ChevronsUpDownIcon />
          </Button>
        </StudentPicker>

        {!selectedStudent && (
          <div className="text-sm text-muted-foreground border rounded-md w-full p-6 text-center">
            {t("tools.bond.student.notice")}
          </div>
        )}

        {selectedStudent && (
          <>
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-center gap-4">
              <img
                src={buildStudentPortraitUrl(selectedStudent)}
                alt={selectedStudent.name}
                className="shrink-0 w-30 md:w-40"
              />

              <div className="flex-1 flex flex-col gap-4">
                <div className="flex gap-2 items-center">
                  <Switch
                    id="only-relevant-gifts"
                    checked={onlyDisplayRelevantGifts}
                    onCheckedChange={setOnlyDisplayRelevantGifts}
                  />
                  <Label htmlFor="only-relevant-gifts">
                    {t("tools.bond.student.onlyFavorite")}
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">
                      {t("tools.bond.student.currentRank")}
                    </Label>

                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={currentBondStr}
                      onChange={(e) => updateCurrentBond(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">
                      {t("tools.bond.student.targetRank")}
                    </Label>

                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={targetBondStr}
                      placeholder="Any"
                      onChange={(e) => updateTargetBond(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">
                      {t("tools.bond.student.currentExp")}
                    </Label>

                    <Input
                      type="number"
                      min={0}
                      value={currentBondExpStr}
                      onChange={(e) => updateCurrentBondExp(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">
                      {t("tools.bond.student.targetExp")}
                    </Label>

                    <Input
                      type="number"
                      min={0}
                      value={targetBondExpStr}
                      placeholder="Any"
                      onChange={(e) => updateTargetBondExp(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {selectedStudent && hasIrrelevantGifts && (
              <Alert>
                <AlertCircleIcon />
                <AlertTitle>
                  {t("tools.bond.student.irrelevantGifts.title")}
                </AlertTitle>
                <AlertDescription>
                  {t("tools.bond.student.irrelevantGifts.description")}
                </AlertDescription>
              </Alert>
            )}

            <BondProgress
              startingLevel={startingLevel}
              currentLevel={currentLevel}
              exp={totalExp}
              targetBond={targetBondStr}
            />

            <GiftBreakdown
              gifts={gifts}
              giftCounts={giftCounts}
              giftEnabled={giftEnabled}
              giftBoxesUsed={giftBoxesUsed}
              selectedStudentId={selectedStudent.id}
              exp={totalExp}
            >
              <Button variant="outline">
                {t("tools.bond.student.breakdown")}
              </Button>
            </GiftBreakdown>

            {remainingExpBreakdown && targetBondExp && (
              <RemainingExpBreakdownCard
                currentBond={currentLevel.level.toString()}
                targetBond={targetBondStr}
                expNeeded={targetBondExp - totalExp}
                breakdown={remainingExpBreakdown}
              />
            )}
          </>
        )}
      </div>

      <Authenticated>
        <SaveDialog
          open={navigationGuard.active}
          title={t("tools.bond.dialogs.save.title")}
          description={t("tools.bond.dialogs.save.description")}
          onYes={handleSave}
          onNo={navigationGuard.accept}
          onCancel={navigationGuard.reject}
        />
      </Authenticated>
    </div>
  );
}
