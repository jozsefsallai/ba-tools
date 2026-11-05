const SESSION_STORAGE_KEY = "jbat_timeline_highlight_color";

export const DEFAULT_HIGHLIGHT_COLOR = "#ef4444";

export function isHighlightColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
}

export function getSessionHighlightColor() {
  try {
    const color = sessionStorage.getItem(SESSION_STORAGE_KEY);
    return isHighlightColor(color) ? color : undefined;
  } catch {
    return undefined;
  }
}

export function rememberHighlightColor(color: string) {
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, color);
  } catch {
    // sleep
  }
}

export function getLastHighlightColor(
  items: ReadonlyArray<{
    type: string;
    highlightColor?: string;
  }>,
) {
  return items.findLast((item) => item.highlightColor)?.highlightColor;
}

const CARD_WIDTH_PX = 97;
const CARD_HEIGHT_PX = 90;
const GLOW_RENDER_SCALE = 4;
const GLOW_LAYERS = [
  {
    blur: 6,
    spread: 2,
  },
  {
    blur: 20,
    spread: 6,
  },
];
const MAX_CACHED_GLOWS = 32;

export const HIGHLIGHT_GLOW_PADDING_PX = 32;

const glowCache = new Map<string, string>();

export function getHighlightGlowUrl(color: string) {
  const cached = glowCache.get(color);
  if (cached) {
    return cached;
  }

  const canvas = document.createElement("canvas");
  canvas.width =
    (CARD_WIDTH_PX + HIGHLIGHT_GLOW_PADDING_PX * 2) * GLOW_RENDER_SCALE;
  canvas.height =
    (CARD_HEIGHT_PX + HIGHLIGHT_GLOW_PADDING_PX * 2) * GLOW_RENDER_SCALE;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return undefined;
  }

  ctx.shadowColor = color;
  ctx.shadowOffsetX = canvas.width;

  for (const { blur, spread } of GLOW_LAYERS) {
    ctx.shadowBlur = blur * GLOW_RENDER_SCALE;
    ctx.fillRect(
      (HIGHLIGHT_GLOW_PADDING_PX - spread) * GLOW_RENDER_SCALE - canvas.width,
      (HIGHLIGHT_GLOW_PADDING_PX - spread) * GLOW_RENDER_SCALE,
      (CARD_WIDTH_PX + spread * 2) * GLOW_RENDER_SCALE,
      (CARD_HEIGHT_PX + spread * 2) * GLOW_RENDER_SCALE,
    );
  }

  if (glowCache.size >= MAX_CACHED_GLOWS) {
    glowCache.clear();
  }

  const url = canvas.toDataURL();
  glowCache.set(color, url);

  return url;
}
