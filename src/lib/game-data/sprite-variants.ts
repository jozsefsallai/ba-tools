import type { SpriteVariantOverride } from "./contract";

export const SPRITE_VARIANT_OVERRIDES: Record<string, SpriteVariantOverride> = {
  // Shiroko Terror
  ch0199: {
    family: "shiroko_terror",
  },
  np0125: {
    family: "shiroko_terror",
  },
  np0231: {
    family: "shiroko_terror",
  },
  np0232: {
    family: "shiroko_terror",
  },

  // Hoshino Terror
  np0186: {
    spoiler: true,
  },

  // Rio (Small AMAS)
  np0122: {
    family: null,
  },

  // The barrel Saki and Miyako hide in
  np0018: {
    family: null,
  },

  // Peroro costume
  peroro: {
    family: null,
  },

  // Redundant masked sprites with no dedicated bundle
  atsuko_mask: {
    family: null,
  },
  ch0144_mask: {
    family: null,
  },
  ch0212_mask: {
    family: null,
  },
  saori_mask: {
    family: null,
  },
  wakamo_mask: {
    family: null,
  },
};
