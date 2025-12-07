import type { Student } from "~prisma";

export const VARIANT_RE = /\(.+\)/g;

export function getVariantShorthand(variant: string) {
  const normalizedVariant = variant.trim().toLowerCase();

  switch (normalizedVariant) {
    case "swimsuit":
      return "S";
    case "cycling":
      return "C";
    case "casual":
      return "C";
    case "bunny":
    case "bunny girl":
      return "B";
    case "hot spring":
      return "O";
    case "new year":
      return "NY";
    case "cheer squad":
      return "C";
    case "track":
      return "T";
    case "christmas":
      return "X";
    case "maid":
      return "M";
    case "camp":
      return "C";
    case "dress":
      return "D";
    case "guide":
      return "G";
    case "band":
      return "B";
    case "armed":
      return "A";
    case "qipao":
      return "Q";
    case "pop idol":
      return "I";
    case "pajamas":
      return "PJ";
    case "school":
      return "U";
    case "part-time job":
    case "parttimer":
    case "part-timer":
      return "PT";
    default:
      return variant
        .split(" ")
        .map((w) => w[0].toUpperCase())
        .join("");
  }
}

export function getShorthand(student: Student) {
  if (student.id === "shun_small") {
    return "Shunny";
  }

  if (student.id === "hatsune_miku") {
    return "Miku";
  }

  if (student.id === "misaka_mikoto") {
    return "Misaka";
  }

  if (student.id === "shokuhou_misaki") {
    return "Shokuhou";
  }

  if (student.id === "saten_ruiko") {
    return "Saten";
  }

  if (student.id === "shiroko_terror") {
    return "Kuroko";
  }

  if (student.id.startsWith("hoshino_battle")) {
    return "B.Hoshino";
  }

  if (!student.baseVariantId) {
    return student.name;
  }

  const variantMatch = student.name.match(VARIANT_RE);
  if (!variantMatch) {
    return student.name;
  }

  const variant = variantMatch[0].slice(1, -1).trim();
  const shorthand = getVariantShorthand(variant);
  return `${shorthand}.${student.name.replace(VARIANT_RE, "").trim()}`;
}
