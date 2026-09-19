import { z } from "zod";

export const planaExpressions = z.enum([
  "idle", // 01
  "slight_smile", // 03
  "serious", // 04
  "yelling", // 05
  "worried", // 06
  "shocked", // 07
  "shocked_normal_halo", // 08
  "sparkly_eyes", // 09
  "loudly_yelling", // 10
  "attentive", // 11
  "sad", // 12
  "disappointed", // 12
  "confused", // 13
  "embarrassed", // 14
  "mouth_open", // 15
  "happy", // 16
  "loved", // 17
  "intense_stare", // 19
  "mad", // 20
  "sleeping", // 99
  "thinking", // 99
  "closed_eyes", // 99
]);

export type PlanaExpression = z.infer<typeof planaExpressions>;
