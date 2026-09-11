import "server-only";

import { db } from "@/lib/db";
import { unstable_cache } from "next/cache";

export type EmblemStudent = {
  id: string;
  devName: string;
  firstName: string;
  lastName: string;
};

export function getCachedEmblemStudent(rawStudent: string) {
  const finalRawStudent =
    rawStudent === "hoshino_battle" ? "hoshino_battle_tank" : rawStudent;

  const numberParsedStudent = Number.parseInt(finalRawStudent, 10);

  return unstable_cache(
    async (): Promise<EmblemStudent | null> =>
      db.student.findFirst({
        where: {
          OR: [
            { devName: finalRawStudent },
            { id: finalRawStudent },
            ...(Number.isNaN(numberParsedStudent)
              ? []
              : [{ schaleDbId: numberParsedStudent }]),
          ],
        },
        select: {
          id: true,
          devName: true,
          firstName: true,
          lastName: true,
        },
      }),
    ["emblem-student", finalRawStudent],
    {
      revalidate: 86_400,
    },
  )();
}
