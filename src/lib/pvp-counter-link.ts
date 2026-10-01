import type { PVPFormationStudentRecord } from "@/app/[locale]/pvp/_lib/types";
import { type PVPSeasonNumber, PVP_SEASONS } from "@/lib/types";

export type InitialCounterSearch = {
  seasonNumber: PVPSeasonNumber;
  defenseTeam: PVPFormationStudentRecord[];
};

const STUDENT_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz_";
const STUDENT_ID_CODE = new Map(
  [...STUDENT_ID_ALPHABET].map((character, index) => [character, index]),
);

function appendBits(bits: number[], value: number, width: number) {
  for (let bit = width - 1; bit >= 0; bit -= 1) {
    bits.push((value >> bit) & 1);
  }
}

function encodeDefenseTeam(defenseTeam: PVPFormationStudentRecord[]) {
  if (defenseTeam.length !== 6) {
    throw new Error("A defense team must contain six slots");
  }

  const bits: number[] = [];
  const ids = defenseTeam.map((slot) => slot.studentId ?? "");

  for (const studentId of ids) {
    if (studentId.length > 255) {
      throw new Error("Student ID is too long to encode");
    }

    appendBits(bits, studentId.length, 8);
  }

  for (const studentId of ids) {
    for (const character of studentId) {
      const code = STUDENT_ID_CODE.get(character);

      if (code === undefined) {
        throw new Error("Student ID contains an unsupported character");
      }

      appendBits(bits, code, 5);
    }
  }

  const bytes = new Uint8Array(Math.ceil(bits.length / 8));

  for (const [index, bit] of bits.entries()) {
    bytes[Math.floor(index / 8)] |= bit << (7 - (index % 8));
  }

  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeDefenseTeam(value: string): PVPFormationStudentRecord[] {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new Error("Invalid defense encoding");
  }

  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));

  const binary = atob(padded + padding);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  if (bytes.length < 6) {
    throw new Error("Invalid defense payload");
  }

  const bits = Array.from(bytes, (byte) =>
    Array.from({ length: 8 }, (_, index) => (byte >> (7 - index)) & 1),
  ).flat();

  const lengths = bytes.slice(0, 6);
  const totalCharacters = lengths.reduce((total, length) => total + length, 0);
  const requiredBits = 48 + totalCharacters * 5;

  if (requiredBits > bits.length) {
    throw new Error("Invalid defense payload");
  }

  let offset = 48;
  const ids: string[] = [];

  for (const length of lengths) {
    let studentId = "";

    for (let character = 0; character < length; character += 1) {
      let code = 0;

      for (let bit = 0; bit < 5; bit += 1) {
        code = (code << 1) | bits[offset];
        offset += 1;
      }

      const decodedCharacter = STUDENT_ID_ALPHABET[code];

      if (!decodedCharacter) {
        throw new Error("Invalid defense payload");
      }

      studentId += decodedCharacter;
    }

    ids.push(studentId);
  }

  if (bits.slice(requiredBits).some(Boolean)) {
    throw new Error("Invalid defense payload");
  }

  return ids.map((studentId) => ({ studentId: studentId || undefined }));
}

export function buildPvpCounterSearchHref(
  search: InitialCounterSearch,
): string {
  const params = new URLSearchParams({
    season: String(search.seasonNumber),
    defense: encodeDefenseTeam(search.defenseTeam),
  });

  return `/pvp/search?${params.toString()}`;
}

export function parsePvpCounterSearchParams(
  params: Record<string, string | string[] | undefined>,
): InitialCounterSearch | null {
  const season = params.season;
  const defense = params.defense;
  const seasonValue = Array.isArray(season) ? season[0] : season;
  const defenseValue = Array.isArray(defense) ? defense[0] : defense;
  const seasonNumber = Number(seasonValue);

  if (
    !Number.isInteger(seasonNumber) ||
    !PVP_SEASONS.includes(seasonNumber as PVPSeasonNumber) ||
    !defenseValue
  ) {
    return null;
  }

  try {
    const decoded = decodeDefenseTeam(defenseValue);
    if (decoded.length !== 6) {
      return null;
    }

    return {
      seasonNumber: seasonNumber as PVPSeasonNumber,
      defenseTeam: decoded,
    };
  } catch {
    return null;
  }
}
