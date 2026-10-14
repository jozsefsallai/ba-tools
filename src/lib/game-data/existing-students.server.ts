import { db } from "../db";
import type { ExistingStudents, ImageStudent } from "./contract";

export async function getExistingStudents(): Promise<ExistingStudents> {
  const rows = await db.student.findMany({
    select: { devName: true, schaleDbId: true, defaultOrder: true },
  });

  return {
    devNames: rows.map((r) => r.devName),
    characterIds: rows.map((r) => r.schaleDbId),
    maxDefaultOrder: rows.reduce((max, r) => Math.max(max, r.defaultOrder), 0),
  };
}

export async function resolveImageStudents(
  devNames: string[],
): Promise<ImageStudent[]> {
  const rows = await db.student.findMany({
    where: { devName: { in: devNames, mode: "insensitive" } },
    select: { id: true, devName: true, schaleDbId: true },
  });

  const byDevName = new Map(rows.map((r) => [r.devName.toLowerCase(), r]));

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
