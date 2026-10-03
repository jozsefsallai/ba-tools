import type { PVPFormationStudentRecord } from "@/app/[locale]/pvp/_lib/types";
import {
  type PVPCounterDefenseSlot,
  type PVPCounterRange,
  type PVPSeasonNumber,
  PVP_COUNTER_RANGES,
  PVP_SEASONS,
} from "@/lib/types";

export type InitialCounterSearch = {
  seasonNumber: PVPSeasonNumber;
  defenseTeam: Array<PVPFormationStudentRecord | PVPCounterDefenseSlot>;
};

const STUDENT_ID_ALPHABET = "abcdefghijklmnopqrstuvwxyz_";
const STUDENT_ID_CODE = new Map(
  [...STUDENT_ID_ALPHABET].map((character, index) => [character, index]),
);
const FLEXIBLE_FORMAT_MARKER = 0xf2;
const FLEXIBLE_STUDENT_SLOT = 0;
const FLEXIBLE_RANGE_SLOT = 1;
const FLEXIBLE_TANK_SLOT = 2;

function appendBits(bits: number[], value: number, width: number) {
  for (let bit = width - 1; bit >= 0; bit -= 1) {
    bits.push((value >> bit) & 1);
  }
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/");
  const padding =
    padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));

  const binary = atob(padded + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function readBits(bits: number[], offset: { value: number }, width: number) {
  if (offset.value + width > bits.length) {
    throw new Error("Invalid defense payload");
  }

  let value = 0;

  for (let bit = 0; bit < width; bit += 1) {
    value = (value << 1) | bits[offset.value];
    offset.value += 1;
  }

  return value;
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

function encodeFlexibleDefenseTeam(
  defenseTeam: Array<PVPFormationStudentRecord | PVPCounterDefenseSlot>,
) {
  if (defenseTeam.length !== 6) {
    throw new Error("A defense team must contain six slots");
  }

  const bits: number[] = [];
  appendBits(bits, FLEXIBLE_FORMAT_MARKER, 8);

  for (const [index, slot] of defenseTeam.entries()) {
    if ("studentId" in slot && slot.studentId) {
      appendBits(bits, FLEXIBLE_STUDENT_SLOT, 2);

      if (slot.studentId.length > 255) {
        throw new Error("Student ID is too long to encode");
      }

      appendBits(bits, slot.studentId.length, 8);

      for (const character of slot.studentId) {
        const code = STUDENT_ID_CODE.get(character);
        if (code === undefined) {
          throw new Error("Student ID contains an unsupported character");
        }

        appendBits(bits, code, 5);
      }

      continue;
    }

    if ("range" in slot && slot.range !== undefined) {
      if (index >= 4) {
        throw new Error("Range criteria require a striker slot");
      }

      const rangeIndex = PVP_COUNTER_RANGES.indexOf(
        slot.range as PVPCounterRange,
      );

      if (rangeIndex < 0) {
        throw new Error("Invalid defense range");
      }

      appendBits(bits, FLEXIBLE_RANGE_SLOT, 2);
      appendBits(bits, rangeIndex, 3);

      continue;
    }

    if ("tank" in slot && slot.tank === true) {
      if (index >= 4) {
        throw new Error("Tank criteria require a striker slot");
      }

      appendBits(bits, FLEXIBLE_TANK_SLOT, 2);
      continue;
    }

    appendBits(bits, FLEXIBLE_STUDENT_SLOT, 2);
    appendBits(bits, 0, 8);
  }

  const bytes = new Uint8Array(Math.ceil(bits.length / 8));

  for (const [index, bit] of bits.entries()) {
    bytes[Math.floor(index / 8)] |= bit << (7 - (index % 8));
  }

  return `v2.${encodeBase64Url(bytes)}`;
}

function decodeFlexibleDefenseTeam(value: string): PVPCounterDefenseSlot[] {
  if (!value.startsWith("v2.") || !/^[A-Za-z0-9_-]+$/.test(value.slice(3))) {
    throw new Error("Invalid flexible defense encoding");
  }

  const bytes = decodeBase64Url(value.slice(3));

  if (bytes[0] === FLEXIBLE_FORMAT_MARKER) {
    return decodePackedFlexibleDefenseTeam(bytes);
  }

  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));

  if (!Array.isArray(parsed) || parsed.length !== 6) {
    throw new Error("Invalid defense payload");
  }

  return parsed.map((slot, index) => {
    if (!slot || typeof slot !== "object") {
      throw new Error("Invalid defense payload");
    }

    const value = slot as Record<string, unknown>;

    if ("studentId" in value) {
      if ("range" in value || "tank" in value) {
        throw new Error("Invalid defense payload");
      }

      if (value.studentId === null || typeof value.studentId === "string") {
        return {
          studentId: value.studentId === null ? undefined : value.studentId,
        };
      }

      throw new Error("Invalid defense payload");
    }

    if (
      typeof value.range === "number" &&
      PVP_COUNTER_RANGES.includes(value.range as PVPCounterRange)
    ) {
      if ("tank" in value) {
        throw new Error("Invalid defense payload");
      }

      if (index >= 4) {
        throw new Error("Range criteria require a striker slot");
      }

      return {
        range: value.range as PVPCounterRange,
      };
    }

    if (value.tank === true) {
      if ("range" in value) {
        throw new Error("Invalid defense payload");
      }

      if (index >= 4) {
        throw new Error("Tank criteria require a striker slot");
      }

      return {
        tank: true as const,
      };
    }

    throw new Error("Invalid defense payload");
  });
}

function decodePackedFlexibleDefenseTeam(
  bytes: Uint8Array,
): PVPCounterDefenseSlot[] {
  const bits = Array.from(bytes, (byte) =>
    Array.from({ length: 8 }, (_, index) => (byte >> (7 - index)) & 1),
  ).flat();

  const offset = { value: 8 };
  const defenseTeam: PVPCounterDefenseSlot[] = [];

  for (let index = 0; index < 6; index += 1) {
    const slotType = readBits(bits, offset, 2);

    if (slotType === FLEXIBLE_STUDENT_SLOT) {
      const length = readBits(bits, offset, 8);
      let studentId = "";

      for (let character = 0; character < length; character += 1) {
        const code = readBits(bits, offset, 5);
        const decodedCharacter = STUDENT_ID_ALPHABET[code];

        if (!decodedCharacter) {
          throw new Error("Invalid defense payload");
        }

        studentId += decodedCharacter;
      }

      defenseTeam.push({ studentId: studentId || undefined });
      continue;
    }

    if (slotType === FLEXIBLE_RANGE_SLOT) {
      if (index >= 4) {
        throw new Error("Range criteria require a striker slot");
      }

      const rangeIndex = readBits(bits, offset, 3);
      const range = PVP_COUNTER_RANGES[rangeIndex];

      if (range === undefined) {
        throw new Error("Invalid defense payload");
      }

      defenseTeam.push({ range });
      continue;
    }

    if (slotType === FLEXIBLE_TANK_SLOT) {
      if (index >= 4) {
        throw new Error("Tank criteria require a striker slot");
      }

      defenseTeam.push({ tank: true });
      continue;
    }

    throw new Error("Invalid defense payload");
  }

  if (bits.slice(offset.value).some(Boolean)) {
    throw new Error("Invalid defense payload");
  }

  return defenseTeam;
}

export function buildPvpCounterSearchHref(
  search: InitialCounterSearch,
): string {
  const params = new URLSearchParams({
    season: String(search.seasonNumber),
    defense: encodeFlexibleDefenseTeam(search.defenseTeam),
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
    const decoded = defenseValue.startsWith("v2.")
      ? decodeFlexibleDefenseTeam(defenseValue)
      : decodeDefenseTeam(defenseValue);
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
