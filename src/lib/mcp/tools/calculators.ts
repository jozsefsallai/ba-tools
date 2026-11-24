import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { defineTool } from "@/lib/mcp/define-tool";
import {
  calculateRaidScore,
  calculateStudentExp,
  raidScoreSchema,
  studentExpSchema,
} from "@/lib/public-api/resources/calculators.server";

export function registerCalculatorTools(server: McpServer) {
  defineTool(
    server,
    "calculate_raid_score",
    {
      title: "Calculate raid score",
      description:
        "Total Assault and Grand Assault score calculator. Send `boss` (or its `duration`), `difficulty`, and exactly one of `clearTimes` (the time each team spent), `remainingTime` (what was left on the clock for a single team) or `score` (to find the total clear time it takes). Returns the score with the total clear time; `remainingTime` is `null` for several teams. For Grand Assault, calculate each armor type separately and add up the scores.",
      kind: "read",
      input: raidScoreSchema.shape,
    },
    (input) => calculateRaidScore(input),
  );

  defineTool(
    server,
    "calculate_student_exp",
    {
      title: "Calculate student EXP",
      description:
        "How many students can be raised from one level to another with the Activity Reports owned, and what's left over. `expPerStudent` is the EXP one student needs, so it also answers how much EXP a level range takes when no reports are sent. Reports are spent whole, smallest first, so a student can use a bit more EXP than needed; don't divide the total EXP instead.",
      kind: "read",
      input: studentExpSchema.shape,
    },
    (input) => calculateStudentExp(input),
  );
}
