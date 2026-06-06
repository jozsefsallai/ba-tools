import type { GiftWithStudents, StudentWithGifts } from "@/app/bond/_lib/types";
import type { Doc, Id } from "~convex/dataModel";

export type GiftAffinity = "adored" | "loved" | "liked" | "normal";

const AFFINITY_ORDER: Record<GiftAffinity, number> = {
  adored: 4,
  loved: 3,
  liked: 2,
  normal: 1,
};

export type GiftTargetDoc = Doc<"giftTarget">;

export type TargetGiftEntry = GiftTargetDoc["gifts"][number];

export function isGiftAdoredByStudent(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  return (
    student.giftsAdored.some((g) => g.id === gift.id) ||
    (gift.isLovedByEveryone && gift.expValue === 60)
  );
}

export function isGiftLovedByStudent(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  return (
    student.giftsLoved.some((g) => g.id === gift.id) ||
    (gift.isLovedByEveryone && gift.expValue !== 60)
  );
}

export function isGiftLikedByStudent(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  return student.giftsLiked.some((g) => g.id === gift.id);
}

export function getGiftAffinity(
  gift: GiftWithStudents,
  student: StudentWithGifts,
): GiftAffinity {
  if (isGiftAdoredByStudent(gift, student)) {
    return "adored";
  }

  if (isGiftLovedByStudent(gift, student)) {
    return "loved";
  }

  if (isGiftLikedByStudent(gift, student)) {
    return "liked";
  }

  return "normal";
}

export function getGiftExpMultiplier(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  const affinity = getGiftAffinity(gift, student);

  switch (affinity) {
    case "adored":
      return 4;
    case "loved":
      return 3;
    case "liked":
      return 2;
    case "normal":
      return gift.rarity === "SSR" ? 2 : 1;
  }
}

export function getGiftExpValue(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  return gift.expValue * getGiftExpMultiplier(gift, student);
}

export function isGiftPreferredByStudent(
  gift: GiftWithStudents,
  student: StudentWithGifts,
) {
  return (
    gift.isLovedByEveryone ||
    isGiftAdoredByStudent(gift, student) ||
    isGiftLovedByStudent(gift, student) ||
    isGiftLikedByStudent(gift, student)
  );
}

export function sortGiftsByStudentPreference(
  gifts: GiftWithStudents[],
  student: StudentWithGifts,
) {
  const adored = gifts
    .filter((gift) => isGiftAdoredByStudent(gift, student))
    .sort((a, b) => b.expValue - a.expValue);

  const loved = gifts
    .filter(
      (gift) =>
        !isGiftAdoredByStudent(gift, student) &&
        isGiftLovedByStudent(gift, student),
    )
    .sort((a, b) => b.expValue - a.expValue);

  const liked = gifts
    .filter(
      (gift) =>
        !isGiftAdoredByStudent(gift, student) &&
        !isGiftLovedByStudent(gift, student) &&
        isGiftLikedByStudent(gift, student),
    )
    .sort((a, b) => b.expValue - a.expValue);

  const ids = new Set([
    ...adored.map((g) => g.id),
    ...loved.map((g) => g.id),
    ...liked.map((g) => g.id),
  ]);

  const normal = gifts
    .filter((gift) => !ids.has(gift.id))
    .sort((a, b) => b.expValue - a.expValue);

  return [...adored, ...loved, ...liked, ...normal];
}

export function sortTargetsByGiftAffinity(
  gift: GiftWithStudents,
  targets: GiftTargetDoc[],
  studentMap: Map<string, StudentWithGifts>,
) {
  return [...targets].sort((a, b) => {
    const studentA = studentMap.get(a.studentId);
    const studentB = studentMap.get(b.studentId);

    if (!studentA || !studentB) {
      return 0;
    }

    const affinityDiff =
      AFFINITY_ORDER[getGiftAffinity(gift, studentB)] -
      AFFINITY_ORDER[getGiftAffinity(gift, studentA)];

    if (affinityDiff !== 0) {
      return affinityDiff;
    }

    return studentA.name.localeCompare(studentB.name);
  });
}

export function normalizeTargetGiftEntry(
  gift: TargetGiftEntry,
  inventoryCount: number,
) {
  if (typeof gift.count === "number") {
    return gift.count;
  }

  return gift.enabled ? inventoryCount : 0;
}

export function normalizeTargetGiftBoxCount(
  target: GiftTargetDoc,
  inventoryBoxes: number,
) {
  if (typeof target.giftBoxCount === "number") {
    return target.giftBoxCount;
  }

  return target.useGiftBoxes ? inventoryBoxes : 0;
}

export function buildTargetAllocationsFromDoc(
  target: GiftTargetDoc,
  giftIds: number[],
  inventoryCounts: Record<number, number>,
) {
  const giftMap = new Map(target.gifts.map((gift) => [gift.id, gift]));
  const allocations: Record<number, number> = {};

  for (const giftId of giftIds) {
    const entry = giftMap.get(giftId);
    allocations[giftId] = entry
      ? normalizeTargetGiftEntry(entry, inventoryCounts[giftId] ?? 0)
      : 0;
  }

  return allocations;
}

export function getTotalAllocated(
  allocationsByTarget: Record<Id<"giftTarget">, Record<number, number>>,
  giftId: number,
  excludeTargetId?: Id<"giftTarget">,
) {
  let total = 0;

  for (const [targetId, allocations] of Object.entries(allocationsByTarget)) {
    if (excludeTargetId && targetId === excludeTargetId) {
      continue;
    }

    total += allocations[Number(giftId)] ?? 0;
  }

  return total;
}

export function getRemainingAllocatable(
  inventoryTotal: number,
  allocationsByTarget: Record<Id<"giftTarget">, Record<number, number>>,
  giftId: number,
  excludeTargetId?: Id<"giftTarget">,
) {
  const allocated = getTotalAllocated(
    allocationsByTarget,
    giftId,
    excludeTargetId,
  );

  return Math.max(0, inventoryTotal - allocated);
}

export function getTotalBoxAllocated(
  boxAllocations: Record<Id<"giftTarget">, number>,
  excludeTargetId?: Id<"giftTarget">,
) {
  let total = 0;

  for (const [targetId, count] of Object.entries(boxAllocations)) {
    if (excludeTargetId && targetId === excludeTargetId) {
      continue;
    }

    total += count;
  }

  return total;
}

export function getRemainingBoxAllocatable(
  inventoryTotal: number,
  boxAllocations: Record<Id<"giftTarget">, number>,
  excludeTargetId?: Id<"giftTarget">,
) {
  return Math.max(
    0,
    inventoryTotal - getTotalBoxAllocated(boxAllocations, excludeTargetId),
  );
}

export function serializeTargetAllocations(
  allocations: Record<number, number>,
) {
  return Object.entries(allocations).map(([giftId, count]) => ({
    id: Number(giftId),
    count,
  }));
}

export function allocationsEqual(
  a: Record<number, number>,
  b: Record<number, number>,
  giftIds: number[],
) {
  for (const giftId of giftIds) {
    if ((a[giftId] ?? 0) !== (b[giftId] ?? 0)) {
      return false;
    }
  }

  return true;
}

export function boxAllocationsEqual(
  a: Record<Id<"giftTarget">, number>,
  b: Record<Id<"giftTarget">, number>,
  targetIds: Id<"giftTarget">[],
) {
  for (const targetId of targetIds) {
    if ((a[targetId] ?? 0) !== (b[targetId] ?? 0)) {
      return false;
    }
  }

  return true;
}

export function targetAllocationsEqual(
  a: Record<Id<"giftTarget">, Record<number, number>>,
  b: Record<Id<"giftTarget">, Record<number, number>>,
  targetIds: Id<"giftTarget">[],
  giftIds: number[],
) {
  for (const targetId of targetIds) {
    if (!allocationsEqual(a[targetId] ?? {}, b[targetId] ?? {}, giftIds)) {
      return false;
    }
  }

  return true;
}

export function getGiftBoxExpPerUnit(student: StudentWithGifts): number {
  if (student.giftsAdored.some((gift) => gift.rarity === "SR")) {
    return 80;
  }

  if (student.giftsLoved.some((gift) => gift.rarity === "SR")) {
    return 60;
  }

  return 40;
}

export function computeTargetProjectedExp(
  targetId: Id<"giftTarget">,
  student: StudentWithGifts,
  gifts: GiftWithStudents[],
  targetAllocations: Record<Id<"giftTarget">, Record<number, number>>,
  targetBoxAllocations: Record<Id<"giftTarget">, number>,
  currentExp: number,
): number {
  let total = currentExp;
  const allocations = targetAllocations[targetId] ?? {};

  for (const gift of gifts) {
    const count = allocations[gift.id] ?? 0;
    if (count > 0) {
      total += count * getGiftExpValue(gift, student);
    }
  }

  const boxCount = targetBoxAllocations[targetId] ?? 0;
  if (boxCount > 0) {
    total += boxCount * getGiftBoxExpPerUnit(student);
  }

  return total;
}
