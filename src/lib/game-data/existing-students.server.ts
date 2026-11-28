import { db } from "../db";
import type { ExistingStudents, ImageStudent, SpriteStudent } from "./contract";

export async function getExistingStudents(): Promise<ExistingStudents> {
  const rows = await db.student.findMany({
    select: {
      devName: true,
      schaleDbId: true,
      defaultOrder: true,
    },
  });

  return {
    devNames: rows.map((r) => r.devName),
    characterIds: rows.map((r) => r.schaleDbId),
    maxDefaultOrder: rows.reduce((max, r) => Math.max(max, r.defaultOrder), 0),
  };
}

export async function resolveAllImageStudents(): Promise<ImageStudent[]> {
  const rows = await db.student.findMany({
    select: {
      id: true,
      devName: true,
      schaleDbId: true,
    },
    orderBy: {
      defaultOrder: "asc",
    },
  });

  return rows.map((row) => ({
    devName: row.devName,
    characterId: row.schaleDbId,
    pathName: row.id,
  }));
}

export async function resolveSpriteStudents(): Promise<SpriteStudent[]> {
  const rows = await db.student.findMany({
    select: {
      id: true,
      devName: true,
      schaleDbId: true,
      firstNameJP: true,
      defaultOrder: true,
      baseVariantId: true,
    },
  });

  return rows.map((row) => ({
    devName: row.devName,
    characterId: row.schaleDbId,
    pathName: row.id,
    family: row.baseVariantId ?? row.id,
    firstNameJP: row.firstNameJP,
    order: row.defaultOrder,
  }));
}

export async function resolveImageStudents(
  devNames: string[],
): Promise<ImageStudent[]> {
  const rows = await db.student.findMany({
    where: {
      devName: {
        in: devNames,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      devName: true,
      schaleDbId: true,
    },
  });

  const byDevName = new Map(
    rows.map((r) => [
      r.devName.toLowerCase(),
      r,
    ]),
  );

  const unknown = devNames.filter((n) => !byDevName.has(n.toLowerCase()));

  if (unknown.length > 0) {
    throw new Error(
      `No student with devName ${unknown.join(", ")} in the database; seed them first`,
    );
  }

  return devNames.map((n) => {
    // biome-ignore lint/style/noNonNullAssertion: unknown names were rejected above
    const row = byDevName.get(n.toLowerCase())!;

    return {
      devName: row.devName,
      characterId: row.schaleDbId,
      pathName: row.id,
    };
  });
}
