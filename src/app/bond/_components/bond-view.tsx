"use client";

import { BondProgress } from "@/app/bond/_components/bond-progress";
import { GiftAllocationCard } from "@/app/bond/_components/gift-allocation-card";
import { GiftBreakdown } from "@/app/bond/_components/gift-breakdown";
import { GiftChoiceBoxCard } from "@/app/bond/_components/gift-choice-box-card";
import { GiftPreferenceFilter } from "@/app/bond/_components/gift-preference-filter";
import {
  EXP_VALUES,
  type RemainingExpBreakdown,
  RemainingExpBreakdownCard,
} from "@/app/bond/_components/remaining-exp-breakdown-card";
import {
  boxAllocationsEqual,
  buildTargetAllocationsFromDoc,
  computeTargetProjectedExp,
  getGiftExpValue,
  isGiftPreferredByStudent,
  normalizeTargetGiftBoxCount,
  serializeTargetAllocations,
  sortGiftsByStudentPreference,
  targetAllocationsEqual,
} from "@/app/bond/_lib/gift-utils";
import type { BondViewProps, StudentWithGifts } from "@/app/bond/_lib/types";
import { SaveStatus } from "@/components/common/save-status";
import { StudentPicker } from "@/components/common/student-picker";
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog";
import { CreateGiftInventoryDialog } from "@/components/dialogs/create-gift-inventory-dialog";
import { RenameGiftInventoryDialog } from "@/components/dialogs/rename-gift-inventory-dialog";
import { SaveDialog } from "@/components/dialogs/save-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDirtyStateTracker } from "@/hooks/use-dirty-state-tracker";
import { useStudents } from "@/hooks/use-students";
import { useQueryWithStatus } from "@/lib/convex";
import {
  type FavorTableEntry,
  favorTable,
  favorTableMap,
  getBondLevelFromTotalExp,
} from "@/lib/favor-table";
import { studentStorage } from "@/lib/storage/students";
import { buildStudentPortraitUrl } from "@/lib/url";
import { useUser } from "@clerk/nextjs";
import { Authenticated, useMutation } from "convex/react";
import {
  AlertCircleIcon,
  ChevronsUpDownIcon,
  EditIcon,
  PlusIcon,
  SaveIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useNavigationGuard } from "next-navigation-guard";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import type { Student } from "~prisma";

export type {
  BondViewProps,
  GiftWithStudents,
  StudentWithGifts,
} from "@/app/bond/_lib/types";

type TargetAllocations = Record<Id<"giftTarget">, Record<number, number>>;
type TargetBoxAllocations = Record<Id<"giftTarget">, number>;

export function BondView({ students, gifts }: BondViewProps) {
  const t = useTranslations();
  const { isSignedIn } = useUser();
  const { studentMap } = useStudents();

  const giftIds = useMemo(() => gifts.map((gift) => gift.id), [gifts]);

  const studentWithGiftsMap = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const [showAllGifts, setShowAllGifts] = useState(true);
  const [filterStudentIds, setFilterStudentIds] = useState<Set<string>>(
    new Set(),
  );
  const [onlyDisplayRelevantGifts, setOnlyDisplayRelevantGifts] =
    useState(false);
  const [sortMethod, setSortMethod] = useState<string>("default");

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
    "giftCounts",
  );

  const emptyTargetAllocations = useCallback((): TargetAllocations => ({}), []);

  const [
    targetAllocations,
    setTargetAllocations,
    setTargetAllocationsUnchecked,
  ] = useSaveableState<TargetAllocations>(
    emptyTargetAllocations(),
    useCallback(
      (a: TargetAllocations, b: TargetAllocations) => {
        const targetIds = [
          ...new Set([...Object.keys(a), ...Object.keys(b)]),
        ] as Id<"giftTarget">[];
        return targetAllocationsEqual(a, b, targetIds, giftIds);
      },
      [giftIds],
    ),
    "targetAllocations",
  );

  const [
    targetBoxAllocations,
    setTargetBoxAllocations,
    setTargetBoxAllocationsUnchecked,
  ] = useSaveableState<TargetBoxAllocations>(
    {},
    useCallback((a: TargetBoxAllocations, b: TargetBoxAllocations) => {
      const targetIds = [
        ...new Set([...Object.keys(a), ...Object.keys(b)]),
      ] as Id<"giftTarget">[];
      return boxAllocationsEqual(a, b, targetIds);
    }, []),
    "targetBoxAllocations",
  );

  const [currentBondExp, setCurrentBondExp, setCurrentBondExpUnchecked] =
    useSaveableState<number>(0, undefined, "currentBondExp");
  const [targetBondExp, setTargetBondExp, setTargetBondExpUnchecked] =
    useSaveableState<number | null>(null, undefined, "targetBondExp");

  const [currentBondStr, setCurrentBondStr] = useState("1");
  const [targetBondStr, setTargetBondStr] = useState("");
  const [currentBondExpStr, setCurrentBondExpStr] = useState("0");
  const [targetBondExpStr, setTargetBondExpStr] = useState("");

  const [giftBoxesUsed, setGiftBoxesUsed, setGiftBoxesUsedUnchecked] =
    useSaveableState(0, undefined, "giftBoxesUsed");

  const [busy, setBusy] = useState(false);

  const inventoriesQuery = useQueryWithStatus(
    api.gifts.getOwn,
    isSignedIn ? {} : "skip",
  );

  const inventoryQuery = useQueryWithStatus(
    api.gifts.getOwnById,
    selectedInvenetoryId ? { id: selectedInvenetoryId } : "skip",
  );

  const inventoryTargets = useMemo(
    () => inventoryQuery.data?.targets ?? [],
    [inventoryQuery.data?.targets],
  );

  const filterTargetOptions = useMemo(
    () =>
      inventoryTargets.map((target) => ({
        studentId: target.studentId,
        studentName:
          studentWithGiftsMap.get(target.studentId)?.name ??
          studentMap[target.studentId]?.name ??
          t("tools.bond.inventory.target.unknown", {
            studentId: target.studentId,
          }),
      })),
    [inventoryTargets, studentWithGiftsMap, studentMap, t],
  );

  const showTargetRows = isSignedIn && !!selectedInvenetoryId;

  const activeTargetId = useMemo(() => {
    if (selectedTargetId) {
      return selectedTargetId;
    }
    if (!selectedStudent) {
      return null;
    }
    return (
      inventoryTargets.find((target) => target.studentId === selectedStudent.id)
        ?._id ?? null
    );
  }, [selectedTargetId, selectedStudent, inventoryTargets]);

  const allocatedGiftCounts = useMemo(() => {
    if (!showTargetRows) {
      return giftCounts;
    }
    if (!activeTargetId) {
      return Object.fromEntries(gifts.map((gift) => [gift.id, 0]));
    }
    return targetAllocations[activeTargetId] ?? {};
  }, [showTargetRows, giftCounts, activeTargetId, targetAllocations, gifts]);

  const allocatedBoxCount = useMemo(() => {
    if (!showTargetRows) {
      return giftBoxesUsed;
    }
    if (!activeTargetId) {
      return 0;
    }
    return targetBoxAllocations[activeTargetId] ?? 0;
  }, [showTargetRows, giftBoxesUsed, activeTargetId, targetBoxAllocations]);

  const displayedGifts = useMemo(() => {
    if (!showTargetRows) {
      if (!onlyDisplayRelevantGifts || !selectedStudent) {
        return gifts;
      }

      return gifts.filter((gift) =>
        isGiftPreferredByStudent(gift, selectedStudent),
      );
    }

    if (showAllGifts) {
      return gifts;
    }

    const filterStudents = inventoryTargets
      .filter((target) => filterStudentIds.has(target.studentId))
      .map((target) => studentWithGiftsMap.get(target.studentId))
      .filter((student): student is StudentWithGifts => !!student);

    if (filterStudents.length === 0) {
      return [];
    }

    return gifts.filter((gift) =>
      filterStudents.some((student) => isGiftPreferredByStudent(gift, student)),
    );
  }, [
    showTargetRows,
    onlyDisplayRelevantGifts,
    selectedStudent,
    showAllGifts,
    gifts,
    inventoryTargets,
    filterStudentIds,
    studentWithGiftsMap,
  ]);

  const sortedGifts = useMemo(() => {
    if (sortMethod === "default") {
      return displayedGifts;
    }

    const student = studentWithGiftsMap.get(sortMethod);
    if (!student) {
      return displayedGifts;
    }

    return sortGiftsByStudentPreference(displayedGifts, student);
  }, [displayedGifts, sortMethod, studentWithGiftsMap]);

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

    return {
      hasAdoredSSR: true,
      hasLovedSSR: true,
      hasLikedSSR: true,
      hasAdoredSR: selectedStudent.giftsAdored.some((g) => g.rarity === "SR"),
      hasLovedSR: selectedStudent.giftsLoved.some((g) => g.rarity === "SR"),
      hasLikedSR: selectedStudent.giftsLiked.some((g) => g.rarity === "SR"),
      hasNormalSR: true,
    };
  }, [selectedStudent]);

  const totalExp = useMemo(() => {
    if (!selectedStudent) {
      return 0;
    }

    let total = currentBondExp;

    for (const gift of gifts) {
      const count = allocatedGiftCounts[gift.id] ?? 0;
      if (count === 0) {
        continue;
      }

      total += count * getGiftExpValue(gift, selectedStudent);
    }

    const boxCount = allocatedBoxCount;
    if (boxCount > 0) {
      if (studentGiftKinds.hasAdoredSR) {
        total += boxCount * 80;
      } else if (studentGiftKinds.hasLovedSR) {
        total += boxCount * 60;
      } else {
        total += boxCount * 40;
      }
    }

    return total;
  }, [
    allocatedGiftCounts,
    allocatedBoxCount,
    selectedStudent,
    currentBondExp,
    gifts,
    studentGiftKinds,
  ]);

  const targetProjectedRanks = useMemo(() => {
    const ranks: Record<Id<"giftTarget">, number> = {};

    if (!showTargetRows) {
      return ranks;
    }

    for (const target of inventoryTargets) {
      const student = studentWithGiftsMap.get(target.studentId);
      if (!student) {
        continue;
      }

      const currentExp =
        target._id === selectedTargetId ? currentBondExp : target.currentExp;
      const projectedExp = computeTargetProjectedExp(
        target._id,
        student,
        gifts,
        targetAllocations,
        targetBoxAllocations,
        currentExp,
      );
      ranks[target._id] = getBondLevelFromTotalExp(projectedExp);
    }

    return ranks;
  }, [
    showTargetRows,
    inventoryTargets,
    studentWithGiftsMap,
    selectedTargetId,
    currentBondExp,
    gifts,
    targetAllocations,
    targetBoxAllocations,
  ]);

  const hasIrrelevantGifts = useMemo(() => {
    if (!selectedStudent) {
      return false;
    }

    if (!showTargetRows) {
      if (!onlyDisplayRelevantGifts) {
        return false;
      }

      return gifts.some((gift) => {
        if ((giftCounts[gift.id] ?? 0) === 0) {
          return false;
        }

        return !isGiftPreferredByStudent(gift, selectedStudent);
      });
    }

    if (showAllGifts || !activeTargetId) {
      return false;
    }

    const allocations = targetAllocations[activeTargetId] ?? {};
    const displayedIds = new Set(displayedGifts.map((gift) => gift.id));

    return gifts.some((gift) => {
      if ((allocations[gift.id] ?? 0) === 0) {
        return false;
      }
      return !displayedIds.has(gift.id);
    });
  }, [
    showTargetRows,
    onlyDisplayRelevantGifts,
    selectedStudent,
    giftCounts,
    showAllGifts,
    activeTargetId,
    targetAllocations,
    displayedGifts,
    gifts,
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
    if (!selectedStudent || !inventoryQuery.data) {
      return false;
    }
    return inventoryQuery.data.targets.some(
      (target) => target.studentId === selectedStudent.id,
    );
  }, [selectedStudent, inventoryQuery.data]);

  function updateCount(giftId: number, count: number) {
    setGiftCounts((prev) => ({
      ...prev,
      [giftId]: count,
    }));
  }

  function updateAllocation(
    targetId: Id<"giftTarget">,
    giftId: number,
    value: number,
  ) {
    setTargetAllocations((prev) => ({
      ...prev,
      [targetId]: {
        ...(prev[targetId] ?? {}),
        [giftId]: value,
      },
    }));
  }

  function updateBoxAllocation(targetId: Id<"giftTarget">, value: number) {
    setTargetBoxAllocations((prev) => ({
      ...prev,
      [targetId]: value,
    }));
  }

  function handleShowAllGiftsChange(checked: boolean) {
    setShowAllGifts(checked);
    if (checked) {
      setFilterStudentIds(
        new Set(inventoryTargets.map((target) => target.studentId)),
      );
    }
  }

  function handleFilterStudentToggle(studentId: string, checked: boolean) {
    setFilterStudentIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(studentId);
      } else {
        next.delete(studentId);
      }
      return next;
    });
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
    [selectedStudent, setCurrentBondExp, setCurrentBondExpUnchecked],
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
    [selectedStudent, setCurrentBondExp, setCurrentBondExpUnchecked],
  );

  const updateTargetBond = useCallback(
    (raw: string, unchecked = false) => {
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
    },
    [setTargetBondExp, setTargetBondExpUnchecked],
  );

  const updateTargetBondExp = useCallback(
    (raw: string, unchecked = false) => {
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
    },
    [setTargetBondExp, setTargetBondExpUnchecked],
  );

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

    await updateInventoryMutation({
      id: selectedInvenetoryId,
      name,
      gifts: Array.from(Object.entries(giftCounts)).map(([giftId, count]) => ({
        id: Number(giftId),
        count,
      })),
      giftBoxes: giftBoxesUsed,
    });
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
        gifts: gifts.map((gift) => ({ id: gift.id, count: 0 })),
        giftBoxCount: 0,
      });

      setSelectedTargetId(id);
      setTargetAllocations((prev) => ({
        ...prev,
        [id]: Object.fromEntries(gifts.map((gift) => [gift.id, 0])),
      }));
      setTargetBoxAllocations((prev) => ({
        ...prev,
        [id]: 0,
      }));
      setFilterStudentIds((prev) => new Set([...prev, selectedStudent.id]));

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

  async function handleSave() {
    if (busy) {
      return;
    }

    setBusy(true);

    try {
      if (selectedInvenetoryId) {
        await handleUpdateInventory();
      }

      if (inventoryQuery.data) {
        for (const target of inventoryQuery.data.targets) {
          await updateTargetMutation({
            id: target._id,
            gifts: serializeTargetAllocations(
              targetAllocations[target._id] ?? {},
            ),
            giftBoxCount: targetBoxAllocations[target._id] ?? 0,
            ...(target._id === selectedTargetId && {
              studentId: selectedStudent?.id,
              currentExp: currentBondExp,
              targetExp: targetBondExp ?? undefined,
            }),
          });
        }
      }

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

  async function handleDeleteInventory() {
    if (busy || !selectedInvenetoryId) {
      return;
    }

    setBusy(true);

    try {
      await destroyInventoryMutation({ id: selectedInvenetoryId });

      toast.success(t("tools.bond.toasts.inventoryDeleteSuccess"));

      setSelectedInventoryId(null);
      setSelectedTargetId(null);
      updateCurrentBondExp("0", true);
      updateTargetBondExp("", true);
      setSelectedStudent(null);
      setGiftCounts(Object.fromEntries(gifts.map((gift) => [gift.id, 0])));
      setTargetAllocations({});
      setTargetBoxAllocations({});
      setFilterStudentIds(new Set());
      setShowAllGifts(true);

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
      await destroyTargetMutation({ id: selectedTargetId });

      toast.success(t("tools.bond.toasts.targetDeleteSuccess"));

      setTargetAllocations((prev) => {
        const next = { ...prev };
        delete next[selectedTargetId];
        return next;
      });
      setTargetBoxAllocations((prev) => {
        const next = { ...prev };
        delete next[selectedTargetId];
        return next;
      });

      setSelectedTargetId(null);
      updateCurrentBondExp("0", true);
      updateTargetBondExp("", true);
      setSelectedStudent(null);

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
      setTargetAllocationsUnchecked({});
      setTargetBoxAllocationsUnchecked({});
      setFilterStudentIds(new Set());
      setShowAllGifts(true);
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
      return;
    }

    if (value === selectedTargetId) {
      return;
    }

    setSelectedTargetId(value as Id<"giftTarget">);
  }

  const createInventoryMutation = useMutation(api.gifts.createInventory);
  const createTargetMutation = useMutation(api.gifts.createTarget);
  const updateInventoryMutation = useMutation(api.gifts.updateInventory);
  const updateTargetMutation = useMutation(api.gifts.updateTarget);
  const destroyInventoryMutation = useMutation(api.gifts.destroyInventory);
  const destroyTargetMutation = useMutation(api.gifts.destroyTarget);

  useEffect(() => {
    if (inventoryQuery.status !== "success" || !inventoryQuery.data) {
      return;
    }

    const inventoryCounts: Record<number, number> = {};
    for (const gift of inventoryQuery.data.inventory.gifts) {
      inventoryCounts[gift.id] = gift.count;
    }

    setGiftCountsUnchecked((prev) => ({
      ...prev,
      ...inventoryCounts,
    }));

    if (typeof inventoryQuery.data.inventory.giftBoxes === "number") {
      setGiftBoxesUsedUnchecked(inventoryQuery.data.inventory.giftBoxes);
    }

    const newTargetAllocations: TargetAllocations = {};
    const newBoxAllocations: TargetBoxAllocations = {};

    for (const target of inventoryQuery.data.targets) {
      newTargetAllocations[target._id] = buildTargetAllocationsFromDoc(
        target,
        giftIds,
        inventoryCounts,
      );
      newBoxAllocations[target._id] = normalizeTargetGiftBoxCount(
        target,
        inventoryQuery.data.inventory.giftBoxes ?? 0,
      );
    }

    setTargetAllocationsUnchecked(newTargetAllocations);
    setTargetBoxAllocationsUnchecked(newBoxAllocations);
    setFilterStudentIds(
      new Set(inventoryQuery.data.targets.map((target) => target.studentId)),
    );
  }, [inventoryQuery.status, inventoryQuery.data?.inventory._id, giftIds]);

  useEffect(() => {
    if (!inventoryQuery.data || !selectedTargetId) {
      return;
    }

    const target = inventoryQuery.data.targets.find(
      (entry) => entry._id === selectedTargetId,
    );
    if (!target) {
      return;
    }

    setSelectedStudent(
      students.find((student) => student.id === target.studentId) || null,
    );
    updateCurrentBondExp(target.currentExp.toString(), true);
    updateTargetBondExp(target.targetExp?.toString() ?? "", true);
  }, [selectedTargetId, inventoryQuery.data, students]);

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

                      {inventoryTargets.map((target) => (
                        <SelectItem key={target._id} value={target._id}>
                          {studentWithGiftsMap.get(target.studentId)?.name ??
                            studentMap[target.studentId]?.name ??
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

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Label className="shrink-0">{t("tools.bond.sort.label")}</Label>

          <Select value={sortMethod} onValueChange={setSortMethod}>
            <SelectTrigger className="min-w-[180px]">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="default">
                {t("tools.bond.sort.default")}
              </SelectItem>

              {filterTargetOptions.map((target) => (
                <SelectItem key={target.studentId} value={target.studentId}>
                  {t("tools.bond.sort.relevance.student", {
                    studentName: target.studentName,
                  })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {showTargetRows && filterTargetOptions.length > 0 && (
            <>
              <Label className="shrink-0">{t("tools.bond.filter.label")}</Label>
              <GiftPreferenceFilter
                showAllGifts={showAllGifts}
                filterStudentIds={filterStudentIds}
                targets={filterTargetOptions}
                onShowAllGiftsChange={handleShowAllGiftsChange}
                onFilterStudentToggle={handleFilterStudentToggle}
              />
            </>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedGifts.map((gift) => (
            <GiftAllocationCard
              key={gift.id}
              gift={gift}
              inventoryTotal={giftCounts[gift.id] ?? 0}
              targets={showTargetRows ? inventoryTargets : []}
              studentMap={studentWithGiftsMap}
              targetAllocations={targetAllocations}
              onInventoryTotalChange={(value) => updateCount(gift.id, value)}
              onAllocationChange={updateAllocation}
              onTargetSelect={setSelectedTargetId}
              selectedStudent={showTargetRows ? null : selectedStudent}
              targetProjectedRanks={targetProjectedRanks}
            />
          ))}

          <GiftChoiceBoxCard
            inventoryTotal={giftBoxesUsed}
            targets={showTargetRows ? inventoryTargets : []}
            studentMap={studentWithGiftsMap}
            boxAllocations={targetBoxAllocations}
            onInventoryTotalChange={setGiftBoxesUsed}
            onAllocationChange={updateBoxAllocation}
            onTargetSelect={setSelectedTargetId}
            targetProjectedRanks={targetProjectedRanks}
          />
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
              ? selectedStudent.name
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
                {!showTargetRows && (
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
                )}

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

            {hasIrrelevantGifts && (
              <Alert>
                <AlertCircleIcon />
                <AlertTitle>
                  {t("tools.bond.student.irrelevantGifts.title")}
                </AlertTitle>
                <AlertDescription>
                  {t(
                    showTargetRows
                      ? "tools.bond.student.irrelevantGifts.description"
                      : "tools.bond.student.irrelevantGifts.onlyFavoriteDescription",
                  )}
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
              allocatedCounts={allocatedGiftCounts}
              allocatedBoxCount={allocatedBoxCount}
              selectedStudent={selectedStudent}
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
