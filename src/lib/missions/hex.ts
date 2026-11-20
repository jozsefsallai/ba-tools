import type { HexCoord } from "@/lib/game-data/contract";

export const HEX_DIRECTIONS: readonly HexCoord[] = [
  {
    x: 1,
    y: -1,
  },
  {
    x: 1,
    y: 0,
  },
  {
    x: 0,
    y: 1,
  },
  {
    x: -1,
    y: 1,
  },
  {
    x: -1,
    y: 0,
  },
  {
    x: 0,
    y: -1,
  },
];

export const hexKey = (c: HexCoord) => `${c.x},${c.y}`;

export function hexDistance(a: HexCoord, b: HexCoord) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return (Math.abs(dx) + Math.abs(dy) + Math.abs(dx + dy)) / 2;
}

export function hexToPixel(c: HexCoord) {
  return {
    px: (Math.sqrt(3) / 2) * (c.x - c.y),
    py: -1.5 * (c.x + c.y),
  };
}
