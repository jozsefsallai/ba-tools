import type { NameOverrides, SeedStudentInput } from "../../trigger/lib/common";

export interface SyncLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export type {
  NameOverride,
  NameOverrides,
  StudentLocale,
} from "../../trigger/lib/common";

export type NewStudent = Omit<
  SeedStudentInput,
  "LinkedCharacterId" | "__nameOverrides"
> & {
  __nameOverrides: NameOverrides;
  baseVariantId: string | null;
};

export interface ExistingStudents {
  devNames: string[];
  characterIds: number[];
  maxDefaultOrder: number;
}

export interface ListNewStudentsOptions {
  sqlcipherKey?: string;
  existing: ExistingStudents;
  cacheDir: string;
  logger?: SyncLogger;
}

export interface ListNewStudentsResult {
  gameVersion: string;
  students: NewStudent[];
}

export interface ImageStudent {
  devName: string;
  characterId: number;
  pathName: string;
}

export interface ExtractImageAssetsOptions {
  sqlcipherKey?: string;
  students: ImageStudent[];
  outDir: string;
  cacheDir: string;
  logger?: SyncLogger;
  spineSprites?: boolean;
  memorialLobbies?: boolean;
  renderThreads?: number;
  reuseExisting?: boolean;
}

export interface StudentSpriteManifest {
  /** 2 added `face`. */
  version: 1 | 2;
  gameVersion: string;
  skeleton: string;
  width: number;
  height: number;
  sprites: string[];
  /**
   * The center of the face in sprite pixels (from the top left), found from
   * the slots the expressions change. Missing before version 2, and for
   * skeletons with a single expression.
   */
  face?: { x: number; y: number };
}

export interface MemorialLobbySkeleton {
  name: string;
  /**
   * `main` is the character, `background` the scenery behind it and `scene`
   * any other skeleton the lobby shows (intro cutaways such as `Aru_Scene`,
   * props such as `Shigure_00`).
   */
  role: "main" | "background" | "scene";
  skel: string;
  atlas: string;
  textures: string[];
  animations: string[];
  /**
   * Where the skeleton sits, in the main skeleton's coordinates (Spine units,
   * y up). Absent for the main skeleton and for lobbies without scene data.
   */
  transform?: MemorialLobbyTransform;
  /** Draw order among the lobby's skeletons and effects (lower is drawn first). */
  order?: number;
  /**
   * For skeletons whose atlas pages are drawn apart (the game gives each
   * page's material a render queue, putting effects between a lobby's
   * background and its character): each page's queue, and each queue's place
   * in the draw order. `order` is the first layer's.
   */
  pageQueues?: Record<string, number>;
  layers?: { queue: number; order: number }[];
  /** Whether the skeleton is shown before the timeline switches it. */
  active?: boolean;
}

export interface MemorialLobbyTransform {
  x: number;
  y: number;
  /** Degrees, counterclockwise. */
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface MemorialLobbyPoint {
  x: number;
  y: number;
}

/**
 * A clip of the game's lobby clip system (`spineClipPool`): an animation with
 * the track it plays on and what happens around it.
 */
export interface MemorialLobbyClip {
  animation: string;
  track: number;
  loop: boolean;
  /** Mix into the clip, in seconds; `null` for the skeleton's default mix. */
  introMix: number | null;
  /** Mix out of the clip, in seconds; `null` for the skeleton's default mix. */
  outroMix: number | null;
  /** Index of the clip played once this one ends (`Pat_01_M` → `Pat_02_M`). */
  next: number | null;
  /** Indices of clips started along with this one (`Idle_01` → `Cloud_00_R`). */
  sync: number[];
  /**
   * For clips of the random idle pool (blinks, `Idle_01_R`): the delay before
   * the first play and the range of delays between plays, in seconds, and how
   * many extra times a play may repeat (double blinks).
   */
  random?: {
    firstDelay: number;
    minDelay: number;
    maxDelay: number;
    minExtraLoops: number;
    maxExtraLoops: number;
  };
  /** Touches are ignored while the clip plays. */
  blocksTouch: boolean;
}

export interface MemorialLobbyController {
  /** The skeleton the clips play on. */
  skeleton: string;
  clips: MemorialLobbyClip[];
  /** Indices of the idle loop clips. */
  idle: number[];
  /** Indices of the clips played at random times over the idle. */
  randomIdle: number[];
}

/**
 * A spot that reacts to touches: a box (`HairPatIK`, `EyeIK`, `PinchIK`, …)
 * that, while pressed, drags a bone towards the pointer within limits and
 * plays a clip.
 */
export interface MemorialLobbyTouchArea {
  /** The game object's name, e.g. `HairPatIK` or `EyeIK`. */
  name: string;
  kind: "pat" | "look" | "pinch" | "poke" | "hand" | "body" | "other";
  /** The box's corners, in the main skeleton's coordinates (y up). */
  area: MemorialLobbyPoint[];
  /** The dragged bone, or `null` for areas that only play a clip. */
  bone: string | null;
  /**
   * The bone's resting position and the box it can be dragged within, in
   * its parent bone's coordinates (Spine units).
   */
  origin: MemorialLobbyPoint | null;
  min: MemorialLobbyPoint | null;
  max: MemorialLobbyPoint | null;
  /** How quickly the bone follows the pointer, and returns once released (0–1 per frame at 60 fps). */
  dragSpeed: number;
  releaseSpeed: number;
  /** Seconds the press has to last before the clip plays. */
  triggerDelay: number;
  /** Indices into the controller's clips. */
  clip: number | null;
  endClip: number | null;
}

/** An animation the intro timeline plays on a skeleton. */
export interface MemorialLobbyTimelineClip {
  skeleton: string;
  track: number;
  animation: string;
  start: number;
  duration: number;
  /** Where in the animation the clip starts, in seconds. */
  clipIn: number;
  loop: boolean;
  mixDuration: number;
  /** Keeps playing after the clip's end (the idle loop the intro hands over to). */
  holdAfterEnd: boolean;
}

export interface MemorialLobbyActivation {
  skeleton: string;
  /** Visibility changes, in time order. */
  keys: { time: number; active: boolean }[];
}

/**
 * Where a skeleton is over the intro, in the main skeleton's resting
 * coordinates (the main skeleton's own keys are relative to where it rests).
 * Each key holds until the next: intros swap skeletons in and out of view by
 * moving them off screen.
 */
export interface MemorialLobbyTimelineTransform {
  skeleton: string;
  keys: ({ time: number } & MemorialLobbyTransform)[];
}

/** The intro: a Unity timeline the game plays when the lobby opens. */
export interface MemorialLobbyTimeline {
  duration: number;
  /** When the lobby's buttons (and touches) come back, if the timeline says. */
  interactiveAt: number | null;
  clips: MemorialLobbyTimelineClip[];
  activations: MemorialLobbyActivation[];
  transforms: MemorialLobbyTimelineTransform[];
}

/**
 * A particle system setting that can vary (Unity's MinMaxCurve): a constant,
 * a random value between two constants, or a curve over a 0–1 time (the
 * particle's age, or the system's loop for emission) times `scale`,
 * optionally random between two curves. Curves are flat key lists:
 * `[time, value, inSlope, outSlope, …]`; a slope of ±1e9 is a step.
 */
export type MemorialLobbyCurve =
  | number
  | { min: number; max: number }
  | { scale: number; curve: number[]; minCurve?: number[] };

export type MemorialLobbyColor = [r: number, g: number, b: number, a: number];

/** Color keys `[time, r, g, b, …]` and alpha keys `[time, a, …]`. */
export interface MemorialLobbyGradient {
  colors: number[];
  alphas: number[];
  /** Keys hold until the next one instead of blending. */
  fixed?: true;
}

/** Unity's MinMaxGradient. */
export type MemorialLobbyColorValue =
  | { color: MemorialLobbyColor }
  | { colors: [MemorialLobbyColor, MemorialLobbyColor] }
  | { gradient: MemorialLobbyGradient }
  | { gradients: [MemorialLobbyGradient, MemorialLobbyGradient] }
  /** A random color picked from the gradient. */
  | { randomGradient: MemorialLobbyGradient };

export type MemorialLobbyVector = [x: number, y: number, z: number];

/**
 * A Unity particle system, with the modules lobbies use. Distances are in the
 * effect's own space, times in seconds and angles in radians unless noted.
 */
export interface MemorialLobbyParticleSystem {
  duration: number;
  looping: boolean;
  /** Starts as if it had already run for a loop. */
  prewarm: boolean;
  /** Starts whenever its game object is switched on. */
  playOnAwake: boolean;
  startDelay: MemorialLobbyCurve;
  simulationSpeed: number;
  maxParticles: number;
  /** Particles stay where they were emitted instead of following the effect. */
  worldSpace: boolean;
  /**
   * Ring buffer mode: particles outlive their lifetime until replaced (by
   * new ones past `maxParticles`), either paused at its end or looping
   * through part of it (`range`, 0–1 of the lifetime). Mika (Swimsuit)'s halo.
   */
  ringBuffer: { loop: boolean; range: [number, number] } | null;
  /**
   * Maps world vectors (velocities and forces flagged `world`, gravity) into
   * the effect's space: a 3x3 matrix, row by row. World units are the
   * prefab's screen units.
   */
  worldToLocal: number[];
  start: {
    lifetime: MemorialLobbyCurve;
    speed: MemorialLobbyCurve;
    size: MemorialLobbyCurve;
    /** Set when width and height are separate. */
    sizeY: MemorialLobbyCurve | null;
    rotation: MemorialLobbyCurve;
    /** Rotations around x and y as well, for 3D (mesh) particles. */
    rotation3D: [MemorialLobbyCurve, MemorialLobbyCurve] | null;
    /** Share of particles that rotate the other way. */
    flipRotation: number;
    color: MemorialLobbyColorValue;
    gravity: MemorialLobbyCurve;
  };
  emission: {
    /** Particles per second, over the loop. */
    rate: MemorialLobbyCurve;
    bursts: {
      time: number;
      count: MemorialLobbyCurve;
      /** 0 repeats the burst every `interval` for as long as the system runs. */
      cycles: number;
      interval: number;
      probability: number;
    }[];
  } | null;
  shape: {
    /**
     * Unity's ParticleSystemShapeType: 0 sphere, 2 hemisphere, 4 cone,
     * 5 box, 8 cone volume, 10 circle, 12 edge, 15 box shell, 16 box edge,
     * 17 donut, 18 rectangle, …
     */
    type: number;
    position: MemorialLobbyVector;
    /** Degrees. */
    rotation: MemorialLobbyVector;
    scale: MemorialLobbyVector;
    radius: number;
    /** 0 emits from the surface only, 1 from the whole volume. */
    radiusThickness: number;
    /** Cone angle, degrees. */
    angle: number;
    /** Degrees. */
    arc: number;
    length: number;
    boxThickness: MemorialLobbyVector;
    donutRadius: number;
    randomDirection: number;
    sphericalDirection: number;
    randomPosition: number;
    alignToDirection: boolean;
  } | null;
  velocity: {
    x: MemorialLobbyCurve;
    y: MemorialLobbyCurve;
    z: MemorialLobbyCurve;
    /** Radians per second around each axis. */
    orbital: [MemorialLobbyCurve, MemorialLobbyCurve, MemorialLobbyCurve];
    offset: [MemorialLobbyCurve, MemorialLobbyCurve, MemorialLobbyCurve];
    radial: MemorialLobbyCurve;
    speedModifier: MemorialLobbyCurve;
    world: boolean;
  } | null;
  limitVelocity: {
    speed: MemorialLobbyCurve;
    /** Share of the excess speed removed per second. */
    dampen: number;
    drag: MemorialLobbyCurve;
    world: boolean;
  } | null;
  force: {
    x: MemorialLobbyCurve;
    y: MemorialLobbyCurve;
    z: MemorialLobbyCurve;
    world: boolean;
  } | null;
  /** Multiplies the start color over the particle's life. */
  color: MemorialLobbyColorValue | null;
  /** Multiplies the start size over the particle's life. */
  size: { x: MemorialLobbyCurve; y: MemorialLobbyCurve | null } | null;
  /** Rotation speed over the particle's life. */
  rotation: MemorialLobbyCurve | null;
  textureSheet: {
    tilesX: number;
    tilesY: number;
    /** 0–1 over the sheet (or row), over the particle's life. */
    frame: MemorialLobbyCurve;
    startFrame: MemorialLobbyCurve;
    cycles: number;
    /** A single row: its index, or `random` for a random row per particle. */
    row: number | "random" | null;
  } | null;
  /** Values the material's shader reads (UV offsets, dissolve), per stream. */
  customData:
    | (
        | { vector: MemorialLobbyCurve[] }
        | { color: MemorialLobbyColorValue }
        | null
      )[]
    | null;
  renderer: {
    mode:
      | "billboard"
      | "stretched"
      | "horizontal"
      | "vertical"
      | "mesh"
      | "none";
    /** Billboards face the camera (`view`) or turn with the effect (`local`). */
    alignment: "view" | "world" | "local" | "facing" | "velocity";
    lengthScale: number;
    velocityScale: number;
    pivot: MemorialLobbyVector;
    flip: MemorialLobbyVector;
    /** Size limits as a share of the screen height. */
    minSize: number;
    maxSize: number;
    /** Indices into the lobby's meshes, for `mesh` mode. */
    meshes: number[];
    /** Index into the lobby's materials. */
    material: number | null;
  };
}

/**
 * Something drawn besides the skeletons: a particle system or a textured
 * mesh (Hanako's fountain), following a bone or a skeleton.
 */
export interface MemorialLobbyEffect {
  /** The game object's name. */
  name: string;
  /** The skeleton it follows, and the bone, if any. */
  skeleton: string;
  bone: string | null;
  /**
   * Maps the effect's space (3D) into the bone's (or the skeleton's) Spine
   * coordinates (y up), dropping depth: two rows of four,
   * `x' = m0·x + m1·y + m2·z + m3`, `y' = m4·x + m5·y + m6·z + m7`.
   */
  matrix: number[];
  /** Draw order among the lobby's skeletons and effects (lower is drawn first). */
  order: number;
  /** Whether it's shown before the timeline switches it. */
  active: boolean;
  particles?: MemorialLobbyParticleSystem;
  mesh?: { mesh: number; material: number | null };
}

/**
 * A material of an effect: its shader, which lobbies' effects shaders take
 * textures, colors and numbers from, as the game sets them.
 */
export interface MemorialLobbyMaterial {
  name: string;
  /** E.g. `DSFX/FX_SHADER_Additive_0`. */
  shader: string;
  /** Render queue; ties in sorting order are broken by it. */
  queue: number;
  textures: Record<
    string,
    {
      texture: string;
      scale: [number, number];
      offset: [number, number];
      /** The texture clamps at its edges instead of repeating. */
      clamp?: true;
      /** The texture holds data (noise, masks) rather than sRGB color. */
      linear?: true;
      /** The texture has no alpha channel: its brightness is its opacity. */
      opaque?: true;
    }
  >;
  colors: Record<string, MemorialLobbyColor>;
  floats: Record<string, number>;
}

export interface MemorialLobbyMesh {
  name: string;
  /** `[x, y, z, …]` */
  positions: number[];
  /** `[u, v, …]` */
  uvs: number[];
  /** `[r, g, b, a, …]`, 0–1. */
  colors: number[] | null;
  /** Triangles. */
  indices: number[];
}

/** What the lobby's Unity prefab adds to its skeletons. */
export interface MemorialLobbyScene {
  /** The game's 2732x2048 screen, in the main skeleton's coordinates (y up). */
  camera: { x: number; y: number; width: number; height: number };
  controller: MemorialLobbyController | null;
  touch: MemorialLobbyTouchArea[];
  timeline: MemorialLobbyTimeline | null;
  /**
   * The file holding the lobby's effects (`MemorialLobbyEffects`), kept apart
   * from the manifest for its size; absent for lobbies without effects.
   */
  effects?: string;
}

/** A lobby's effects and what they draw with. */
export interface MemorialLobbyEffects {
  version: 1;
  effects: MemorialLobbyEffect[];
  materials: MemorialLobbyMaterial[];
  meshes: MemorialLobbyMesh[];
  /**
   * When the intro timeline switches effects on and off, by index into
   * `effects`. A particle system switched on starts over.
   */
  switches: { effect: number; keys: { time: number; active: boolean }[] }[];
}

export interface MemorialLobby {
  id: number;
  prefab: string;
  skeletons: MemorialLobbySkeleton[];
  /** Absent when the lobby's prefab couldn't be read. */
  scene?: MemorialLobbyScene;
}

export interface MemorialLobbyManifest {
  /**
   * 4 adds spawned prefabs, Control clips, ring buffers and 3D rotations to
   * effects; 3 adds effects; 2 has scene data without them.
   */
  version: 2 | 3 | 4;
  gameVersion: string;
  lobbies: MemorialLobby[];
}

export interface ExtractedImage {
  key: string;
  path: string;
}

export interface ExtractImageAssetsResult {
  gameVersion: string;
  files: ExtractedImage[];
  missing: string[];
  warnings: string[];
}

export interface DataSyncModule {
  listNewStudents(
    options: ListNewStudentsOptions,
  ): Promise<ListNewStudentsResult>;

  extractImageAssets(
    options: ExtractImageAssetsOptions,
  ): Promise<ExtractImageAssetsResult>;
}
