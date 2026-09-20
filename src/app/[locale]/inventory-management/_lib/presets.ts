export type InventoryManagementPresetItem = {
  name: string;

  width: number;
  height: number;
  count: number;
};

export type InventoryManagementPreset = {
  id: string;
  name: string;
  rounds: [
    InventoryManagementPresetItem,
    InventoryManagementPresetItem,
    InventoryManagementPresetItem,
  ][];
};

function withCounts(
  item: Omit<InventoryManagementPresetItem, "count">,
  count: number,
): InventoryManagementPresetItem {
  return {
    ...item,
    count,
  };
}

export const ITEMS = {
  // Aoi event
  shoppingBag: {
    name: "Shopping Bag",
    width: 3,
    height: 2,
  },

  receipt: {
    name: "Receipt",
    width: 3,
    height: 1,
  },

  luxuryFountainPen: {
    name: "Luxury Fountain Pen",
    width: 2,
    height: 1,
  },

  toyBox: {
    name: "Toy Box",
    width: 4,
    height: 2,
  },

  pollackRoeFlavoredSnack: {
    name: "Pollack Roe Flavored Snack",
    width: 2,
    height: 2,
  },

  gamingMagazine: {
    name: "Gaming Magazine",
    width: 3,
    height: 3,
  },

  umbrella: {
    name: "Umbrella",
    width: 4,
    height: 1,
  },

  // Kisaki event
  dragonsBeardCandy: {
    name: "Dragon's Beard Candy",
    width: 3,
    height: 2,
  },

  ludagun: {
    name: "Ludagun",
    width: 3,
    height: 1,
  },

  mooncake: {
    name: "Mooncake",
    width: 2,
    height: 1,
  },

  mahua: {
    name: "Mahua",
    width: 4,
    height: 2,
  },

  almondTofu: {
    name: "Almond Tofu",
    width: 2,
    height: 2,
  },

  banji: {
    name: "Banji",
    width: 3,
    height: 3,
  },

  tanghulu: {
    name: "Tanghulu",
    width: 4,
    height: 1,
  },

  // PJ Seminar event
  slippers: {
    name: "Slippers",
    width: 3,
    height: 2,
  },

  characterToothbrush: {
    name: "Character Toothbrush",
    width: 3,
    height: 1,
  },

  purpleScarf: {
    name: "Purple Scarf",
    width: 2,
    height: 1,
  },

  kivopoly: {
    name: 'Board Game "KIVOPOLY"',
    width: 4,
    height: 2,
  },

  dakimakura: {
    name: "Dakimakura",
    width: 4,
    height: 1,
  },

  characterCushion: {
    name: "Character Cushion",
    width: 3,
    height: 3,
  },

  hairband: {
    name: "Hairband",
    width: 2,
    height: 2,
  },

  // Swimsuit Hyakkaryouran Event
  watergun: {
    name: "Water Rifle",
    width: 3,
    height: 2,
  },

  waterproofPhoneCase: {
    name: "Waterproof Phone Case",
    width: 3,
    height: 1,
  },

  sunscreen: {
    name: "Sunscreen",
    width: 2,
    height: 1,
  },

  surfboard: {
    name: "Surfboard",
    width: 4,
    height: 2,
  },

  parasol: {
    name: "Parasol",
    width: 4,
    height: 1,
  },

  floaty: {
    name: "Swim Floaty",
    width: 3,
    height: 3,
  },

  bandana: {
    name: "Bandana",
    width: 2,
    height: 2,
  },

  // Odysseya Event
  seahorse: {
    name: "Seahorse",
    width: 3,
    height: 1,
  },

  seaweed: {
    name: "Seaweed",
    width: 4,
    height: 1,
  },

  seaUrchin: {
    name: "Sea Urchin",
    width: 3,
    height: 2,
  },

  seaSlug: {
    name: "Sea Slug",
    width: 2,
    height: 1,
  },

  starfish: {
    name: "Starfish",
    width: 2,
    height: 2,
  },

  seashell: {
    name: "Seashell",
    width: 4,
    height: 2,
  },

  turtleShell: {
    name: "Turtle Shell",
    width: 3,
    height: 3,
  },
} as const satisfies Record<
  string,
  Omit<InventoryManagementPresetItem, "count">
>;

export const inventoryManagementPresets: InventoryManagementPreset[] = [
  {
    id: "aoi7",
    name: "Balancing Schale's Books with the General Student Council (S7)",
    rounds: [
      [
        withCounts(ITEMS.shoppingBag, 1),
        withCounts(ITEMS.receipt, 3),
        withCounts(ITEMS.luxuryFountainPen, 5),
      ],

      [
        withCounts(ITEMS.toyBox, 1),
        withCounts(ITEMS.pollackRoeFlavoredSnack, 2),
        withCounts(ITEMS.receipt, 3),
      ],

      [
        withCounts(ITEMS.gamingMagazine, 1),
        withCounts(ITEMS.umbrella, 2),
        withCounts(ITEMS.luxuryFountainPen, 4),
      ],

      [
        withCounts(ITEMS.shoppingBag, 1),
        withCounts(ITEMS.receipt, 3),
        withCounts(ITEMS.luxuryFountainPen, 5),
      ],

      [
        withCounts(ITEMS.toyBox, 1),
        withCounts(ITEMS.pollackRoeFlavoredSnack, 2),
        withCounts(ITEMS.receipt, 3),
      ],

      [
        withCounts(ITEMS.gamingMagazine, 1),
        withCounts(ITEMS.umbrella, 2),
        withCounts(ITEMS.luxuryFountainPen, 4),
      ],

      [
        withCounts(ITEMS.pollackRoeFlavoredSnack, 2),
        withCounts(ITEMS.receipt, 3),
        withCounts(ITEMS.luxuryFountainPen, 6),
      ],
    ],
  },

  {
    id: "aoi8",
    name: "Balancing Schale's Books with the General Student Council (S8)",
    rounds: [
      [
        withCounts(ITEMS.pollackRoeFlavoredSnack, 2),
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
      ],

      [
        withCounts(ITEMS.receipt, 2),
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.gamingMagazine, 1),
      ],

      [
        withCounts(ITEMS.luxuryFountainPen, 5),
        withCounts(ITEMS.receipt, 3),
        withCounts(ITEMS.umbrella, 2),
      ],

      [
        withCounts(ITEMS.pollackRoeFlavoredSnack, 2),
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
      ],

      [
        withCounts(ITEMS.receipt, 2),
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.gamingMagazine, 1),
      ],

      [
        withCounts(ITEMS.luxuryFountainPen, 5),
        withCounts(ITEMS.receipt, 3),
        withCounts(ITEMS.umbrella, 2),
      ],

      [
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
        withCounts(ITEMS.gamingMagazine, 1),
      ],
    ],
  },

  {
    id: "kisaki",
    name: "The Senses Descend (Kisaki & Reijo Event)",
    rounds: [
      [
        withCounts(ITEMS.dragonsBeardCandy, 1),
        withCounts(ITEMS.ludagun, 5),
        withCounts(ITEMS.mooncake, 2),
      ],

      [
        withCounts(ITEMS.mahua, 1),
        withCounts(ITEMS.almondTofu, 2),
        withCounts(ITEMS.ludagun, 3),
      ],

      [
        withCounts(ITEMS.banji, 1),
        withCounts(ITEMS.tanghulu, 3),
        withCounts(ITEMS.mooncake, 2),
      ],

      [
        withCounts(ITEMS.dragonsBeardCandy, 1),
        withCounts(ITEMS.ludagun, 5),
        withCounts(ITEMS.mooncake, 2),
      ],

      [
        withCounts(ITEMS.mahua, 1),
        withCounts(ITEMS.almondTofu, 2),
        withCounts(ITEMS.ludagun, 3),
      ],

      [
        withCounts(ITEMS.banji, 1),
        withCounts(ITEMS.tanghulu, 3),
        withCounts(ITEMS.mooncake, 2),
      ],

      [
        withCounts(ITEMS.almondTofu, 2),
        withCounts(ITEMS.ludagun, 3),
        withCounts(ITEMS.mooncake, 6),
      ],
    ],
  },

  {
    id: "pajama",
    name: "Secret Midnight Party: The Chimes of Tag (PJ Seminar Event)",
    rounds: [
      [
        withCounts(ITEMS.slippers, 2),
        withCounts(ITEMS.characterToothbrush, 5),
        withCounts(ITEMS.purpleScarf, 2),
      ],

      [
        withCounts(ITEMS.kivopoly, 1),
        withCounts(ITEMS.dakimakura, 2),
        withCounts(ITEMS.characterToothbrush, 5),
      ],

      [
        withCounts(ITEMS.characterCushion, 1),
        withCounts(ITEMS.hairband, 4),
        withCounts(ITEMS.purpleScarf, 3),
      ],

      [
        withCounts(ITEMS.slippers, 2),
        withCounts(ITEMS.characterToothbrush, 5),
        withCounts(ITEMS.purpleScarf, 2),
      ],

      [
        withCounts(ITEMS.kivopoly, 1),
        withCounts(ITEMS.dakimakura, 2),
        withCounts(ITEMS.characterToothbrush, 5),
      ],

      [
        withCounts(ITEMS.characterCushion, 1),
        withCounts(ITEMS.hairband, 4),
        withCounts(ITEMS.purpleScarf, 3),
      ],

      [
        withCounts(ITEMS.kivopoly, 2),
        withCounts(ITEMS.characterToothbrush, 3),
        withCounts(ITEMS.purpleScarf, 6),
      ],
    ],
  },

  {
    id: "aoi12",
    name: "Balancing Schale's Books with the General Student Council (S12)",
    rounds: [
      [
        withCounts(ITEMS.pollackRoeFlavoredSnack, 3),
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
      ],

      [
        withCounts(ITEMS.receipt, 2),
        withCounts(ITEMS.shoppingBag, 3),
        withCounts(ITEMS.gamingMagazine, 1),
      ],

      [
        withCounts(ITEMS.luxuryFountainPen, 6),
        withCounts(ITEMS.receipt, 4),
        withCounts(ITEMS.umbrella, 2),
      ],

      [
        withCounts(ITEMS.pollackRoeFlavoredSnack, 3),
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
      ],

      [
        withCounts(ITEMS.receipt, 2),
        withCounts(ITEMS.shoppingBag, 3),
        withCounts(ITEMS.gamingMagazine, 1),
      ],

      [
        withCounts(ITEMS.luxuryFountainPen, 6),
        withCounts(ITEMS.receipt, 4),
        withCounts(ITEMS.umbrella, 2),
      ],

      [
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
        withCounts(ITEMS.gamingMagazine, 1),
      ],
    ],
  },

  {
    id: "shyakka",
    name: "Hyakkaryouran: Fair and Square Aquatic Showdown",
    rounds: [
      [
        withCounts(ITEMS.watergun, 2),
        withCounts(ITEMS.waterproofPhoneCase, 5),
        withCounts(ITEMS.sunscreen, 2),
      ],

      [
        withCounts(ITEMS.surfboard, 1),
        withCounts(ITEMS.parasol, 2),
        withCounts(ITEMS.waterproofPhoneCase, 5),
      ],

      [
        withCounts(ITEMS.floaty, 1),
        withCounts(ITEMS.bandana, 4),
        withCounts(ITEMS.sunscreen, 3),
      ],

      [
        withCounts(ITEMS.watergun, 2),
        withCounts(ITEMS.waterproofPhoneCase, 5),
        withCounts(ITEMS.sunscreen, 2),
      ],

      [
        withCounts(ITEMS.surfboard, 1),
        withCounts(ITEMS.parasol, 2),
        withCounts(ITEMS.waterproofPhoneCase, 5),
      ],

      [
        withCounts(ITEMS.floaty, 1),
        withCounts(ITEMS.bandana, 4),
        withCounts(ITEMS.sunscreen, 3),
      ],

      [
        withCounts(ITEMS.surfboard, 2),
        withCounts(ITEMS.waterproofPhoneCase, 3),
        withCounts(ITEMS.sunscreen, 6),
      ],
    ],
  },

  {
    id: "aoi15",
    name: "Balancing Schale's Books with the General Student Council (S15)",
    rounds: [
      [
        withCounts(ITEMS.pollackRoeFlavoredSnack, 3),
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
      ],

      [
        withCounts(ITEMS.luxuryFountainPen, 7),
        withCounts(ITEMS.receipt, 3),
        withCounts(ITEMS.umbrella, 2),
      ],

      [
        withCounts(ITEMS.pollackRoeFlavoredSnack, 3),
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
      ],

      [
        withCounts(ITEMS.luxuryFountainPen, 7),
        withCounts(ITEMS.receipt, 3),
        withCounts(ITEMS.umbrella, 2),
      ],

      [
        withCounts(ITEMS.shoppingBag, 2),
        withCounts(ITEMS.toyBox, 1),
        withCounts(ITEMS.gamingMagazine, 1),
      ],
    ],
  },

  {
    id: "odyssey",
    name: "Dive into OCEAN! (Odyssey Event)",
    rounds: [
      [
        withCounts(ITEMS.seahorse, 4),
        withCounts(ITEMS.seaweed, 3),
        withCounts(ITEMS.seaUrchin, 1),
      ],

      [
        withCounts(ITEMS.seaSlug, 3),
        withCounts(ITEMS.starfish, 4),
        withCounts(ITEMS.seashell, 1),
      ],

      [
        withCounts(ITEMS.seahorse, 3),
        withCounts(ITEMS.starfish, 3),
        withCounts(ITEMS.turtleShell, 1),
      ],

      [
        withCounts(ITEMS.seahorse, 2),
        withCounts(ITEMS.starfish, 3),
        withCounts(ITEMS.seaUrchin, 2),
      ],

      [
        withCounts(ITEMS.seahorse, 4),
        withCounts(ITEMS.seaweed, 3),
        withCounts(ITEMS.seaUrchin, 1),
      ],

      [
        withCounts(ITEMS.seaSlug, 3),
        withCounts(ITEMS.starfish, 4),
        withCounts(ITEMS.seashell, 1),
      ],

      [
        withCounts(ITEMS.seahorse, 3),
        withCounts(ITEMS.starfish, 3),
        withCounts(ITEMS.turtleShell, 1),
      ],

      [
        withCounts(ITEMS.seahorse, 2),
        withCounts(ITEMS.starfish, 3),
        withCounts(ITEMS.seaUrchin, 2),
      ],

      [
        withCounts(ITEMS.seahorse, 4),
        withCounts(ITEMS.seaweed, 3),
        withCounts(ITEMS.seaUrchin, 1),
      ],

      [
        withCounts(ITEMS.seaSlug, 3),
        withCounts(ITEMS.starfish, 4),
        withCounts(ITEMS.seashell, 1),
      ],

      [
        withCounts(ITEMS.seahorse, 3),
        withCounts(ITEMS.starfish, 3),
        withCounts(ITEMS.turtleShell, 1),
      ],

      [
        withCounts(ITEMS.seahorse, 2),
        withCounts(ITEMS.starfish, 3),
        withCounts(ITEMS.seaUrchin, 2),
      ],

      [
        withCounts(ITEMS.seahorse, 2),
        withCounts(ITEMS.seaweed, 2),
        withCounts(ITEMS.seashell, 2),
      ],
    ],
  },
];
