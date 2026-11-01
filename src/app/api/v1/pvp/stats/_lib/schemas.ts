import { PVP_SEASONS } from "@/lib/types";
import { z } from "zod";

export const seasonNumberSchema = z.coerce
  .number()
  .pipe(z.union(PVP_SEASONS.map((season) => z.literal(season))));

export const searchSlotSchema = z.object({
  studentId: z.string().optional(),
  range: z.number().optional(),
  tank: z.boolean().optional(),
});

export const studentIdListSchema = z
  .string()
  .optional()
  .transform((value) =>
    value
      ? value
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [],
  );
