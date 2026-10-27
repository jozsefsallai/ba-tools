import {
  AtlasAttachmentLoader,
  BlendMode,
  type Bone,
  MeshAttachment,
  MixBlend,
  MixDirection,
  Physics,
  RegionAttachment,
  SkeletonBinary,
  type SkeletonData,
  type Slot,
  Spine,
  SpineTexture,
  TextureAtlas,
  type TextureAtlasPage,
  TextureAtlasRegion,
  Vector2,
} from "@esotericsoftware/spine-pixi-v7";
import * as PIXI from "pixi.js-v7";

import type {
  MemorialLobbyPoint,
  MemorialLobbyScene,
  MemorialLobbyTouchArea,
} from "@/lib/game-data/contract";
import { MemorialLobbyEffectPlayer } from "@/lib/memorial-lobby/effects";
import type {
  MemorialLobbySkeletonUrls,
  ResolvedMemorialLobbyManifest,
} from "@/lib/student-spine";

export type ResolvedMemorialLobby =
  ResolvedMemorialLobbyManifest["lobbies"][number];

const MIX_DURATION = 0.2;

// Interactions offered as buttons. Everything else is either driven by the
// lobby itself (idle, intro, blinks) or by pressing on the lobby (look, pat,
// cheek, hand), and some lobbies also ship unused `Dev/` animations.
const BUTTON_INTERACTION_RE = /^Talk_\d+_[AM]$/;

// Track 0 has the intro and idle loop. Right above it are the lobby's repeat
// loops (`Cloud_00_R`, `Snow_00_R`, `Idle_01_R`, ...), which the game plays
// alongside the idle: scenery, weather, extra sway. Interactions (Talk) and
// touch expressions (look/pat/cheek/hand) go above those.
const REPEAT_FIRST_TRACK = 1;
const INTERACTION_BODY_TRACK = 20;
const INTERACTION_MOUTH_TRACK = 21;
const TOUCH_MOUTH_TRACK = 22;
const TOUCH_BODY_TRACK = 23;

// Repeat loops end in `_R`, sometimes numbered (`light1_R1`, `Idle_R_01`).
const REPEAT_ANIMATION_RE = /_R(_?\d+)?$/;

// Touches normally use the touch areas from the lobby's scene data (exported
// from the game's Unity prefab). The zones below are the fallback for lobbies
// without them, guessed from the skeleton.
//
// The fallback headpat zone is a circle around the top of the head, derived
// from the head bones: `Touch_Point` sits along the head bone towards the
// crown, and its distance from the head pivot scales with how big the head is
// on screen.
const PAT_ZONE_CENTER = 1.7;
const PAT_ZONE_RADIUS = 1.7;

// Lobbies with a cheek pinch or poke get a zone over the lower face, in the
// same head-relative units: centered just below eye level (where the blush art
// sits in these lobbies), covering both cheeks and the mouth.
const CHEEK_ZONE_CENTER = -0.35;
const CHEEK_ZONE_RADIUS = 0.85;

// Lobbies with a hand-follow interaction get a zone around the hand, and
// dragging moves the hand towards the pointer, up to this far (both in
// head-relative units).
const HAND_ZONE_RADIUS = 1.3;
const HAND_MAX_OFFSET = 1;

// When the interaction is triggered by a finger (P.Koyuki points at the
// viewer), the zone sits on the finger art and is smaller.
const FINGER_ZONE_RADIUS = 0.8;

// How far a cheek can be stretched while pinching, in head-relative units.
// Movement alogn the cheek is damped by this factor.
const CHEEK_MAX_STRETCH = 0.35;
const CHEEK_SIDEWAYS_STRETCH = 0.5;

// How far the `Touch_Eye` target may move away from the head, and how far the
// cursor has to be for it to reach that limit, as fractions of the frame
// width. The eyes and head only follow the target by a fraction (via the
// skeleton's transform constraints), so this is larger than the visible
// motion.
const LOOK_MAX_OFFSET = 0.06;
const LOOK_SATURATION_DISTANCE = 0.35;

// How quickly the gaze catches up with the cursor (per second).
const LOOK_RESPONSIVENESS = 10;

// Memorial lobbies are optimized for a 4:3 view, so we frame the scene the
// same way regardless of the canvas aspect ratio.
const SCENE_ASPECT = 4 / 3;

// The in-game camera: a fixed 2732x2048 (4:3) window in skeleton space. Lobby
// art is painted around it with varying margins (backdrops are centered on it
// and cover it, intro cinematics included), which is why framing by the
// backdrop alone can zoom or pan wrongly.
const CAMERA = { x: -1366, y: -1986, width: 2732, height: 2048 };

// Intros and idle loops are mostly `Start_Idle_01` and `Idle_01`, but some
// lobbies spell them differently: `Start_Idle_1` (Karin), `Start_idle_01`
// (Armed Hoshino), `Idle` (Konoka).
const INTRO_ANIMATION_RE = /^start_idle_0?1$/i;
const IDLE_ANIMATION_RES = [/^idle_0?1$/i, /^idle$/i];

export type TouchMode = "look" | "pat" | "cheek" | "hand";

type ZoneMode = Exclude<TouchMode, "look">;

/** Colors of the debug touch zone overlay. */
const ZONE_COLORS: Record<ZoneMode, number> = {
  pat: 0xff0080,
  cheek: 0xff9900,
  hand: 0x00d0ff,
};

export type MemorialLobbyInteraction = {
  /** Animation name without the `_A` (body) / `_M` (mouth) suffix. */
  id: string;
  index: number;
};

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load ${url}`));
    image.src = url;
  });
}

async function fetchOk(url: string) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return res;
}

// We build skeletons by hand instead of going through PIXI.Assets, because
// pixi-spine (used by Plana) registers its own `.skel`/`.atlas` parsers on the
// same loader and they would clash with this runtime's.
async function loadSkeleton(skeleton: MemorialLobbySkeletonUrls) {
  const [atlasText, skelBuffer] = await Promise.all([
    fetchOk(skeleton.atlasUrl).then((res) => res.text()),
    fetchOk(skeleton.skelUrl).then((res) => res.arrayBuffer()),
  ]);

  const atlas = new TextureAtlas(atlasText);
  const images = new Map<TextureAtlasPage, HTMLImageElement>();

  await Promise.all(
    atlas.pages.map(async (page) => {
      const url = skeleton.textureUrls[page.name];
      if (!url) {
        throw new Error(`Missing texture ${page.name}`);
      }

      const image = await loadImage(url);
      images.set(page, image);

      const baseTexture = PIXI.BaseTexture.from(image, {
        alphaMode: alphaModeFor(page),
      });

      page.setTexture(SpineTexture.from(baseTexture));
    }),
  );

  const binary = new SkeletonBinary(new AtlasAttachmentLoader(atlas));
  const skeletonData = binary.readSkeletonData(new Uint8Array(skelBuffer));
  linearizeAdditiveAttachments(skeletonData, images);

  // The renderer updates every skeleton itself, on one clock, so the intro
  // timeline stays in sync across them.
  const spine = new Spine({ skeletonData, autoUpdate: false });
  spine.state.data.defaultMix = MIX_DURATION;

  return spine;
}

// zIndex steps between a skeleton's render queue layers (more than its slots).
const LAYER_Z = 100_000;

/**
 * Draws a skeleton's atlas pages apart by their render queues, as the game
 * does: every slot of a lower-queue page (the background) before any of a
 * higher one (the character), whatever the draw order says.
 */
function drawInLayers(
  spine: Spine,
  pageQueues: Record<string, number>,
  layers: { queue: number; order: number }[],
) {
  const layerOf = new Map(layers.map((l, i) => [l.queue, i]));

  // The runtime keeps a mesh per slot, ordered by zIndex after it redraws
  // them; both are private in its typings.
  const internals = spine as unknown as {
    renderMeshes(): void;
    meshesCache: Map<Slot, PIXI.DisplayObject>;
  };

  const renderMeshes = internals.renderMeshes.bind(spine);

  internals.renderMeshes = () => {
    renderMeshes();

    for (const [slot, mesh] of internals.meshesCache) {
      if (mesh.zIndex < 0) {
        continue;
      }

      const attachment = slot.getAttachment();

      const region =
        attachment instanceof RegionAttachment ||
        attachment instanceof MeshAttachment
          ? attachment.region
          : null;

      const page =
        region instanceof TextureAtlasRegion ? region.page.name : undefined;

      const queue = page === undefined ? undefined : pageQueues[page];

      mesh.zIndex +=
        (queue === undefined ? 0 : (layerOf.get(queue) ?? 0)) * LAYER_Z;
    }
  };
}

function alphaModeFor(page: TextureAtlasPage) {
  return page.pma ? PIXI.ALPHA_MODES.PMA : PIXI.ALPHA_MODES.UNPACK;
}

// sRGB -> linear lookup table for 8-bit channels.
const SRGB_TO_LINEAR = new Uint8ClampedArray(256).map((_, i) => {
  const c = i / 255;
  const linear = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return Math.round(linear * 255);
});

/**
 * Light overlays (additive slots) are meant to be blended in linear color
 * space, as the game does. Blended in sRGB, the way the browser does, even a
 * dim full-screen glow pushes an already bright scene to white (Seia's and
 * S.Fubuki's lobbies). Pointing additive attachments at a copy of their atlas
 * page with linearized colors makes each glow add roughly what it adds in-game,
 * while the rest of the art is untouched.
 */
function linearizeAdditiveAttachments(
  skeletonData: SkeletonData,
  images: Map<TextureAtlasPage, HTMLImageElement>,
) {
  const linearPages = new Map<TextureAtlasPage, SpineTexture>();

  const linearPage = (page: TextureAtlasPage) => {
    const cached = linearPages.get(page);
    if (cached) {
      return cached;
    }

    const image = images.get(page);
    if (!image) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
      return null;
    }

    context.drawImage(image, 0, 0);

    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
    const { data } = pixels;

    for (let i = 0; i < data.length; i += 4) {
      data[i] = SRGB_TO_LINEAR[data[i]];
      data[i + 1] = SRGB_TO_LINEAR[data[i + 1]];
      data[i + 2] = SRGB_TO_LINEAR[data[i + 2]];
    }

    context.putImageData(pixels, 0, 0);

    const texture = SpineTexture.from(
      PIXI.BaseTexture.from(canvas, { alphaMode: alphaModeFor(page) }),
    );

    linearPages.set(page, texture);
    return texture;
  };

  for (const skin of skeletonData.skins) {
    for (const { slotIndex, attachment } of skin.getAttachments()) {
      if (skeletonData.slots[slotIndex].blendMode !== BlendMode.Additive) {
        continue;
      }

      if (
        !(attachment instanceof RegionAttachment) &&
        !(attachment instanceof MeshAttachment)
      ) {
        continue;
      }

      const region = attachment.region;
      if (!(region instanceof TextureAtlasRegion)) {
        continue;
      }

      const texture = linearPage(region.page);
      if (!texture) {
        continue;
      }

      // Regions can be shared with normally blended attachments, so give
      // this attachment its own copy pointing at the linear page.
      const copy = Object.assign(
        Object.create(Object.getPrototypeOf(region)),
        region,
      ) as TextureAtlasRegion;

      copy.texture = texture;
      attachment.region = copy;
    }
  }
}

function hasAnimation(spine: Spine, name: string) {
  return !!spine.skeleton.data.findAnimation(name);
}

function introAnimation(data: SkeletonData) {
  return data.animations.find((a) => INTRO_ANIMATION_RE.test(a.name)) ?? null;
}

function idleAnimation(data: SkeletonData) {
  for (const re of IDLE_ANIMATION_RES) {
    const idle = data.animations.find((a) => re.test(a.name));
    if (idle) {
      return idle;
    }
  }

  return data.animations.find((a) => a.name.startsWith("Idle")) ?? null;
}

function firstAnimation(spine: Spine, names: string[]) {
  return names.find((name) => hasAnimation(spine, name)) ?? null;
}

// Touch animations come in up to three parts per track: an intro (`Pat_01`),
// an optional loop that starts where the intro ends (`Pat_02`), and an exit
// (`PatEnd_01`). The mouth/expression track sometimes has no suffix (M.Reisa's
// `Pinch_01`) and exits are sometimes spelled `Touch_End_01`. Some lobbies have
// alternate versions picked at random (`Pat2_01`), whose exit is `Pat2End_01`
// (Tsumugi) or `PatEnd2_01` (Anna).
function touchAnimationNames(
  prefix: string,
  suffix: "_M" | "_A",
  variant = "",
) {
  const bare = suffix === "_M";
  const name = `${prefix}${variant}`;

  const ends = [
    `${name}End_01`,
    `${name}_End_01`,
    ...(variant ? [`${prefix}End${variant}_01`] : []),
  ];

  return {
    intro: [`${name}_01${suffix}`, ...(bare ? [`${name}_01`] : [])],
    loop: [`${name}_02${suffix}`, ...(bare ? [`${name}_02`] : [])],
    end: [
      ...ends.map((end) => `${end}${suffix}`),
      ...(bare ? [`${name}End_01`] : []),
    ],
  };
}

/** The variants of a touch animation (`""` for `Pat_01`, `"2"` for `Pat2_01`). */
function touchVariants(spine: Spine, prefix: string) {
  const re = new RegExp(`^${prefix}(\\d*)_01(_[AM])?$`);
  const variants = new Set<string>();

  for (const { name } of spine.skeleton.data.animations) {
    const match = re.exec(name);

    if (match) {
      variants.add(match[1]);
    }
  }

  return [...variants];
}

/**
 * Moves a bone by an offset given in skeleton space, converted into its
 * parent's space using the parent's transform from the previous frame.
 * Returns the local offset applied, so it can be undone.
 */
function offsetBone(bone: Bone, offset: { x: number; y: number }) {
  const parent = bone.parent;
  if (!parent) {
    return { x: 0, y: 0 };
  }

  const from = parent.worldToLocal(new Vector2(bone.worldX, bone.worldY));
  const to = parent.worldToLocal(
    new Vector2(bone.worldX + offset.x, bone.worldY + offset.y),
  );

  const applied = { x: to.x - from.x, y: to.y - from.y };

  bone.x += applied.x;
  bone.y += applied.y;

  return applied;
}

// Bones that hold the backdrop and scenery (`BG`, `BG_Back`, `Background`,
// `Background_Layer`, `Back_Ground`, `back`, ...).
const BACKGROUND_BONE_RE = /^(bg|back_?ground|back$)/i;

// Cropped off each side of the backdrop to hide seams and transparent patches
// at its edges.
const FRAME_INSET = 0.05;

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

type MeasuredSlot = {
  slot: Slot;
  bounds: Bounds;
  /** World-space triangles (x, y per corner, three corners each). */
  triangles: number[];
};

function emptyBounds(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function isEmpty(bounds: Bounds) {
  return bounds.maxX <= bounds.minX || bounds.maxY <= bounds.minY;
}

function area(bounds: Bounds) {
  return (bounds.maxX - bounds.minX) * (bounds.maxY - bounds.minY);
}

function measureSlot(slot: Slot): MeasuredSlot | null {
  const attachment = slot.getAttachment();
  if (!attachment || slot.color.a === 0) {
    return null;
  }

  const vertices: number[] = [];
  let indices: ArrayLike<number> = [];

  if (attachment instanceof RegionAttachment) {
    attachment.computeWorldVertices(slot, vertices, 0, 2);
    indices = [0, 1, 2, 2, 3, 0];
  } else if (attachment instanceof MeshAttachment) {
    attachment.computeWorldVertices(
      slot,
      0,
      attachment.worldVerticesLength,
      vertices,
      0,
      2,
    );

    indices = attachment.triangles;
  } else {
    return null;
  }

  const bounds = emptyBounds();

  for (let i = 0; i < vertices.length; i += 2) {
    bounds.minX = Math.min(bounds.minX, vertices[i]);
    bounds.maxX = Math.max(bounds.maxX, vertices[i]);
    bounds.minY = Math.min(bounds.minY, vertices[i + 1]);
    bounds.maxY = Math.max(bounds.maxY, vertices[i + 1]);
  }

  if (isEmpty(bounds)) {
    return null;
  }

  const triangles: number[] = [];
  for (let i = 0; i < indices.length; i++) {
    triangles.push(vertices[indices[i] * 2], vertices[indices[i] * 2 + 1]);
  }

  return { slot, bounds, triangles };
}

/**
 * Poses the skeleton at the start of its idle loop and measures each visible
 * attachment, in draw order (back to front). Lobbies often open with a long
 * cinematic (`Start_Idle_01`) that pans a virtual camera around, so the setup
 * pose isn't representative of what's on screen.
 */
function measureIdlePose(spine: Spine): MeasuredSlot[] {
  const { skeleton } = spine;
  const idle = idleAnimation(skeleton.data);

  skeleton.setToSetupPose();
  idle?.apply(skeleton, 0, 0, false, [], 1, MixBlend.setup, MixDirection.mixIn);
  skeleton.updateWorldTransform(Physics.update);

  const result: MeasuredSlot[] = [];

  for (const slot of skeleton.drawOrder) {
    const measured = measureSlot(slot);

    if (measured) {
      result.push(measured);
    }
  }

  // Hand the pose back to the animation state.
  skeleton.setToSetupPose();
  return result;
}

function isUnderBackgroundBone(slot: Slot) {
  for (let bone: Bone | null = slot.bone; bone; bone = bone.parent) {
    if (BACKGROUND_BONE_RE.test(bone.data.name)) {
      return true;
    }
  }

  return false;
}

function union(boundsList: Bounds[]) {
  const result = emptyBounds();

  for (const b of boundsList) {
    result.minX = Math.min(result.minX, b.minX);
    result.minY = Math.min(result.minY, b.minY);
    result.maxX = Math.max(result.maxX, b.maxX);
    result.maxY = Math.max(result.maxY, b.maxY);
  }

  return result;
}

// The backdrop is the first layer drawn that's at least this large relative
// to the largest candidate; smaller early layers are props like windows.
const BACKDROP_MIN_AREA_RATIO = 0.4;

// Same-bone layers at least this wide (relative to the backdrop) are treated as
// parts of it, e.g. a sky, sea and sand split into separate images.
const BACKDROP_PART_MIN_WIDTH_RATIO = 0.9;

// Backdrops measure at least about 3100x1500 in every lobby checked, so
// anything much smaller is a prop picked by mistake.
const BACKDROP_MIN_WIDTH = 2400;
const BACKDROP_MIN_HEIGHT = 1400;

function findBackdropWith(
  measured: MeasuredSlot[],
  { anyBone }: { anyBone: boolean },
) {
  const candidates = measured.filter(
    ({ slot }) =>
      slot.data.blendMode === BlendMode.Normal &&
      (anyBone || isUnderBackgroundBone(slot)),
  );

  // Some lobbies tile copies of the backdrop side by side for scrolling; the
  // one on screen is the one spanning the skeleton's origin.
  const anchored = candidates.filter(
    ({ bounds }) => bounds.minX <= 0 && bounds.maxX >= 0,
  );

  const pool = anchored.length > 0 ? anchored : candidates;

  const largestArea = Math.max(0, ...pool.map(({ bounds }) => area(bounds)));

  const isLarge = (bounds: Bounds) =>
    area(bounds) >= largestArea * BACKDROP_MIN_AREA_RATIO;

  const backdrop = pool.find(({ bounds }) => isLarge(bounds));

  if (!backdrop) {
    return null;
  }

  // Parts of the backdrop share its bone. When the bone isn't a background
  // bone, it may hold other scenery too, so only large layers count.
  const width = backdrop.bounds.maxX - backdrop.bounds.minX;

  return pool.filter(
    ({ slot, bounds }) =>
      slot.bone === backdrop.slot.bone &&
      (anyBone
        ? isLarge(bounds)
        : bounds.maxX - bounds.minX >= width * BACKDROP_PART_MIN_WIDTH_RATIO),
  );
}

function isPlausibleBackdrop(parts: MeasuredSlot[] | null) {
  if (!parts) {
    return false;
  }

  const bounds = union(parts.map(({ bounds }) => bounds));

  return (
    bounds.maxX - bounds.minX >= BACKDROP_MIN_WIDTH &&
    bounds.maxY - bounds.minY >= BACKDROP_MIN_HEIGHT
  );
}

/**
 * Finds the backdrop: the back-most large image under a background bone.
 * Only normally blended attachments count; light overlays are often larger
 * than the screen but use additive or multiply blending. Some rigs keep the
 * backdrop on other bones (D.Mutsuki's `full`), so when that finds nothing
 * backdrop-sized, any bone is considered. Expects `measured` in draw order.
 */
function findBackdrop(measured: MeasuredSlot[]) {
  const onBackgroundBone = findBackdropWith(measured, { anyBone: false });
  if (isPlausibleBackdrop(onBackgroundBone)) {
    return onBackgroundBone;
  }

  const onAnyBone = findBackdropWith(measured, { anyBone: true });
  if (isPlausibleBackdrop(onAnyBone)) {
    return onAnyBone;
  }

  return onBackgroundBone ?? onAnyBone;
}

function isInTriangle(x: number, y: number, t: number[], i: number): boolean {
  const d1 =
    (x - t[i + 2]) * (t[i + 1] - t[i + 3]) - (t[i] - t[i + 2]) * (y - t[i + 3]);

  const d2 =
    (x - t[i + 4]) * (t[i + 3] - t[i + 5]) -
    (t[i + 2] - t[i + 4]) * (y - t[i + 5]);

  const d3 =
    (x - t[i]) * (t[i + 5] - t[i + 1]) - (t[i + 4] - t[i]) * (y - t[i + 1]);

  const negative = d1 < 0 || d2 < 0 || d3 < 0;
  const positive = d1 > 0 || d2 > 0 || d3 > 0;

  return !(negative && positive);
}

function isCovered(x: number, y: number, art: MeasuredSlot[]) {
  return art.some(({ bounds, triangles }) => {
    if (
      x < bounds.minX ||
      x > bounds.maxX ||
      y < bounds.minY ||
      y > bounds.maxY
    ) {
      return false;
    }

    for (let i = 0; i < triangles.length; i += 6) {
      if (isInTriangle(x, y, triangles, i)) {
        return true;
      }
    }

    return false;
  });
}

// Sample points per side when checking that a view is covered by backdrop.
const COVERAGE_SAMPLES = 9;

/**
 * Shrinks a centered view until a grid of points across it all land on some
 * art, so no empty canvas shows. Backdrop images aren't always rectangles
 * (D.Mutsuki and S.Hiyori are painted with a tilted composition on irregular
 * meshes), so their bounding box can include empty corners.
 */
function shrinkToCoverage(
  view: { x: number; y: number; width: number; height: number },
  art: MeasuredSlot[],
) {
  const cx = view.x + view.width / 2;
  const cy = view.y + view.height / 2;

  const covers = (scale: number) => {
    for (let i = 0; i < COVERAGE_SAMPLES; i++) {
      for (let j = 0; j < COVERAGE_SAMPLES; j++) {
        const x = cx + (i / (COVERAGE_SAMPLES - 1) - 0.5) * view.width * scale;
        const y = cy + (j / (COVERAGE_SAMPLES - 1) - 0.5) * view.height * scale;

        if (!isCovered(x, y, art)) {
          return false;
        }
      }
    }

    return true;
  };

  if (covers(1)) {
    return view;
  }

  // Binary search for the largest covered scale; give up below half size.
  let low = 0.5;
  let high = 1;

  if (!covers(low)) {
    return view;
  }

  for (let step = 0; step < 12; step++) {
    const mid = (low + high) / 2;

    if (covers(mid)) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return {
    x: cx - (view.width * low) / 2,
    y: cy - (view.height * low) / 2,
    width: view.width * low,
    height: view.height * low,
  };
}

/**
 * Picks the region to show for lobbies without scene data (those use the
 * prefab's camera): the game's usual fixed camera when the lobby's art covers
 * it (all lobbies checked do, intros included). Otherwise falls back to
 * framing the backdrop: background skeletons first, then the main one, then
 * everything in the main skeleton.
 */
function measureFrame(main: Spine, backgrounds: Spine[]) {
  const mainMeasured = measureIdlePose(main);
  const backgroundMeasured = backgrounds.flatMap(measureIdlePose);

  const art = [...backgroundMeasured, ...mainMeasured].filter(
    ({ slot }) => slot.data.blendMode === BlendMode.Normal,
  );

  if (shrinkToCoverage(CAMERA, art) === CAMERA) {
    return new PIXI.Rectangle(CAMERA.x, CAMERA.y, CAMERA.width, CAMERA.height);
  }

  const backdrop =
    findBackdrop(backgroundMeasured) ?? findBackdrop(mainMeasured);

  const bounds = union((backdrop ?? mainMeasured).map(({ bounds }) => bounds));

  if (isEmpty(bounds)) {
    return null;
  }

  // Crop the (inset) backdrop to a centered view with the scene's aspect
  // ratio, then make sure that view doesn't run past the painted art.
  const insetX = (bounds.maxX - bounds.minX) * FRAME_INSET;
  const insetY = (bounds.maxY - bounds.minY) * FRAME_INSET;
  const innerWidth = bounds.maxX - bounds.minX - insetX * 2;
  const innerHeight = bounds.maxY - bounds.minY - insetY * 2;
  const width = Math.min(innerWidth, innerHeight * SCENE_ASPECT);
  const height = width / SCENE_ASPECT;
  const view = {
    x: (bounds.minX + bounds.maxX) / 2 - width / 2,
    y: (bounds.minY + bounds.maxY) / 2 - height / 2,
    width,
    height,
  };

  const covered = backdrop ? shrinkToCoverage(view, art) : view;
  return new PIXI.Rectangle(
    covered.x,
    covered.y,
    covered.width,
    covered.height,
  );
}

/**
 * The finger art on the same side as the hand-follow bone (`R_hand_Pos2` →
 * `R_Finger_index_*`). P.Koyuki's interaction is triggered by touching the
 * the finger she points at the viewer, not her fist.
 */
function findFingerSlots(spine: Spine, hand: Bone) {
  const side = /^([lr])_/i.exec(hand.data.name)?.[1];
  if (!side) {
    return [];
  }

  const pattern = new RegExp(`^${side}_?finger_?index`, "i");
  return spine.skeleton.slots.filter((slot) => pattern.test(slot.data.name));
}

/** The average position of the given slots' current vertices. */
function centroid(slots: Slot[]) {
  let x = 0;
  let y = 0;

  let count = 0;

  for (const slot of slots) {
    const measured = measureSlot(slot);
    if (!measured) {
      continue;
    }

    const { triangles } = measured;

    for (let i = 0; i < triangles.length; i += 2) {
      x += triangles[i];
      y += triangles[i + 1];
      count++;
    }
  }

  return count > 0 ? { x: x / count, y: y / count } : null;
}

// Cheek bones that can be dragged when the pinch doesn't re-wire the rig:
// `cheek_01` (Hikari), `Chin_L_Root` (S.Hiyori), but not a central `Chin`.
const CHEEK_BONE_RE = /cheek|chin.*root|root.*chin/i;

/**
 * Finds the bones a cheek pinch can stretch. Some pinch animations re-wire the
 * rig so the head follows a cheek/chin bone, by switching on a transform
 * constraint from `Touch_Point` to it (S.Fubuki's `R_Chin_Root`, Kei's
 * `L_chin_rot`); dragging that bone stretches the cheek and the head follows.
 * Otherwise, the cheek bones the face mesh is weighted to are dragged directly
 * (whichever is nearest the press).
 */
function findCheekDragBones(spine: Spine, prefix: string): Bone[] {
  const { skeleton } = spine;

  const names = touchAnimationNames(prefix, "_M");
  const pinch = firstAnimation(spine, [...names.loop, ...names.intro]);
  const idle = idleAnimation(skeleton.data);

  if (!pinch) {
    return [];
  }

  const mixes = () => skeleton.transformConstraints.map((c) => c.mixX);

  skeleton.setToSetupPose();
  idle?.apply(skeleton, 0, 0, false, [], 1, MixBlend.setup, MixDirection.mixIn);

  const before = mixes();
  const animation = skeleton.data.findAnimation(pinch);

  animation?.apply(
    skeleton,
    0,
    animation.duration,
    false,
    [],
    1,
    MixBlend.replace,
    MixDirection.mixIn,
  );

  const after = mixes();
  skeleton.setToSetupPose();

  const switchedOn = (from: number, to: number) => from < 0.1 && to >= 0.5;

  const fromTouchPoint = skeleton.transformConstraints.find(
    (c, i) =>
      switchedOn(before[i], after[i]) &&
      c.bones.some((b) => /^touch_point$/i.test(b.data.name)),
  );

  if (fromTouchPoint) {
    return [fromTouchPoint.target];
  }

  const head = skeleton.bones.find((b) =>
    /^touch_eye$/i.test(b.data.name),
  )?.parent;

  const isUnderHead = (bone: Bone) => {
    for (let b: Bone | null = bone.parent; b; b = b.parent) {
      if (b === head) {
        return true;
      }
    }

    return false;
  };

  return skeleton.bones.filter(
    (b) => CHEEK_BONE_RE.test(b.data.name) && isUnderHead(b),
  );
}

/**
 * Finds the bone a hand-follow interaction drags: a dedicated `HandFollow`
 * bone when the rig has one (Armed Aris), otherwise the hand bone that the
 * most constraints follow, which drives the arm (P.Koyuki).
 */
function findHandFollowBone(spine: Spine) {
  const { skeleton } = spine;

  const dedicated = skeleton.bones.find((b) =>
    /^handfollow$/i.test(b.data.name),
  );

  if (dedicated) {
    return dedicated;
  }

  const followers = new Map<string, number>();

  for (const constraint of [
    ...skeleton.data.ikConstraints,
    ...skeleton.data.transformConstraints,
  ]) {
    const name = constraint.target.name;

    if (/hand/i.test(name)) {
      followers.set(name, (followers.get(name) ?? 0) + constraint.bones.length);
    }
  }

  let best: string | null = null;

  for (const [name, count] of followers) {
    if (!best || count > (followers.get(best) ?? 0)) {
      best = name;
    }
  }

  return best ? skeleton.findBone(best) : null;
}

/** What pressing a touch area does, for the viewer's cursor and the overlay. */
function touchAreaMode(area: MemorialLobbyTouchArea): TouchMode | null {
  switch (area.kind) {
    case "pat":
      return "pat";
    case "pinch":
    case "poke":
      return "cheek";
    case "hand":
      return "hand";
    case "look":
    case "other":
      return "look";
    default:
      return null;
  }
}

// Areas checked first win: small spots on the face and hands before the head,
// and the head before the look area (which covers the whole screen).
const TOUCH_AREA_PRIORITY: MemorialLobbyTouchArea["kind"][] = [
  "pinch",
  "poke",
  "hand",
  "pat",
  "other",
  "look",
];

/** Converts a point from the manifest (Spine coordinates, y up) to the scene's. */
const fromSpine = (p: MemorialLobbyPoint) => ({ x: p.x, y: -p.y });

function isInPolygon(
  x: number,
  y: number,
  polygon: { x: number; y: number }[],
) {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];

    if (
      a.y > y !== b.y > y &&
      x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x
    ) {
      inside = !inside;
    }
  }

  return inside;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, Math.min(min, max)), Math.max(min, max));

/** A bone dragged by a touch area, easing towards its target. */
type DraggedBone = {
  area: MemorialLobbyTouchArea;
  bone: Bone;
  position: { x: number; y: number };
  saved: { x: number; y: number } | null;
};

function maxRenderSize(gl: WebGLRenderingContext) {
  const viewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array;

  return Math.min(
    gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
    viewport[0],
    viewport[1],
  );
}

export class MemorialLobbyRenderer {
  private app: PIXI.Application;

  private scene = new PIXI.Container();
  private main?: Spine;
  private frame: PIXI.Rectangle | null = null;

  private lookBone: Bone | null = null;
  private lookOrigin: Bone | null = null;
  private touchPointBone: Bone | null = null;
  private lookTarget: { x: number; y: number } | null = null;
  private touchMode: TouchMode | null = null;
  private lookOffset = { x: 0, y: 0 };
  private lookApplied = { x: 0, y: 0 };
  private lastLookUpdate = 0;

  /** `Pinch` or `Touch` (poke), for lobbies with a cheek interaction. */
  private cheekPrefix: string | null = null;

  /** The bone a hand-follow interaction drags, for lobbies that have one. */
  private handBone: Bone | null = null;

  /** Finger art marking where the hand interaction is triggered, if any. */
  private handSpotSlots: Slot[] = [];

  /** The bone a cheek pinch stretches, for lobbies whose rig supports it. */
  private cheekDragBones: Bone[] = [];

  /** The variant of the touch animation being played (`"2"` for `Pat2_01`). */
  private touchVariant = "";

  // The bone being dragged by the current (or last) touch, where it was when
  // pressed, and how far to let it go.
  private dragBone: Bone | null = null;
  private dragRest: { x: number; y: number } | null = null;
  private dragLimit = 0;

  /** For cheek stretches: the unit vector pointing away from the face. */
  private dragOutward: { x: number; y: number } | null = null;
  private dragOffset = { x: 0, y: 0 };
  private dragApplied = { x: 0, y: 0 };

  // Lobbies exported with their Unity prefab come with scene data: the intro
  // timeline, the game's clip system and its touch areas.
  private spines: { spine: Spine; name: string; active: boolean }[] = [];
  private sceneData: MemorialLobbyScene | null = null;
  private effects: MemorialLobbyEffectPlayer | null = null;

  /** Seconds since the lobby started. */
  private time = 0;
  private timelineStarted = new Set<number>();
  private timelineEnded = new Set<number>();

  /** When the idle loop began; touches are accepted from then on. */
  private idleStartedAt: number | null = null;
  private sceneryLoopsStarted = false;

  /** Touches are ignored until then (clips that block interaction). */
  private blockedUntil = 0;

  /** When each random idle clip (blinks, `Idle_01_R`) plays next. */
  private randomIdleAt = new Map<number, number>();

  /** Tracks that touch and talk reactions play on. */
  private reactionTracks = new Set<number>([
    INTERACTION_BODY_TRACK,
    INTERACTION_MOUTH_TRACK,
    TOUCH_MOUTH_TRACK,
    TOUCH_BODY_TRACK,
  ]);

  private activeArea: MemorialLobbyTouchArea | null = null;
  private activeAreaSince = 0;
  private activeAreaTriggered = false;
  private draggedBones = new Map<Bone, DraggedBone>();

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.app = new PIXI.Application({
      view: canvas,
      width,
      height,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

    this.app.stage.addChild(this.scene);
  }

  async load(lobby: ResolvedMemorialLobby) {
    // Skeletons come in draw order when the lobby has scene data; otherwise
    // background skeletons go behind the character.
    const ordered = [...lobby.skeletons].sort(
      (a, b) =>
        (a.order ?? (a.role === "background" ? 0 : 1)) -
        (b.order ?? (b.role === "background" ? 0 : 1)),
    );

    const scene = lobby.scene;

    const [spines, effects] = await Promise.all([
      Promise.all(ordered.map(loadSkeleton)),
      scene && lobby.effectsUrl
        ? MemorialLobbyEffectPlayer.load(
            lobby.effectsUrl,
            lobby.fileBaseUrl,
            scene.camera.height,
          ).catch(() => null)
        : null,
    ]);

    this.scene.removeChildren().forEach((child) => child.destroy());
    this.effects?.destroy();
    this.effects = effects;
    this.sceneData = scene ?? null;
    this.collectReactionTracks();
    this.spines = [];

    const drawn: { order: number; display: PIXI.DisplayObject }[] = [];

    const timelineSkeletons = new Set(
      this.sceneData?.timeline?.clips.map((clip) => clip.skeleton),
    );

    spines.forEach((spine, idx) => {
      const skeleton = ordered[idx];
      if (skeleton.role === "main") {
        this.main = spine;
      }

      // Scene skeletons sit where the prefab puts them, relative to the main
      // one (Spine coordinates are y up, the scene's y down).
      const t = skeleton.transform;

      if (t) {
        spine.position.set(t.x, -t.y);
        spine.rotation = (-t.rotation * Math.PI) / 180;
        spine.scale.set(t.scaleX, t.scaleY);
      }

      spine.visible = skeleton.active ?? true;

      drawn.push({ order: skeleton.order ?? idx, display: spine });

      if (skeleton.layers && skeleton.pageQueues) {
        drawInLayers(spine, skeleton.pageQueues, skeleton.layers);
      }

      this.spines.push({
        spine,
        name: skeleton.name,
        active: skeleton.active ?? true,
      });
    });

    this.main ??= spines.at(-1);

    // Effects go between the skeletons, where the prefab's draw order puts
    // them, or inside a skeleton drawn in layers when they fall between them.
    for (const { index, order, display } of effects?.displays ?? []) {
      const host = ordered.findIndex(
        (s) =>
          s.layers &&
          s.layers.length > 1 &&
          s.layers[0].order < order &&
          order < (s.layers.at(-1)?.order ?? 0),
      );

      const layers = ordered[host]?.layers;

      if (layers) {
        const layer = layers.filter((l) => l.order < order).length;
        display.zIndex = layer * LAYER_Z - LAYER_Z / 2 + order;
        spines[host].addChild(display);
        effects?.setParent(index, spines[host]);
      } else {
        drawn.push({ order, display });
      }
    }

    for (const { display } of drawn.sort((a, b) => a.order - b.order)) {
      this.scene.addChild(display);
    }

    effects?.start();

    // Scenery loops run under the intro, as in the game.
    if (this.sceneData?.timeline) {
      this.startSceneryLoops();
    }

    // Skeletons the intro timeline doesn't drive start on their own.
    for (const { spine, name } of this.spines) {
      if (!timelineSkeletons.has(name)) {
        this.start(spine);
      }
    }

    if (this.main) {
      this.setupLook(this.main);
    }

    const camera = this.sceneData?.camera;
    if (camera) {
      this.frame = new PIXI.Rectangle(
        camera.x,
        -(camera.y + camera.height),
        camera.width,
        camera.height,
      );
    } else if (this.main) {
      this.frame = measureFrame(
        this.main,
        spines.filter((_, idx) => ordered[idx].role === "background"),
      );
    }

    this.fit();

    this.app.ticker.add(this.tick);
  }

  private readonly tick = () => {
    // Real time (pixi caps `deltaMS` at 100 ms, which slows everything down
    // on slow frames), but not a jump after the tab was in the background.
    const dt = Math.min(this.app.ticker.elapsedMS / 1000, 0.25);

    this.time += dt;

    this.updateTimeline();
    this.updateRandomIdle();
    this.updateTouchTrigger();

    for (const { spine } of this.spines) {
      spine.update(dt);
    }

    // After the skeletons, so effects follow their bones' current pose.
    this.effects?.update(dt, (name) => {
      const spine = this.spineNamed(name);
      return spine ? { spine, display: spine } : null;
    });
  };

  private spineNamed(name: string) {
    return this.spines.find((s) => s.name === name)?.spine ?? null;
  }

  /**
   * Plays the intro timeline: starts and ends each clip on its skeleton and
   * shows or hides skeletons as it goes. The idle clip it ends on keeps
   * playing afterwards.
   */
  private updateTimeline() {
    const timeline = this.sceneData?.timeline;
    if (!timeline) {
      return;
    }

    // Starts first: a clip that ends as the next begins hands its track
    // straight over instead of mixing out to the setup pose.
    timeline.clips.forEach((clip, idx) => {
      if (this.timelineStarted.has(idx) || this.time < clip.start) {
        return;
      }

      this.timelineStarted.add(idx);

      const spine = this.spineNamed(clip.skeleton);
      const animation = spine?.skeleton.data.findAnimation(clip.animation);

      if (!spine || !animation) {
        return;
      }

      const entry = spine.state.setAnimationWith(
        clip.track,
        animation,
        clip.loop,
      );

      entry.mixDuration = clip.mixDuration;
      entry.trackTime = clip.clipIn;

      if (clip.holdAfterEnd && spine === this.main) {
        this.startIdle();
      }
    });

    timeline.clips.forEach((clip, idx) => {
      if (
        clip.holdAfterEnd ||
        this.timelineEnded.has(idx) ||
        !this.timelineStarted.has(idx) ||
        this.time < clip.start + clip.duration
      ) {
        return;
      }

      this.timelineEnded.add(idx);

      const spine = this.spineNamed(clip.skeleton);

      if (
        spine?.state.getCurrent(clip.track)?.animation?.name === clip.animation
      ) {
        spine.state.setEmptyAnimation(clip.track, MIX_DURATION / 2);
      }
    });

    for (const { skeleton, keys } of timeline.activations) {
      const entry = this.spines.find((s) => s.name === skeleton);
      if (!entry) {
        continue;
      }

      let active = entry.active;

      for (const key of keys) {
        if (key.time <= this.time) {
          active = key.active;
        }
      }

      entry.spine.visible = active;
    }

    this.effects?.syncTimeline(this.time);

    for (const { skeleton, keys } of timeline.transforms ?? []) {
      const spine = this.spineNamed(skeleton);
      const key = keys.filter((k) => k.time <= this.time).at(-1);

      if (spine && key) {
        spine.position.set(key.x, -key.y);
        spine.rotation = (-key.rotation * Math.PI) / 180;
        spine.scale.set(key.scaleX, key.scaleY);
      }
    }

    // Lobbies whose timeline doesn't end on an idle clip still get one.
    if (this.idleStartedAt === null && this.time >= timeline.duration) {
      const main = this.main;
      const idle = main && idleAnimation(main.skeleton.data);

      if (main && idle && !main.state.getCurrent(0)?.loop) {
        main.state.setAnimationWith(0, idle, true);
      }

      this.startIdle();
    }
  }

  /**
   * The idle loop began: start the clips the game plays along with it
   * (scenery loops like `Cloud_00_R`) and schedule the random ones (blinks,
   * `Idle_01_R`). Without scene data, every `_R` loop plays along instead.
   */
  private startIdle() {
    if (this.idleStartedAt !== null) {
      return;
    }

    this.idleStartedAt = this.time;

    const controller = this.sceneData?.controller;
    const main = this.main;

    if (!main) {
      return;
    }

    if (!controller) {
      main.skeleton.data.animations
        .filter((a) => REPEAT_ANIMATION_RE.test(a.name))
        .forEach((animation, idx) => {
          main.state.setAnimationWith(
            REPEAT_FIRST_TRACK + idx,
            animation,
            true,
          );
        });

      return;
    }

    this.startSceneryLoops();

    for (const idx of controller.randomIdle) {
      const random = controller.clips[idx].random;

      // A first delay of 0 means none of its own: the usual random delay.
      const first =
        random && random.firstDelay > 0
          ? random.firstDelay
          : random
            ? random.minDelay +
              Math.random() * (random.maxDelay - random.minDelay)
            : 0;

      this.randomIdleAt.set(idx, this.time + first);
    }
  }

  /**
   * The loops the game plays along with the idle (scenery such as
   * `Snow_00_R`, `Smok_00_R`). The game's clip system starts them as soon as
   * the lobby opens, under the intro, which only drives track 0.
   */
  private startSceneryLoops() {
    const controller = this.sceneData?.controller;
    if (!controller || this.sceneryLoopsStarted) {
      return;
    }

    this.sceneryLoopsStarted = true;

    for (const idx of controller.idle) {
      for (const sync of controller.clips[idx].sync) {
        this.playClip(sync);
      }
    }
  }

  private updateRandomIdle() {
    const controller = this.sceneData?.controller;
    if (!controller) {
      return;
    }

    for (const [idx, at] of this.randomIdleAt) {
      if (this.time < at) {
        continue;
      }

      const clip = controller.clips[idx];

      // Clips that block touches (a yawn) don't start in the middle of an
      // interaction; they wait until it and its reaction are over.
      if (clip.blocksTouch && this.interacting) {
        this.randomIdleAt.set(idx, this.time + 1);
        continue;
      }

      const random = clip.random;

      const extra = random
        ? random.minExtraLoops +
          Math.floor(
            Math.random() * (random.maxExtraLoops - random.minExtraLoops + 1),
          )
        : 0;

      const duration = this.playClip(idx, extra, true);

      if (clip.blocksTouch) {
        this.blockedUntil = Math.max(this.blockedUntil, this.time + duration);
      }

      const delay = random
        ? random.minDelay + Math.random() * (random.maxDelay - random.minDelay)
        : 10;

      this.randomIdleAt.set(idx, this.time + duration + delay);
    }
  }

  /**
   * Plays a clip of the game's clip system on the main skeleton, followed by
   * the clip it chains into (or an exit mix when it doesn't loop), along with
   * the clips it syncs. Returns how long the clip plays, in seconds.
   */
  private playClip(idx: number, extraLoops = 0, once = false): number {
    const controller = this.sceneData?.controller;
    const spine = this.main;
    const clip = controller?.clips[idx];

    const animation =
      clip && spine?.skeleton.data.findAnimation(clip.animation);

    if (!controller || !spine || !clip || !animation) {
      return 0;
    }

    // Random clips play once (plus their extra loops) even when flagged to
    // loop (S.Ibuki's yawn), then return to the idle.
    const loop = clip.loop && !once;
    const { state } = spine;

    // With nothing on the track, Spine would snap straight to the pose;
    // crossfade in from the setup pose instead.
    const playing = state.getCurrent(clip.track) !== null;
    if (!playing) {
      state.setEmptyAnimation(clip.track, 0);
    }

    let entry = playing
      ? state.setAnimationWith(clip.track, animation, loop)
      : state.addAnimationWith(clip.track, animation, loop, 0);

    entry.mixDuration = clip.introMix ?? MIX_DURATION;

    for (let i = 0; i < extraLoops; i++) {
      entry = state.addAnimationWith(clip.track, animation, false, 0);
    }

    const next = clip.next === null ? null : controller.clips[clip.next];

    const nextAnimation =
      next && spine.skeleton.data.findAnimation(next.animation);

    if (next && nextAnimation) {
      const nextEntry = state.addAnimationWith(
        next.track,
        nextAnimation,
        next.loop,
        0,
      );

      nextEntry.mixDuration = next.introMix ?? 0;
    } else if (!loop && clip.track !== 0) {
      state.addEmptyAnimation(clip.track, clip.outroMix ?? MIX_DURATION, 0);
    }

    for (const sync of clip.sync) {
      this.playClip(sync);
    }

    return animation.duration * (1 + extraLoops);
  }

  /**
   * Plays the intro (if any), then the idle loop, starting the repeat loops
   * along with the idle: they pick up where the intro leaves the scenery.
   * Background skeletons get the same treatment; some have an intro of their
   * own, timed with the main one (Akari).
   */
  private start(spine: Spine) {
    const { state } = spine;
    const { data } = spine.skeleton;

    const intro = introAnimation(data);

    const idle =
      idleAnimation(data) ??
      data.animations.find(
        (a) =>
          a !== intro &&
          a.name !== "Dummy" &&
          !REPEAT_ANIMATION_RE.test(a.name),
      ) ??
      null;

    const repeats = data.animations.filter((a) =>
      REPEAT_ANIMATION_RE.test(a.name),
    );

    // The main skeleton's idle extras come from the clip system when there is
    // one (see `startIdle`).
    const startRepeats =
      spine === this.main
        ? () => this.startIdle()
        : () => {
            repeats.forEach((animation, idx) => {
              state.setAnimationWith(REPEAT_FIRST_TRACK + idx, animation, true);
            });
          };

    if (intro) {
      state.setAnimationWith(0, intro, false);

      if (idle) {
        const entry = state.addAnimationWith(0, idle, true, 0);
        entry.listener = { start: startRepeats };
      }
    } else {
      if (idle) {
        state.setAnimationWith(0, idle, true);
      }

      startRepeats();
    }
  }

  get interactions(): MemorialLobbyInteraction[] {
    if (!this.main) {
      return [];
    }

    const ids = new Set<string>();

    for (const { name } of this.main.skeleton.data.animations) {
      if (BUTTON_INTERACTION_RE.test(name)) {
        ids.add(name.replace(/_[AM]$/, ""));
      }
    }

    return [...ids].sort().map((id) => ({
      id,
      index: Number.parseInt(id.split("_")[1], 10) || 1,
    }));
  }

  /**
   * Plays an interaction on top of the idle loop: the body (`_A`) and the
   * mouth (`_M`) on the interaction tracks, each followed by the matching
   * `End` animation when there is one (e.g. `Talk_01` → `TalkEnd_01`).
   */
  playInteraction(id: string) {
    const spine = this.main;
    if (!spine) {
      return;
    }

    const [prefix, index] = id.split("_");
    const endId = `${prefix}End_${index}`;

    for (const [track, suffix] of [
      [INTERACTION_BODY_TRACK, "_A"],
      [INTERACTION_MOUTH_TRACK, "_M"],
    ] as const) {
      const name = `${id}${suffix}`;
      const endName = `${endId}${suffix}`;

      if (!hasAnimation(spine, name)) {
        spine.state.setEmptyAnimation(track, MIX_DURATION);
        continue;
      }

      spine.state.setAnimation(track, name, false);

      if (hasAnimation(spine, endName)) {
        spine.state.addAnimation(track, endName, false, 0);
      }

      spine.state.addEmptyAnimation(track, MIX_DURATION, 0);
    }
  }

  /**
   * Whether the character reacts to touches right now. Not during the intro,
   * which moves a virtual camera around and makes it look jarring, nor while
   * a clip that blocks touches (a yawn) plays.
   */
  get canTouch() {
    return (
      (this.lookBone !== null || this.hasTouchAreas) &&
      this.idleStartedAt !== null &&
      this.time >= this.blockedUntil
    );
  }

  /**
   * Adds the tracks the touch areas' clips play on (following the clips
   * they chain into, sync and end with) to the reaction tracks.
   */
  private collectReactionTracks() {
    const controller = this.sceneData?.controller;
    if (!controller) {
      return;
    }

    const seen = new Set<number>();

    const visit = (idx: number | null) => {
      if (idx === null || seen.has(idx)) {
        return;
      }

      seen.add(idx);

      const clip = controller.clips[idx];
      if (!clip) {
        return;
      }

      this.reactionTracks.add(clip.track);
      visit(clip.next);

      for (const sync of clip.sync) {
        visit(sync);
      }
    };

    for (const area of this.sceneData?.touch ?? []) {
      visit(area.clip);
      visit(area.endClip);
    }

    // Tracks the idle, its scenery loops and the random clips play on are
    // always busy; they don't say anything about interactions.
    for (const idx of [...controller.idle, ...controller.randomIdle]) {
      const clip = controller.clips[idx];
      this.reactionTracks.delete(clip.track);

      for (const sync of clip.sync) {
        this.reactionTracks.delete(controller.clips[sync].track);
      }
    }
  }

  /**
   * Whether the player is interacting: a touch is held, or a touch or talk
   * reaction is still playing.
   */
  private get interacting() {
    if (this.touchMode !== null || this.activeArea !== null) {
      return true;
    }

    const state = this.main?.state;
    if (!state) {
      return false;
    }

    for (const track of this.reactionTracks) {
      const name = state.getCurrent(track)?.animation?.name;

      if (name && name !== "<empty>") {
        return true;
      }
    }

    return false;
  }

  /** Whether touches use the game's touch areas (scene data) instead of guesses. */
  private get hasTouchAreas() {
    return (this.sceneData?.touch.length ?? 0) > 0;
  }

  /**
   * Lobbies have a `Touch_Eye` bone (under the head) that the eyes, and
   * through `Touch_Point`, the head and hair, follow via transform
   * constraints. Moving it towards the cursor makes the character look there.
   */
  private setupLook(spine: Spine) {
    const bones = spine.skeleton.bones;

    this.lookBone = bones.find((b) => /^touch_eye$/i.test(b.data.name)) ?? null;
    this.touchPointBone =
      bones.find((b) => /^touch_point$/i.test(b.data.name)) ?? null;

    // The touch bones hang off the head. Looking it up by name isn't reliable:
    // some rigs spell it differently or have more than one `Head_Rot`.
    this.lookOrigin =
      this.lookBone?.parent ??
      bones.find((b) => b.data.name === "Head_Rot") ??
      null;

    this.cheekPrefix =
      ["Pinch", "Touch"].find((prefix) =>
        firstAnimation(spine, touchAnimationNames(prefix, "_M").intro),
      ) ?? null;

    this.handBone = hasAnimation(spine, "HandFollow_01_M")
      ? findHandFollowBone(spine)
      : null;

    this.handSpotSlots =
      this.handBone && !/^handfollow$/i.test(this.handBone.data.name)
        ? findFingerSlots(spine, this.handBone)
        : [];

    this.cheekDragBones =
      this.cheekPrefix === "Pinch"
        ? findCheekDragBones(spine, this.cheekPrefix)
        : [];

    if (!this.lookBone && !this.hasTouchAreas) {
      return;
    }

    spine.beforeUpdateWorldTransforms = () => this.applyLook();
    spine.afterUpdateWorldTransforms = () => this.restoreLook();
  }

  private toSkeletonSpace(x: number, y: number) {
    return this.scene.toLocal(new PIXI.Point(x, y));
  }

  /**
   * A frame anchored on the head, from the current pose: the pivot, the unit
   * vector towards the crown (`Touch_Point`) and the distance to it, which
   * scales with how big the head is on screen.
   */
  private get headFrame() {
    const head = this.lookOrigin;
    const crown = this.touchPointBone;
    if (!head || !crown) {
      return null;
    }

    const dx = crown.worldX - head.worldX;
    const dy = crown.worldY - head.worldY;

    const size = Math.hypot(dx, dy);
    if (size === 0) {
      return null;
    }

    return {
      x: head.worldX,
      y: head.worldY,
      ux: dx / size,
      uy: dy / size,
      size,
    };
  }

  /**
   * Zones that react to presses, in priority order, in skeleton space. Only
   * used for lobbies without touch areas.
   */
  private get zones() {
    const head = this.headFrame;
    if (!head) {
      return [];
    }

    const along = (distance: number) => ({
      x: head.x + head.ux * distance * head.size,
      y: head.y + head.uy * distance * head.size,
    });

    const zones: { mode: ZoneMode; x: number; y: number; radius: number }[] =
      [];

    if (this.handBone) {
      const finger = centroid(this.handSpotSlots);

      zones.push({
        mode: "hand",
        x: finger?.x ?? this.handBone.worldX,
        y: finger?.y ?? this.handBone.worldY,
        radius: (finger ? FINGER_ZONE_RADIUS : HAND_ZONE_RADIUS) * head.size,
      });
    }

    if (this.cheekPrefix) {
      zones.push({
        mode: "cheek",
        ...along(CHEEK_ZONE_CENTER),
        radius: CHEEK_ZONE_RADIUS * head.size,
      });
    }

    zones.push({
      mode: "pat",
      ...along(PAT_ZONE_CENTER),
      radius: PAT_ZONE_RADIUS * head.size,
    });

    return zones;
  }

  /** The touch area under a point in canvas (CSS pixel) coordinates. */
  private touchAreaAt(x: number, y: number) {
    const point = this.toSkeletonSpace(x, y);
    const areas = this.sceneData?.touch ?? [];

    for (const kind of TOUCH_AREA_PRIORITY) {
      for (const area of areas) {
        if (
          area.kind === kind &&
          isInPolygon(point.x, point.y, area.area.map(fromSpine))
        ) {
          return area;
        }
      }
    }

    return null;
  }

  private zoneAt(x: number, y: number): TouchMode | null {
    if (this.hasTouchAreas) {
      const area = this.touchAreaAt(x, y);
      const mode = area && touchAreaMode(area);
      return mode === "look" ? null : mode;
    }

    const point = this.toSkeletonSpace(x, y);

    const zone = this.zones.find(
      (z) => Math.hypot(point.x - z.x, point.y - z.y) <= z.radius,
    );

    return zone?.mode ?? null;
  }

  /**
   * Whether a point in canvas (CSS pixel) coordinates is on a spot that
   * reacts specially (head, cheeks, hand), as opposed to just looking.
   */
  isOverSpot(x: number, y: number) {
    return this.zoneAt(x, y) !== null;
  }

  /**
   * Starts a touch at a point in canvas (CSS pixel) coordinates. With the
   * lobby's touch areas, the area pressed decides what happens (see
   * `startAreaTouch`). Otherwise, touching the head pats it, the cheeks pinch
   * or poke them and the hand (in lobbies that have those) makes it follow
   * the pointer; touching anywhere else makes the character look at the
   * pointer. The gaze follows the pointer while held.
   */
  startTouch(x: number, y: number): TouchMode | null {
    const spine = this.main;
    if (!spine || !this.canTouch) {
      return null;
    }

    if (this.hasTouchAreas) {
      return this.startAreaTouch(x, y, spine);
    }

    const mode: TouchMode = this.zoneAt(x, y) ?? "look";
    const prefix = this.touchPrefix(mode);

    const variants = touchVariants(spine, prefix);
    this.touchVariant =
      variants[Math.floor(Math.random() * variants.length)] ?? "";

    this.touchMode = mode;
    this.lookTarget = this.toSkeletonSpace(x, y);

    // Hand-follow drags the hand; pinching stretches the cheek nearest the
    // press.
    const point = this.lookTarget;

    const nearest = (bones: Bone[]) =>
      bones.reduce<Bone | null>(
        (best, b) =>
          !best ||
          Math.hypot(b.worldX - point.x, b.worldY - point.y) <
            Math.hypot(best.worldX - point.x, best.worldY - point.y)
            ? b
            : best,
        null,
      );

    const dragBone =
      mode === "hand"
        ? this.handBone
        : mode === "cheek"
          ? nearest(this.cheekDragBones)
          : null;

    if (dragBone) {
      // Let a previous drag's leftover offset settle on its own bone first.
      if (this.dragBone !== dragBone) {
        this.dragOffset = { x: 0, y: 0 };
      }

      this.dragBone = dragBone;
      this.dragRest = { x: dragBone.worldX, y: dragBone.worldY };
      this.dragLimit = mode === "hand" ? HAND_MAX_OFFSET : CHEEK_MAX_STRETCH;
      this.dragOutward = null;

      const head = this.lookOrigin;

      if (mode === "cheek" && head) {
        const ox = dragBone.worldX - head.worldX;
        const oy = dragBone.worldY - head.worldY;

        const length = Math.hypot(ox, oy);
        if (length > 0) {
          this.dragOutward = { x: ox / length, y: oy / length };
        }
      }
    } else {
      this.dragRest = null;
    }

    for (const [track, suffix] of [
      [TOUCH_MOUTH_TRACK, "_M"],
      [TOUCH_BODY_TRACK, "_A"],
    ] as const) {
      const names = touchAnimationNames(prefix, suffix, this.touchVariant);
      const intro = firstAnimation(spine, names.intro);
      const loop = firstAnimation(spine, names.loop);

      if (!intro) {
        spine.state.setEmptyAnimation(track, MIX_DURATION);
        continue;
      }

      // Most lobbies have a single pose (`Pat_01`), but some split it into a
      // transition from the idle pose (`Pat_01`) and a loop (`Pat_02`) that
      // starts where the transition ends. Either way `Pat_01` plays once:
      // looping a transition would keep snapping back to the idle pose, and a
      // non-looping entry holds its last frame.
      // With nothing on the track (the previous touch fully ended), Spine
      // would snap straight to the pose; crossfade in from the setup pose.
      if (spine.state.getCurrent(track)) {
        spine.state.setAnimation(track, intro, false);
      } else {
        spine.state.setEmptyAnimation(track, 0);
        spine.state.addAnimation(track, intro, false, 0).mixDuration =
          MIX_DURATION;
      }

      if (loop) {
        const entry = spine.state.addAnimation(track, loop, true, 0);
        entry.mixDuration = 0;
      }
    }

    return mode;
  }

  /**
   * Starts a touch on one of the game's touch areas: its bone follows the
   * pointer within the area's limits, and once the press has lasted the
   * area's trigger delay, its clip plays.
   */
  private startAreaTouch(x: number, y: number, spine: Spine) {
    const area = this.touchAreaAt(x, y);
    const mode = area && touchAreaMode(area);
    if (!area || !mode) {
      return null;
    }

    this.touchMode = mode;
    this.lookTarget = this.toSkeletonSpace(x, y);
    this.activeArea = area;
    this.activeAreaSince = this.time;
    this.activeAreaTriggered = false;

    const bone = area.bone ? spine.skeleton.findBone(area.bone) : null;

    if (bone && area.origin) {
      const dragged = this.draggedBones.get(bone);

      if (dragged) {
        dragged.area = area;
      } else {
        this.draggedBones.set(bone, {
          area,
          bone,
          position: { ...area.origin },
          saved: null,
        });
      }
    }

    this.updateTouchTrigger();
    return mode;
  }

  private updateTouchTrigger() {
    const area = this.activeArea;

    if (
      !area ||
      this.activeAreaTriggered ||
      this.time - this.activeAreaSince < area.triggerDelay
    ) {
      return;
    }

    this.activeAreaTriggered = true;

    if (area.clip !== null) {
      this.playClip(area.clip);
    }
  }

  private endAreaTouch() {
    const area = this.activeArea;
    const controller = this.sceneData?.controller;

    this.activeArea = null;

    if (!area || !this.activeAreaTriggered || !controller) {
      return;
    }

    if (area.endClip !== null) {
      this.playClip(area.endClip);
    } else if (area.clip !== null) {
      const clip = controller.clips[area.clip];

      for (const idx of [area.clip, ...clip.sync]) {
        this.main?.state.setEmptyAnimation(
          controller.clips[idx].track,
          clip.outroMix ?? MIX_DURATION,
        );
      }
    }
  }

  private touchPrefix(mode: TouchMode) {
    switch (mode) {
      case "pat":
        return "Pat";
      case "cheek":
        return this.cheekPrefix ?? "Pat";
      case "hand":
        return "HandFollow";
      default:
        return "Look";
    }
  }

  moveTouch(x: number, y: number) {
    if (this.lookTarget) {
      this.lookTarget = this.toSkeletonSpace(x, y);
    }
  }

  endTouch() {
    const spine = this.main;
    const mode = this.touchMode;
    if (!spine || !mode) {
      return;
    }

    this.touchMode = null;
    this.lookTarget = null;
    this.dragRest = null;

    if (this.hasTouchAreas) {
      this.endAreaTouch();
      return;
    }

    const prefix = this.touchPrefix(mode);

    for (const [track, suffix] of [
      [TOUCH_MOUTH_TRACK, "_M"],
      [TOUCH_BODY_TRACK, "_A"],
    ] as const) {
      const endName = firstAnimation(
        spine,
        touchAnimationNames(prefix, suffix, this.touchVariant).end,
      );

      if (endName) {
        spine.state.setAnimation(track, endName, false);
        spine.state.addEmptyAnimation(track, MIX_DURATION, 0);
      } else {
        spine.state.setEmptyAnimation(track, MIX_DURATION);
      }
    }
  }

  private applyLook() {
    const now = performance.now();

    const dt = this.lastLookUpdate
      ? Math.min((now - this.lastLookUpdate) / 1000, 0.1)
      : 0;

    this.lastLookUpdate = now;

    if (this.hasTouchAreas) {
      this.applyDraggedBones(dt);
      return;
    }

    const bone = this.lookBone;
    const origin = this.lookOrigin;
    const parent = bone?.parent;

    if (!bone || !origin || !parent) {
      return;
    }

    // Desired offset of the target from its resting place, in skeleton space.
    // Pinching holds the head where the rig puts it (it follows the stretched
    // cheek) instead of turning it towards the pointer like a pat.
    let desiredX = 0;
    let desiredY = 0;

    if (this.lookTarget && this.touchMode !== "cheek") {
      const frameWidth = this.frame?.width ?? 3000;

      const dx = this.lookTarget.x - origin.worldX;
      const dy = this.lookTarget.y - origin.worldY;

      const distance = Math.hypot(dx, dy);

      if (distance > 0) {
        const strength = Math.min(
          distance / (frameWidth * LOOK_SATURATION_DISTANCE),
          1,
        );
        const magnitude = frameWidth * LOOK_MAX_OFFSET * strength;

        desiredX = (dx / distance) * magnitude;
        desiredY = (dy / distance) * magnitude;
      }
    }

    // Dragging (hand-follow, cheek stretch): move the bone from where it was
    // when pressed towards the pointer, within reach.
    let desiredDragX = 0;
    let desiredDragY = 0;

    const head = this.headFrame;

    if (this.dragRest && this.lookTarget && head) {
      let dx = this.lookTarget.x - this.dragRest.x;
      let dy = this.lookTarget.y - this.dragRest.y;

      // A cheek can be pulled away from the face, not pushed into it.
      const outward = this.dragOutward;

      if (outward) {
        const along = dx * outward.x + dy * outward.y;
        const sideX = dx - along * outward.x;
        const sideY = dy - along * outward.y;
        const pull = Math.max(0, along);

        dx = outward.x * pull + sideX * CHEEK_SIDEWAYS_STRETCH;
        dy = outward.y * pull + sideY * CHEEK_SIDEWAYS_STRETCH;
      }

      const distance = Math.hypot(dx, dy);
      const reach = Math.min(distance, this.dragLimit * head.size);

      if (distance > 0) {
        desiredDragX = (dx / distance) * reach;
        desiredDragY = (dy / distance) * reach;
      }
    }

    const ease = 1 - Math.exp(-LOOK_RESPONSIVENESS * dt);

    this.lookOffset.x += (desiredX - this.lookOffset.x) * ease;
    this.lookOffset.y += (desiredY - this.lookOffset.y) * ease;
    this.dragOffset.x += (desiredDragX - this.dragOffset.x) * ease;
    this.dragOffset.y += (desiredDragY - this.dragOffset.y) * ease;

    this.lookApplied = offsetBone(bone, this.lookOffset);

    if (this.dragBone) {
      this.dragApplied = offsetBone(this.dragBone, this.dragOffset);
    }
  }

  /**
   * Moves the bones of touch areas like the game does: the pressed area's
   * bone eases towards the pointer (in its parent's coordinates, clamped to
   * the area's limits), and once released, back to its resting position, at
   * the area's follow speeds. A bone is left to its animations again once it
   * has settled.
   */
  private applyDraggedBones(dt: number) {
    const pointer = this.lookTarget;

    for (const dragged of this.draggedBones.values()) {
      const { area, bone, position } = dragged;

      const origin = area.origin;
      const parent = bone.parent;

      if (!origin || !parent) {
        continue;
      }

      const pressed = this.activeArea === area && pointer !== null;

      let target = origin;

      if (pressed && area.min && area.max) {
        const local = parent.worldToLocal(new Vector2(pointer.x, pointer.y));

        target = {
          x: clamp(local.x, area.min.x, area.max.x),
          y: clamp(local.y, area.min.y, area.max.y),
        };
      }

      // Follow speeds are fractions of the remaining distance per frame at
      // 60 fps.
      const speed = (pressed ? area.dragSpeed : area.releaseSpeed) || 0.2;
      const ease = 1 - (1 - Math.min(speed, 1)) ** (dt * 60);

      position.x += (target.x - position.x) * ease;
      position.y += (target.y - position.y) * ease;

      if (
        !pressed &&
        Math.hypot(position.x - origin.x, position.y - origin.y) < 0.05
      ) {
        this.draggedBones.delete(bone);
        continue;
      }

      dragged.saved = { x: bone.x, y: bone.y };
      bone.x = position.x;
      bone.y = position.y;
    }
  }

  // Undo the offset once world transforms are computed, so it doesn't pile up
  // on frames where no animation keys the bone.
  private restoreLook() {
    for (const dragged of this.draggedBones.values()) {
      if (dragged.saved) {
        dragged.bone.x = dragged.saved.x;
        dragged.bone.y = dragged.saved.y;
        dragged.saved = null;
      }
    }

    if (!this.lookBone) {
      return;
    }

    this.lookBone.x -= this.lookApplied.x;
    this.lookBone.y -= this.lookApplied.y;
    this.lookApplied = { x: 0, y: 0 };

    if (this.dragBone) {
      this.dragBone.x -= this.dragApplied.x;
      this.dragBone.y -= this.dragApplied.y;
    }
    this.dragApplied = { x: 0, y: 0 };
  }

  private zoneOverlay: PIXI.Graphics | null = null;

  private readonly drawZoneOverlay = () => {
    const overlay = this.zoneOverlay;
    if (!overlay) {
      return;
    }

    // Keep the outline a constant width on screen regardless of zoom.
    const lineWidth = 3 / (this.scene.scale.x || 1);
    overlay.clear();

    if (this.hasTouchAreas) {
      for (const area of this.sceneData?.touch ?? []) {
        const mode = touchAreaMode(area);
        if (!mode || mode === "look") {
          continue;
        }

        const color = ZONE_COLORS[mode];

        overlay.lineStyle(lineWidth, color, 1);
        overlay.beginFill(color, 0.15);
        overlay.drawPolygon(area.area.map(fromSpine));
        overlay.endFill();
      }

      return;
    }

    for (const zone of this.zones) {
      const color = ZONE_COLORS[zone.mode];

      overlay.lineStyle(lineWidth, color, 1);
      overlay.beginFill(color, 0.15);
      overlay.drawCircle(zone.x, zone.y, zone.radius);
      overlay.endFill();
    }
  };

  /** Debug aid: draws the touch zones on top of the lobby. */
  setShowZones(show: boolean) {
    if (show && !this.zoneOverlay) {
      this.zoneOverlay = new PIXI.Graphics();
      this.scene.addChild(this.zoneOverlay);
      this.app.ticker.add(this.drawZoneOverlay);
    } else if (!show && this.zoneOverlay) {
      this.app.ticker.remove(this.drawZoneOverlay);
      this.zoneOverlay.destroy();
      this.zoneOverlay = null;
    }
  }

  /**
   * Renders the current frame and encodes it as a PNG. With `native`, the
   * frame is rendered at the lobby's native resolution, as far as the GPU
   * allows, instead of the canvas's resoultion.
   */
  screenshot({ native = false }: { native?: boolean } = {}): Promise<Blob> {
    const renderer = this.app.renderer as PIXI.Renderer;
    const { width, height } = this.app.screen;
    const resolution = renderer.resolution;

    // Raising the resolution keeps the layout (in CSS pixels) the same, so the
    // scene doesn't need refitting, only the backing buffer grows.
    const nativeResolution = native
      ? Math.min(
          1 / (this.scene.scale.x || 1),
          maxRenderSize(renderer.gl) / Math.max(width, height),
        )
      : resolution;
    const upscaled = nativeResolution > resolution;

    if (upscaled) {
      renderer.resolution = nativeResolution;
      renderer.resize(width, height);
    }

    // The drawing buffer isn't preserved between frames, so the canvas has to
    // be copied in the same task it's rendered in (`toBlob` copies it
    // synchronously). That also means the upscaled frame is never painted.
    this.app.renderer.render(this.app.stage);

    const canvas = this.app.view as HTMLCanvasElement;
    const blob = new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to encode the lobby screenshot"));
        }
      }, "image/png");
    });

    if (upscaled) {
      renderer.resolution = resolution;
      renderer.resize(width, height);
      this.app.renderer.render(this.app.stage);
    }

    return blob;
  }

  resize(width: number, height: number) {
    this.app.renderer.resize(width, height);
    this.fit();
  }

  private fit() {
    const bounds = this.frame;
    if (!bounds) {
      return;
    }

    const { width, height } = this.app.screen;

    // Crop the frame to a centered window, then cover the canvas with it.
    const windowWidth = Math.min(bounds.width, bounds.height * SCENE_ASPECT);
    const windowHeight = windowWidth / SCENE_ASPECT;
    const scale = Math.max(width / windowWidth, height / windowHeight);

    this.scene.scale.set(scale);
    this.scene.position.set(
      width / 2 - (bounds.x + bounds.width / 2) * scale,
      height / 2 - (bounds.y + bounds.height / 2) * scale,
    );
  }

  destroy() {
    this.app.ticker.remove(this.tick);
    this.effects?.destroy();
    this.effects = null;
    this.app.destroy(false, {
      children: true,
      texture: true,
      baseTexture: true,
    });
  }
}
