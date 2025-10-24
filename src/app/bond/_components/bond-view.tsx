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
import { favorTable, favorTableMap } from "@/lib/favor-table";
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

function GiftInfo({
  gift,
}: {
  gift: GiftWithStudents;
}) {
  return (
    <div
      className={cn("flex flex-col gap-4 p-4", {
        "bg-yellow-500/10": gift.rarity === "SR",
        "bg-purple-500/10": gift.rarity === "SSR",
      })}
    >
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
  const { isSignedIn } = useUser();

  const { studentMap } = useStudents();

  const [onlyDisplayRelevantGifts, setOnlyDisplayRelevantGifts] =
    useState(false);

  const [sortMethod, setSortMethod] = useState<GiftSortMethod>("default");

  const [selectedStudent, setSelectedStudent] =
    useState<StudentWithGifts | null>(null);

  const [giftCounts, setGiftCounts] = useState<Record<number, number>>(
    Object.fromEntries(gifts.map((gift) => [gift.id, 0])),
  );

  const [giftEnabled, setGiftEnabled] = useState<Record<number, boolean>>(
    Object.fromEntries(gifts.map((gift) => [gift.id, true])),
  );

  const [currentBondExp, setCurrentBondExp] = useState<number>(0);
  const [targetBondExp, setTargetBondExp] = useState<number | null>(null);

  const [currentBondStr, setCurrentBondStr] = useState("1");
  const [targetBondStr, setTargetBondStr] = useState("");

  const [currentBondExpStr, setCurrentBondExpStr] = useState("0");
  const [targetBondExpStr, setTargetBondExpStr] = useState("");

  const [giftBoxesUsed, setGiftBoxesUsed] = useState(0);
  const [giftBoxesEnabled, setGiftBoxesEnabled] = useState(true);

  const [busy, setBusy] = useState(false);

  const [selectedInvenetoryId, setSelectedInventoryId] =
    useState<Id<"giftInventory"> | null>(null);

  const [selectedTargetId, setSelectedTargetId] =
    useState<Id<"giftTarget"> | null>(null);

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
    (raw: string) => {
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

      setCurrentBondExp(entry.totalExp);

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
    (raw: string) => {
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

      setCurrentBondExp(clampedValue);

      if (!selectedStudent) {
        return;
      }

      studentStorage.addOrUpdateStudent({
        id: selectedStudent.id,
        bondExp: clampedValue,
      });

      setCurrentBondStr(entry.level.toString());
      setCurrentBondExpStr(clampedValue.toString());
    },
    [selectedStudent],
  );

  const updateTargetBond = useCallback((raw: string) => {
    setTargetBondStr(raw);

    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
      setTargetBondExp(null);
      return;
    }

    const clampedValue = Math.max(1, Math.min(value, 100));

    const entry = favorTableMap[clampedValue];

    if (!entry) {
      setTargetBondExp(null);
      return;
    }

    setTargetBondExp(entry.totalExp);
    setTargetBondExpStr(entry.totalExp.toString());
    setTargetBondStr(clampedValue.toString());
  }, []);

  const updateTargetBondExp = useCallback((raw: string) => {
    setTargetBondExpStr(raw);

    const value = Number.parseInt(raw, 10);
    if (Number.isNaN(value)) {
      setTargetBondExp(null);
      return;
    }

    let clampedValue = Math.max(
      0,
      Math.min(value, favorTable[favorTable.length - 2].totalExp),
    );
    if (clampedValue > favorTable[favorTable.length - 2].totalExp) {
      clampedValue = favorTable[favorTable.length - 2].totalExp;
    }

    setTargetBondExp(clampedValue);
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
      });

      setSelectedInventoryId(id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create gift inventory.");
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
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update gift inventory.");
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
      });

      setSelectedTargetId(id);
    } catch (err) {
      console.error(err);
      toast.error("Failed to create gift target.");
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
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to update gift target.");
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

      toast.success("Gift inventory deleted.");

      setSelectedInventoryId(null);
      setSelectedTargetId(null);
      updateCurrentBondExp("0");
      updateTargetBondExp("");
      setSelectedStudent(null);
      setGiftCounts(Object.fromEntries(gifts.map((gift) => [gift.id, 0])));
      setGiftEnabled(Object.fromEntries(gifts.map((gift) => [gift.id, false])));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete gift inventory.");
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

      toast.success("Gift target deleted.");

      setSelectedTargetId(null);
      updateCurrentBondExp("0");
      updateTargetBondExp("");
      setSelectedStudent(null);
      setGiftEnabled(Object.fromEntries(gifts.map((gift) => [gift.id, false])));
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete gift target.");
    } finally {
      setBusy(false);
    }
  }

  function handleInventorySelectValueChange(value: string) {
    if (value === "_") {
      setSelectedInventoryId(null);
      setSelectedTargetId(null);
      updateCurrentBondExp("0");
      updateTargetBondExp("");
      setSelectedStudent(null);
      setGiftCounts(Object.fromEntries(gifts.map((gift) => [gift.id, 0])));
      setGiftEnabled(Object.fromEntries(gifts.map((gift) => [gift.id, false])));
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
      updateCurrentBondExp("0");
      updateTargetBondExp("");
      setSelectedStudent(null);
      setGiftEnabled(Object.fromEntries(gifts.map((gift) => [gift.id, false])));
      return;
    }

    if (value === selectedTargetId) {
      return;
    }

    setSelectedTargetId(value as Id<"giftTarget">);
  }

  useEffect(() => {
    if (isSignedIn) {
      setGiftEnabled(Object.fromEntries(gifts.map((gift) => [gift.id, false])));
    }

    setGiftBoxesEnabled(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (inventoryQuery.status !== "success") {
      return;
    }

    for (const gift of inventoryQuery.data.inventory.gifts) {
      setGiftCounts((prev) => ({
        ...prev,
        [gift.id]: gift.count,
      }));
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

    for (const gift of target.gifts) {
      setGiftEnabled((prev) => ({
        ...prev,
        [gift.id]: gift.enabled,
      }));
    }

    setSelectedStudent(students.find((s) => s.id === target.studentId) || null);

    updateCurrentBondExp(target.currentExp.toString());
    if (typeof target.targetExp === "number") {
      updateTargetBondExp(target.targetExp.toString());
    }
  }, [selectedTargetId]);

  return (
    <div className="flex flex-col-reverse md:flex-row gap-6">
      <div className="md:basis-2/3">
        <Authenticated>
          <TooltipProvider>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col gap-2">
                <Label className="text-xs" htmlFor="gift-inventory">
                  Gift Inventory (BETA)
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
                      <SelectItem value="_">(no inventory)</SelectItem>

                      {inventoriesQuery.data?.map((inventory) => (
                        <SelectItem key={inventory._id} value={inventory._id}>
                          {inventory.name ?? "Unnamed Gift Inventory"}
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
                        New Inventory
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
                        Rename Inventory
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
                        Save Inventory
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <ConfirmDialog
                        title="Delete Gift Inventory?"
                        description="Are you sure you want to delete this gift inventory? The gift counts, as well as all the associated targets will be permanently removed."
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
                        Delete Inventory
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label className="text-xs" htmlFor="gift-target">
                  Gift Target
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
                      <SelectItem value="_">(no target)</SelectItem>

                      {inventoryQuery.data?.targets.map((target) => (
                        <SelectItem key={target._id} value={target._id}>
                          {studentMap[target.studentId]?.name ??
                            `Unknown Student: ${target.studentId}`}
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
                      New Target ({selectedStudent?.name})
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <ConfirmDialog
                      title="Delete Gift Target?"
                      description="Are you sure you want to delete this gift target? The bond data, as well as the selected gifts will be permanently removed. Your gift inventory will not be affected."
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
                      Delete Target ({selectedStudent?.name})
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </TooltipProvider>
        </Authenticated>

        <div className="flex items-center gap-2 mb-6">
          <Label className="shrink-0">Sort by:</Label>

          <Select
            value={sortMethod}
            onValueChange={(value) => setSortMethod(value as GiftSortMethod)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="by-relevance" disabled={!selectedStudent}>
                {selectedStudent?.name ?? "Selected student"}'s Preferences
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {sortedGifts.map((gift) => (
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

                <PopoverContent className="w-[90vw] md:w-[450px] ring-4 max-h-[500px] overflow-y-auto shadow-lg ring-black/75 dark:ring-white/75 p-0">
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
        <StudentPicker
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
                    Only Display Favorite Gifts
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Current Rank</Label>

                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={currentBondStr}
                      onChange={(e) => updateCurrentBond(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Target Rank</Label>

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
                    <Label className="text-xs">Current EXP</Label>

                    <Input
                      type="number"
                      min={0}
                      value={currentBondExpStr}
                      onChange={(e) => updateCurrentBondExp(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">Target EXP</Label>

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
                <AlertTitle>Notice</AlertTitle>
                <AlertDescription>
                  Some of the gifts you selected will not be displayed because
                  they are not relevant to the selected student. In order to
                  change them, uncheck the "Only Display Favorite Gifts" option.
                </AlertDescription>
              </Alert>
            )}

            <BondProgress
              startingExp={currentBondExp}
              exp={totalExp}
              targetBond={targetBondStr}
            />

            <GiftBreakdown
              gifts={gifts}
              giftCounts={giftCounts}
              giftBoxesUsed={giftBoxesUsed}
              selectedStudentId={selectedStudent.id}
              exp={totalExp}
            >
              <Button variant="outline">View Gift Breakdown</Button>
            </GiftBreakdown>

            {remainingExpBreakdown && targetBondExp && (
              <RemainingExpBreakdownCard
                currentBond={currentBondStr}
                targetBond={targetBondStr}
                expNeeded={targetBondExp - totalExp}
                breakdown={remainingExpBreakdown}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
