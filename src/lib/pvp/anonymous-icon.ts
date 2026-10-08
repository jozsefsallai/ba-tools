import type { PvpPixelImage, PvpStudentField } from "@/lib/pvp";
import descriptor from "@/lib/pvp/anonymous-icon.json";
import {
  PVP_ICON_CATALOG_FORMAT,
  type PvpIconCatalog,
  matchPvpIcon,
} from "@/lib/pvp/icon-match";

// 12x12 RGBA samples from the question-mark representative in the supplied
// anonymous report. This is a UI template, independent of student artwork.
const templates = Uint8Array.from(descriptor);

const catalog: PvpIconCatalog = {
  format: PVP_ICON_CATALOG_FORMAT,
  asset: "anonymous",
  students: [{ id: "anonymous", name: "Anonymous" }],
};

export function recognizePvpAnonymousOpponent(
  image: PvpPixelImage,
): PvpStudentField | null {
  const match = matchPvpIcon(
    { ...image, iconCard: undefined },
    catalog,
    templates,
  );
  const distance = match.candidates[0]?.distance;

  // Require a close UI-template match, rather than the more permissive student
  // threshold. Pale student portraits and blank blue/white crops must not pass.
  if (distance == null || distance > 18) {
    return null;
  }

  return {
    value: null,
    rawText: "Anonymous icon",
    confidence: match.confidence,
    uncertain: false,
    crop: image,
    iconMatch: {
      studentId: null,
      candidates: [],
      confidence: match.confidence,
      margin: 0,
      uncertain: false,
    },
  };
}
