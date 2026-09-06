import { Output, generateText } from "ai";
import z from "zod";

export async function extractPvpBattleInfo(
  screenshot: Buffer,
  mediaType: "image/jpeg" | "image/png" | "image/webp" = "image/jpeg",
) {
  const result = await generateText({
    model: "google/gemini-2.5-flash-lite",
    system:
      "Analyze the provided screenshot and extract information about a Tactical Challenge battle. My user is always on the left half and the enemy is always on the right half.",
    output: Output.object({
      schema: z.object({
        valid: z
          .boolean()
          .describe(
            "Whether the supplied screenshot is a valid Tactical Challenge Combat Report screen.",
          ),
        battle: z
          .object({
            battleType: z
              .enum(["ATTACK", "DEFENSE"])
              .describe(
                "This should be ATTACK if the icon on the left side resembles a sword and DEFENSE if it resembles a shield.",
              ),
            result: z
              .enum(["WIN", "LOSE"])
              .describe(
                'Whether the text on the left side says "Win" or "Lose"',
              ),
            enemyName: z
              .string()
              .nullable()
              .describe(
                "The name of the enemy on the right side of the screen. If the enemy name is Anonymous, this value should be null.",
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
                      "The damage this student has dealt, the number above the bar in the chart.",
                    ),
                }),
              )
              .describe(
                "An array of students that the player (left side) has deployed.",
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
                      "The damage this student has taken, the number above the bar in the chart.",
                    ),
                }),
              )
              .describe(
                "An array of students that the enemy (right side) has deployed.",
              ),
          })
          .nullable()
          .describe(
            "The battle information. Should be null if the provided screenshot is invalid.",
          ),
      }),
    }),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "file",
            data: screenshot,
            mediaType,
          },
        ],
      },
    ],
  });

  return result.output;
}

export type PvpBattleInfo = Awaited<ReturnType<typeof extractPvpBattleInfo>>;
