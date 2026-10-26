import "server-only";

import { db } from "@/lib/db";

export type ResolvedStudentIdentifier = {
  id: string;
  canonical: boolean;
};

/**
 * Resolves a student URL identifier, which can be the database ID (e.g.
 * `hoshino_swimsuit`), the SchaleDB ID (e.g. `10023`) or the dev name. Only
 * the database ID is canonical; the other forms should redirect to it.
 */
export async function resolveStudentIdentifier(
  identifier: string,
): Promise<ResolvedStudentIdentifier | null> {
  const decoded = decodeURIComponent(identifier).trim();
  if (!decoded) {
    return null;
  }

  const byId = await db.student.findUnique({
    where: { id: decoded },
    select: { id: true },
  });

  if (byId) {
    return { id: byId.id, canonical: true };
  }

  if (/^\d+$/.test(decoded)) {
    const bySchaleDbId = await db.student.findFirst({
      where: { schaleDbId: Number.parseInt(decoded, 10) },
      select: { id: true },
    });

    if (bySchaleDbId) {
      return { id: bySchaleDbId.id, canonical: false };
    }
  }

  const byDevName =
    (await db.student.findFirst({
      where: { devName: decoded },
      select: { id: true },
    })) ??
    (await db.student.findFirst({
      where: { devName: { equals: decoded, mode: "insensitive" } },
      select: { id: true },
    }));

  if (byDevName) {
    return { id: byDevName.id, canonical: false };
  }

  return null;
}
