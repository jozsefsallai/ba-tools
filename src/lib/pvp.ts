import type { PvpScreenshotROIMap } from "@/lib/pvp-screenshot-types";
import { PVP_SCREENSHOT_ROI_MEDIA_TYPE } from "@/lib/pvp-screenshot-types";
import { Output, generateText } from "ai";
import z from "zod";

export type PvpScreenshotROIImages = PvpScreenshotROIMap<Buffer>;

export async function extractPvpBattleInfo(
  screenshots: PvpScreenshotROIImages,
) {
  const result = await generateText({
    model: "google/gemini-2.5-flash-lite",
    system:
      "Analyze the four labeled image regions from a Tactical Challenge battle report. These are intentional crops and do not include the report title or the full surrounding UI; do not require those elements to mark the report valid. Assess the crops together. The user is always represented by myUnits and the enemy by enemyUnits.",
    output: Output.object({
      schema: z.object({
        valid: z
          .boolean()
          .describe(
            "Whether the supplied crops visibly contain the expected Tactical Challenge report elements: a sword or shield and user result, an enemy name area, and both sides' unit damage charts. Do not reject the input merely because the crops omit the title or other screen chrome.",
          ),
        battle: z
          .object({
            battleType: z
              .enum(["ATTACK", "DEFENSE"])
              .describe(
                "Use battleTypeAndResult: ATTACK when the icon is a sword and DEFENSE when it is a shield.",
              ),
            result: z
              .enum(["WIN", "LOSE"])
              .describe(
                "Use battleTypeAndResult to determine whether the user (not the opponent) won or lost.",
              ),
            enemyName: z
              .string()
              .nullable()
              .describe(
                "Use enemyName. Extract only the enemy name. If it is Anonymous, return null.",
              ),
            myUnits: z
              .array(
                z.object({
                  student: z
                    .string()
                    .describe(
                      "The name of the student, including the name of the variant, if applicable.",
                    ),
                  damage: z
                    .number()
                    .describe(
                      "The damage this student has dealt, shown above the bar in myUnits.",
                    ),
                }),
              )
              .describe(
                "Use myUnits to identify every student deployed by the user, including variants, and pair each with its damage dealt.",
              ),
            enemyUnits: z
              .array(
                z.object({
                  student: z
                    .string()
                    .describe(
                      "The name of the student, including the name of the variant, if applicable.",
                    ),
                  damage: z
                    .number()
                    .describe(
                      "The damage this student has dealt, shown above the bar in enemyUnits.",
                    ),
                }),
              )
              .describe(
                "Use enemyUnits to identify every student deployed by the enemy, including variants, and pair each with its damage dealt.",
              ),
          })
          .nullable()
          .describe(
            "The battle information. Should be null if the supplied regions are not a valid report.",
          ),
      }),
    }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "battleTypeAndResult: sword/shield icon and the user's result.",
          },
          {
            type: "file",
            data: screenshots.battleTypeAndResult,
            mediaType: PVP_SCREENSHOT_ROI_MEDIA_TYPE,
          },
          {
            type: "text",
            text: "enemyName: the enemy's name, it can contain any characters.",
          },
          {
            type: "file",
            data: screenshots.enemyName,
            mediaType: PVP_SCREENSHOT_ROI_MEDIA_TYPE,
          },
          {
            type: "text",
            text: "myUnits: the user's students and their damage dealt",
          },
          {
            type: "file",
            data: screenshots.myUnits,
            mediaType: PVP_SCREENSHOT_ROI_MEDIA_TYPE,
          },
          {
            type: "text",
            text: "enemyUnits: the enemy's students and their damage dealt",
          },
          {
            type: "file",
            data: screenshots.enemyUnits,
            mediaType: PVP_SCREENSHOT_ROI_MEDIA_TYPE,
          },
        ],
      },
    ],
  });

  return result.output;
}

export type PvpBattleInfo = Awaited<ReturnType<typeof extractPvpBattleInfo>>;
