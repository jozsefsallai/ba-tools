import { createHash } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { Transformer } from "@napi-rs/image";
import { db } from "@/lib/db";
import {
  ITEM_ICON_BYTES,
  ITEM_ICON_CATALOG_FORMAT,
  ITEM_ICON_HEIGHT,
  ITEM_ICON_WIDTH,
  type ItemIcon,
  type ItemIconCatalog,
} from "@/lib/inventory-scan/catalog-format";
import { buildGameItemIconUrl } from "@/lib/url";

const CONCURRENCY = 16;
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const MAX_MISSING_RATIO = 0.05;

// Size the icons are drawn at, a few textures are larger
const ICON_WIDTH = 304;
const ICON_HEIGHT = 240;
const BLOCK = ICON_WIDTH / ITEM_ICON_WIDTH;

const root = fileURLToPath(new URL("../", import.meta.url));
const target = `${root}.cache/pvp-ocr/v2/ocr/item-icons`;
const cache = `${root}.cache/item-icons-v${ITEM_ICON_CATALOG_FORMAT}`;

function describe(png: Buffer) {
  const { width, height } = new Transformer(png).metadataSync();
  const source = new Transformer(png).opacity(1).rawPixelsSync();

  // Fit the texture inside the icon's area
  const scale = Math.max(width / ICON_WIDTH, height / ICON_HEIGHT);
  const left = (ICON_WIDTH - width / scale) / 2;
  const top = (ICON_HEIGHT - height / scale) / 2;

  const output = new Uint8Array(ITEM_ICON_BYTES);

  for (let y = 0; y < ITEM_ICON_HEIGHT; y++) {
    for (let x = 0; x < ITEM_ICON_WIDTH; x++) {
      const sum = [
        0,
        0,
        0,
      ];
      let alpha = 0;

      for (let sy = 0; sy < BLOCK; sy++) {
        for (let sx = 0; sx < BLOCK; sx++) {
          const px = Math.floor((x * BLOCK + sx + 0.5 - left) * scale);
          const py = Math.floor((y * BLOCK + sy + 0.5 - top) * scale);

          if (px < 0 || py < 0 || px >= width || py >= height) {
            continue;
          }

          const i = (py * width + px) * 4;
          const a = source[i + 3];
          alpha += a;

          for (let channel = 0; channel < 3; channel++) {
            sum[channel] += source[i + channel] * a;
          }
        }
      }

      const o = (y * ITEM_ICON_WIDTH + x) * 4;

      for (let channel = 0; channel < 3; channel++) {
        output[o + channel] = alpha > 0 ? sum[channel] / alpha : 0;
      }

      output[o + 3] = alpha / (BLOCK * BLOCK);
    }
  }

  return output;
}

async function readCached(path: string) {
  try {
    const { mtimeMs } = await stat(path);
    const data = await readFile(path);

    return Date.now() - mtimeMs < MAX_AGE && data.length === ITEM_ICON_BYTES
      ? data
      : null;
  } catch {
    return null;
  }
}

async function loadIcon(iconName: string): Promise<Uint8Array | null> {
  const path = `${cache}/${iconName}.bin`;
  const cached = await readCached(path);

  if (cached) {
    return cached;
  }

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(buildGameItemIconUrl(iconName), {
        signal: AbortSignal.timeout(30_000),
      });

      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error(`Item icon ${iconName}: HTTP ${response.status}`);
      }

      const template = describe(Buffer.from(await response.arrayBuffer()));
      await writeFile(path, template);

      return template;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }
}

await Promise.all(
  [
    target,
    cache,
  ].map((path) =>
    mkdir(path, {
      recursive: true,
    }),
  ),
);

try {
  // Currencies aren't in the item and equipment lists
  const items = await db.gameItem.findMany({
    where: {
      parcelType: {
        in: [
          "Item",
          "Equipment",
        ],
      },
    },
    select: {
      parcelType: true,
      itemId: true,
      iconName: true,
      rarity: true,
      itemCategory: true,
    },
    orderBy: [
      {
        parcelType: "asc",
      },
      {
        itemId: "asc",
      },
    ],
  });

  const byIcon = new Map<
    string,
    ItemIcon & {
      iconName: string;
    }
  >();

  for (const item of items) {
    const iconName = item.iconName.toLowerCase();
    const key = `${item.parcelType}:${iconName}`;

    const icon = byIcon.get(key) ?? {
      iconName,
      parcelType: item.parcelType as ItemIcon["parcelType"],
      rarity: item.rarity,
      itemIds: [],
      consumableIds: [],
    };

    if (item.itemCategory === "Consumable") {
      icon.consumableIds.push(item.itemId);
    } else {
      icon.itemIds.push(item.itemId);
    }

    byIcon.set(key, icon);
  }

  const all = [
    ...byIcon.values(),
  ];
  const templates = new Array<Uint8Array | null>(all.length).fill(null);
  let next = 0;

  await Promise.all(
    Array.from(
      {
        length: CONCURRENCY,
      },
      async () => {
        for (;;) {
          const index = next++;

          if (index >= all.length) {
            return;
          }

          templates[index] = await loadIcon(all[index].iconName);
        }
      },
    ),
  );

  const missing = all.filter((_, i) => !templates[i]);

  if (missing.length > all.length * MAX_MISSING_RATIO) {
    throw new Error(
      `${missing.length} of ${all.length} item icons are missing`,
    );
  }

  if (missing.length > 0) {
    console.warn(
      `Item icons not on the CDN: ${missing.map((i) => i.iconName).join(", ")}`,
    );
  }

  const icons = all
    .filter((_, i) => templates[i])
    .map(
      ({ parcelType, rarity, itemIds, consumableIds }): ItemIcon => ({
        parcelType,
        rarity,
        itemIds,
        consumableIds,
      }),
    );

  const compressed = gzipSync(
    Buffer.concat(templates.filter((template) => template !== null)),
    {
      level: 9,
    },
  );

  const version = createHash("sha256")
    .update(JSON.stringify(icons))
    .update(compressed)
    .digest("hex")
    .slice(0, 16);

  const catalog: ItemIconCatalog = {
    format: ITEM_ICON_CATALOG_FORMAT,
    asset: `${version}.bin`,
    icons,
  };

  for (const [filename, body] of [
    [
      catalog.asset,
      compressed,
    ],
    [
      "manifest.json",
      `${JSON.stringify(catalog)}\n`,
    ],
  ] as const) {
    const temporary = `${target}/${filename}.${process.pid}.tmp`;
    await writeFile(temporary, body);
    await rename(temporary, `${target}/${filename}`);
  }

  console.log(
    `Prepared ${icons.length} item icon templates (${compressed.length} bytes, ${version})`,
  );
} finally {
  await db.$disconnect();
}
