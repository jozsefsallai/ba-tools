import type {
  EquipmentCategory,
  ItemCategory,
  ItemRarity,
  MissionDifficulty,
  ParcelType,
  Terrain,
} from "~prisma";
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

export interface ListFavorItemsOptions {
  sqlcipherKey?: string;
  cacheDir: string;
  logger?: SyncLogger;
}

export interface FavorItem {
  /** Item id, the same as SchaleDB's and the `Gift` table's. */
  id: number;
  /** `Tag` enum names, spelled like SchaleDB's (`BC`, `iM`). */
  tags: string[];
}

export interface ListFavorItemsResult {
  gameVersion: string;
  items: FavorItem[];
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
  face?: {
    x: number;
    y: number;
  };
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
  layers?: {
    queue: number;
    order: number;
  }[];
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
  keys: {
    time: number;
    active: boolean;
  }[];
}

/**
 * Where a skeleton is over the intro, in the main skeleton's resting
 * coordinates (the main skeleton's own keys are relative to where it rests).
 * Each key holds until the next: intros swap skeletons in and out of view by
 * moving them off screen.
 */
export interface MemorialLobbyTimelineTransform {
  skeleton: string;
  keys: ({
    time: number;
  } & MemorialLobbyTransform)[];
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
  | {
      min: number;
      max: number;
    }
  | {
      scale: number;
      curve: number[];
      minCurve?: number[];
    };

export type MemorialLobbyColor = [
  r: number,
  g: number,
  b: number,
  a: number,
];

/** Color keys `[time, r, g, b, …]` and alpha keys `[time, a, …]`. */
export interface MemorialLobbyGradient {
  colors: number[];
  alphas: number[];
  /** Keys hold until the next one instead of blending. */
  fixed?: true;
}

/** Unity's MinMaxGradient. */
export type MemorialLobbyColorValue =
  | {
      color: MemorialLobbyColor;
    }
  | {
      colors: [
        MemorialLobbyColor,
        MemorialLobbyColor,
      ];
    }
  | {
      gradient: MemorialLobbyGradient;
    }
  | {
      gradients: [
        MemorialLobbyGradient,
        MemorialLobbyGradient,
      ];
    }
  /** A random color picked from the gradient. */
  | {
      randomGradient: MemorialLobbyGradient;
    };

export type MemorialLobbyVector = [
  x: number,
  y: number,
  z: number,
];

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
  ringBuffer: {
    loop: boolean;
    range: [
      number,
      number,
    ];
  } | null;
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
    rotation3D:
      | [
          MemorialLobbyCurve,
          MemorialLobbyCurve,
        ]
      | null;
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
    orbital: [
      MemorialLobbyCurve,
      MemorialLobbyCurve,
      MemorialLobbyCurve,
    ];
    offset: [
      MemorialLobbyCurve,
      MemorialLobbyCurve,
      MemorialLobbyCurve,
    ];
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
  size: {
    x: MemorialLobbyCurve;
    y: MemorialLobbyCurve | null;
  } | null;
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
        | {
            vector: MemorialLobbyCurve[];
          }
        | {
            color: MemorialLobbyColorValue;
          }
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
  mesh?: {
    mesh: number;
    material: number | null;
  };
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
      scale: [
        number,
        number,
      ];
      offset: [
        number,
        number,
      ];
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
  camera: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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
  switches: {
    effect: number;
    keys: {
      time: number;
      active: boolean;
    }[];
  }[];
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

export type SkillLocale = "en" | "jp" | "kr" | "tw" | "th";

/** The skill slot the game shows a skill in (Prisma's `SkillType`). */
export type SkillSlotType = "EX" | "Basic" | "Enhanced" | "Sub";

/** `Special` is the game's `Dummy` (student-specific states), `Glossary` its `None`. */
export type SkillEffectCategory =
  | "Buff"
  | "Debuff"
  | "CrowdControl"
  | "Heal"
  | "Special"
  | "Glossary";

/**
 * `Default`: in the student's skill list. `Form`: only in a stance other than the
 * first. `SelectEx`: one of the EX skills a select card offers. `Additional`: shown
 * by another skill's tooltip (riding, summons).
 */
export type StudentSkillSource = "Default" | "Form" | "SelectEx" | "Additional";

/**
 * A skill's name and description in one locale. Templates use this markup:
 * `{p:N}` parameter N (`params[level - 1][N]`), `{e:EFFECT}…{/e}` an effect,
 * `{s:STAT}…{/s}` a stat, `{d:EFFECT:N}` an effect's suffix (its `suffix` with
 * parameter N); `{{` is a literal `{`.
 */
export interface SkillTextData {
  name: string;
  /** Distinct description templates; empty when the skill has no description. */
  templates: string[];
  /** Per internal level, the index into `templates`. */
  levelTemplates: number[];
  /** Per internal level, the parameter values as the game shows them ("29.1%", "30 sec"). */
  params: string[][];
  /** For `SelectEx` skills, when the card offers it ("When used on an enemy"). */
  useCondition: string | null;
}

export interface StudentSkillData {
  /** `${studentId}:${groupId}` */
  id: string;
  /** `Student.id` */
  studentId: string;
  groupId: string;
  type: SkillSlotType;
  source: StudentSkillSource;
  sortOrder: number;
  /** Stances the skill is available in. */
  formIndices: number[];
  /** 2: needs the Exclusive Weapon at 2★ (Enhanced+). */
  requiredWeaponGrade: number;
  /** 2: needs the bond gear at T2 (Basic+/Sub+). */
  requiredGearTier: number;
  /** The skill this one replaces once unlocked. */
  upgradeOfId: string | null;
  /** The select card (`SelectEx`) or the skill whose tooltip shows it (`Additional`). */
  parentId: string | null;
  iconName: string;
  /** Highest level in the game: 5 for EX skills, 10 for the others. */
  maxLevel: number;
  /** Levels in the data, which can be more than `maxLevel`. */
  levelCount: number;
  /** Cost per internal level. */
  costs: number[];
  stats: string[];
  effectIds: string[];
  texts: Partial<Record<SkillLocale, SkillTextData>>;
}

export interface SkillEffectTextData {
  name: string;
  description: string | null;
  /** E.g. `[0]秒間持続`, where `[0]` is the `{d:…}` parameter. */
  suffix: string | null;
  /** `false` for names that come from `effectNames` rather than the game. */
  isOfficial: boolean;
}

export interface SkillEffectData {
  /** The effect key (`Buff_StatChange_AttackPower`) when known, else `0x` + its hash. */
  id: string;
  /** xxHash32 of the effect key. */
  hash: number;
  category: SkillEffectCategory;
  /** E.g. `Buff_ATK` (the `Combat_Icon_` sprite). */
  iconName: string | null;
  filterable: boolean;
  texts: Partial<Record<SkillLocale, SkillEffectTextData>>;
}

export interface SkillStudent {
  /** `Student.id` */
  pathName: string;
  characterId: number;
  devName: string;
}

export interface ExtractStudentSkillsOptions {
  students: SkillStudent[];
  sqlcipherKey?: string;
  globalSqlcipherKey?: string;
  /** Nexon gateway region used to fetch the Global key (`na` by default). */
  globalRegion?: string;
  cacheDir: string;
  logger?: SyncLogger;
  /**
   * Effect names for locales the game has no glossary for yet, by icon name
   * (`Buff_ATK`). They are used to mark effects in those descriptions.
   */
  effectNames?: Partial<Record<SkillLocale, Record<string, string>>>;
}

export interface ExtractStudentSkillsResult {
  gameVersion: {
    jp: string;
    global: string | null;
  };
  effects: SkillEffectData[];
  skills: StudentSkillData[];
  missing: string[];
  warnings: string[];
}

/** One episode of a student's relationship (bond) story. */
export interface BondStoryEpisodeData {
  /** `${studentId}:${episode}` */
  id: string;
  /** `Student.id` */
  studentId: string;
  /** Position in the student's relationship story, from 1. */
  episode: number;
  /** The bond rank the episode unlocks at. */
  favorRank: number;
  /**
   * The episode's title. JP and KR come from JP, EN, TW and TH from Global, so
   * episodes Global doesn't have yet have no EN/TW/TH title.
   */
  titles: Partial<Record<SkillLocale, string>>;
  /** Whether Global's files have the episode. */
  isReleasedGlobal: boolean;
  /** Reading the episode unlocks the student's memorial lobby. */
  unlocksMemoryLobby: boolean;
  /** The episode is the bond gear's: it opens at the rank the gear unlocks at. */
  unlocksBondGear: boolean;
}

export interface ExtractBondStoriesOptions {
  students: SkillStudent[];
  sqlcipherKey?: string;
  globalSqlcipherKey?: string;
  /** Nexon gateway region used to fetch the Global key (`na` by default). */
  globalRegion?: string;
  cacheDir: string;
  logger?: SyncLogger;
}

export interface ExtractBondStoriesResult {
  gameVersion: {
    jp: string;
    global: string | null;
  };
  /** By student, in episode order. */
  episodes: BondStoryEpisodeData[];
  /** devNames of students without a relationship story. */
  missing: string[];
  warnings: string[];
}

export type StoryType = "main" | "group" | "mini" | "event" | "bond";

export type StoryLine =
  | {
      kind: "dialogue";
      /** `null` when the game's name table has no entry for the speaker. */
      speaker: string | null;
      /** E.g. `Tea Party`. */
      affiliation: string | null;
      text: string;
      /** The player choice this line answers, when the story branches. */
      selectionGroup?: number;
    }
  | {
      /** Unvoiced narration. */
      kind: "narration";
      text: string;
      selectionGroup?: number;
    }
  | {
      /** Text shown over the scene. */
      kind: "caption";
      text: string;
      selectionGroup?: number;
    }
  | {
      /** A line Sensei always says. */
      kind: "sensei";
      text: string;
    }
  | {
      /** A line the player can pick for Sensei. */
      kind: "choice";
      text: string;
      option: number;
    };

/** A stretch of story in one place, split on title cards, locations and backgrounds. */
export interface StoryScene {
  location: string | null;
  lines: StoryLine[];
}

export interface StoryEpisode {
  /** E.g. `main:3:4:12`, `main:100:2:ev821:3`, `event:801:4`, `bond:10000:2`. */
  id: string;
  type: StoryType;
  /** E.g. `main:3:4`, `event:801`, `bond:10000`. */
  chapterId: string;
  /** `1. Foreclosure Task Force`; only main stories have volumes. */
  volumeTitle: string | null;
  /** The chapter, event or `<student>'s Bond Story`. */
  chapterTitle: string | null;
  title: string | null;
  /** The game's digest of this episode. */
  summary: string | null;
  /**
   * Position in the chapter. Episodes of an event that branches out of a main
   * chapter sort between the main episodes around them: 20, 20.001, 20.002, 21.
   */
  order: number;
  /** The event a main episode was told through, for branch events. */
  branchEventTitle: string | null;
  /** `yyyy-MM-dd HH:mm:ss`; `null` when the story isn't tied to a release date. */
  openDate: string | null;
  /** Student, for bond stories. */
  characterId: number | null;
  scenes: StoryScene[];
}

export interface ExtractStoriesOptions {
  /** Global SQLCipher key; fetched from the Nexon gateway when omitted. */
  globalSqlcipherKey?: string;
  /** Nexon gateway region used to fetch the Global key (`na` by default). */
  globalRegion?: string;
  /** All types when omitted. */
  storyTypes?: StoryType[];
  cacheDir: string;
  logger?: SyncLogger;
}

export interface ExtractStoriesResult {
  gameVersion: string;
  episodes: StoryEpisode[];
  /** Script groups with text that no story table points to. */
  unmapped: {
    groups: number;
    characters: number;
    sampleGroupIds: number[];
  };
  warnings: string[];
}

/** A period in UTC, as ISO 8601 strings. */
export interface ContentPeriod {
  start: string;
  end: string;
}

export type UpcomingRaidKind =
  | "raid"
  | "eliminateRaid"
  | "multiFloorRaid"
  | "timeAttackDungeon";

/** One of the three bosses of a Grand Assault season. */
export interface UpcomingRaidRoom {
  /** E.g. `Goz_Indoor_HeavyArmor`. */
  bossGroup: string;
  /** The game's `ArmorType` names, e.g. `HeavyArmor`. */
  armorTypes: string[];
  hasTorment: boolean;
  hasLunatic: boolean;
}

/** A Total Assault, Grand Assault, Final Restriction Release or Joint Firing Drill season. */
export interface UpcomingRaid {
  kind: UpcomingRaidKind;
  /** The JP season id; Global numbers its seasons differently. */
  seasonId: number;
  /**
   * The game's name for the boss: `RaidBossGroupType` for raids (`Binah`, `HOD`,
   * `EN0023`), the boss group without its armor suffix for Final Restriction
   * Release (`EN0008`), and the drill type for drills (`Defense`).
   */
  boss: string;
  /** The season's boss groups as the game lists them; three for a Grand Assault. */
  bossGroups: string[];
  /** The boss's `BulletType` on the hardest difficulty; empty for drills. */
  attackTypes: string[];
  /** The boss's `ArmorType`s; for a Grand Assault, see `rooms` instead. */
  armorTypes: string[];
  /** `StageTopography` names: `Street`, `Outdoor`, `Indoor`. */
  terrains: string[];
  /** Only for a Grand Assault. */
  rooms: UpcomingRaidRoom[];
  jp: ContentPeriod;
  /** Global's own dates for this season, once its files have them. */
  global: ContentPeriod | null;
  /**
   * `true` for a season that hasn't started and repeats the one before it: the
   * game files hold a copy of the last season until the next one is announced.
   */
  tentative: boolean;
}

export type UpcomingEventKind = "event" | "rerun" | "permanent" | "mini";

export interface UpcomingEvent {
  /** `EventContentId` */
  id: number;
  /** For reruns and permanent copies, the original event; otherwise `null`. */
  originalId: number | null;
  kind: UpcomingEventKind;
  /** For the recurring mini event, which run this is (`60019` is 19). */
  season: number | null;
  nameJp: string | null;
  /** From Global, so `null` until Global's files have the event. */
  nameEn: string | null;
  /** Character ids of the students the event's stages give away. */
  rewardCharacterIds: number[];
  jp: ContentPeriod;
  global: ContentPeriod | null;
}

export interface UpcomingChapterPart {
  openDate: string;
  episodeCount: number;
}

export interface UpcomingChapter {
  /** `{ModeType}_{SubType}_{VolumeId}_{ChapterId}`, e.g. `Main_Series2_3_1`. */
  id: string;
  /** `Main`, `SpecialOperation`, `Sub`, `Mini` or `Prologue`. */
  modeType: string;
  subType: string;
  volumeId: number;
  chapterId: number;
  nameJp: string | null;
  nameEn: string | null;
  episodeCount: number;
  /**
   * Position among the chapters of its mode type, oldest first. JP has no
   * release dates, but its table is chronological within a mode type.
   */
  order: number;
  /** When the chapter opens on Global, once its files have it. */
  globalOpenDate: string | null;
  /**
   * The volume as the game shows it, where that differs from `volumeId`
   * (`Main_Series2_3_1` is shown as volume `2`); empty otherwise.
   */
  displayVolumeId: string;
  /**
   * The batches Global releases the chapter's episodes in, oldest first: a
   * chapter can come out in parts weeks apart. Empty until Global's files have
   * the chapter. JP has no dates, so there a new part only shows as
   * `episodeCount` growing.
   */
  globalParts: UpcomingChapterPart[];
}

export interface ExtractUpcomingContentOptions {
  /** JP SQLCipher key; fetched from the JP gateway when omitted. */
  sqlcipherKey?: string;
  /** Global SQLCipher key; fetched from the Nexon gateway when omitted. */
  globalSqlcipherKey?: string;
  /** Nexon gateway region used to fetch the Global key (`na` by default). */
  globalRegion?: string;
  /** Leaves out seasons and events that started before this; a year ago by default. */
  since?: Date;
  /** How many chapters to keep per mode type (10 by default). */
  chapterLimit?: number;
  cacheDir: string;
  logger?: SyncLogger;
}

export interface ExtractUpcomingContentResult {
  gameVersion: {
    jp: string;
    /** `null` when Global couldn't be loaded (see `warnings`). */
    global: string | null;
  };
  /** Oldest first within a kind. */
  raids: UpcomingRaid[];
  /** Oldest first. */
  events: UpcomingEvent[];
  chapters: UpcomingChapter[];
  warnings: string[];
}

export interface JpMaintenance {
  start: string;
  end: string;
  /** Whether the maintenance window covers the current time. */
  ongoing: boolean;
}

export interface GetJpMaintenanceOptions {
  cacheDir: string;
  logger?: SyncLogger;
}

/** A hex on a mission's map, in cube coordinates (`z` is `-x - y`). */
export interface HexCoord {
  x: number;
  y: number;
}

/** `CampaignUnitExcel.AIMoveType`. */
export type MissionEnemyAi = "None" | "Guard" | "Pursuit";

export type MissionEnemyGrade = "Grade1" | "Grade2" | "Grade3" | "Boss";

/** An enemy on a mission's map (`hexaUnitList`). */
export interface MissionMapUnit extends HexCoord {
  /** The map's own id for the unit, which events refer to. */
  entityId: number;
  /** `CampaignUnitExcel.Id` */
  unitId: number;
  ai: MissionEnemyAi;
  /** Tiles the unit moves per enemy phase. */
  moveRange: number;
  grade: MissionEnemyGrade;
  /**
   * The attack types of the enemies the unit's battle spawns (`Explosion`,
   * `Pierce`, …), the most common first. From the battle's stage file, or the
   * ground's `EnemyBulletType` when the stage names no enemies.
   */
  attackTypes: string[];
  /**
   * The armor types of those enemies (`LightArmor`, `Unarmed`, …), the most
   * common first. A battle can mix them: 10-2H's first has Light and Special.
   */
  armorTypes: string[];
  /** The unit's model (`SchoolGirl01_Sukeban_SMG`). */
  prefab: string;
}

/** `CampaignStrategyObjectExcel.StrategyObjectType`, the ones mission maps use. */
export type MissionObjectType =
  | "Start"
  | "FixedStart01"
  | "FixedStart02"
  | "FixedStart03"
  | "FixedStart04"
  | "Heal"
  | "StatBuff"
  | "Parcel"
  | "ParcelOneTimePerAccount"
  | "Portal"
  | "PortalOneWayEnterance"
  | "PortalOneWayExit"
  | "Observatory"
  | "Beacon"
  | "BeaconOneTime"
  | "EnemySpawn"
  | "SwitchToggle"
  | "SwitchMovableWhenToggleOff"
  | "SwitchMovableWhenToggleOn";

/** A strategy object on a mission's map (`hexaStrageyList`). */
export interface MissionMapObject extends HexCoord {
  entityId: number;
  /** `CampaignStrategyObjectExcel.Id` */
  objectId: number;
  type: MissionObjectType;
  /**
   * Portals with the same id are linked: two-way portals with each other, a one-way
   * entrance with its exit.
   */
  portalId?: number;
  /** Switches toggle the switch tiles with the same id. */
  switchId?: number;
  /** For switches: whether the switch starts toggled on. */
  switchOn?: boolean;
  /** What picking the object up gives (the Pyroxene box of Hard missions). */
  reward?: MissionParcel;
  /** Healing in thousandths of max HP. */
  healValue?: number;
  /** `StrategyObjectBuffDefineExcel` id, for buffs. */
  buffId?: number;
  /** The object goes away once used. */
  disposable: boolean;
}

export type MissionMapCondition =
  | {
      type: "start";
    }
  | ({
      /** A player echelon arrives on the tile. */
      type: "arrive";
    } & HexCoord)
  | {
      /** The given phase of turn `turn` begins. */
      type: "turn";
      turn: number;
      phase: "player" | "enemy";
    }
  | {
      /** All of the given units have been defeated. */
      type: "unitsDead";
      entityIds: number[];
    };

export type MissionMapCommand =
  | {
      type: "spawnUnits";
      entityIds: number[];
    }
  | {
      type: "spawnObjects";
      entityIds: number[];
    }
  | {
      type: "hideObjects";
      entityIds: number[];
    }
  | {
      type: "showTiles";
      tiles: HexCoord[];
    }
  | {
      type: "hideTiles";
      tiles: HexCoord[];
    }
  | ({
      /** Moves a unit to the tile (scripted enemies). */
      type: "moveUnit";
      entityId: number;
    } & HexCoord)
  | {
      /** The commands after this one run `turns` turns later. */
      type: "wait";
      turns: number;
    }
  | {
      type: "endBattle";
      win: boolean;
    };

/** A scripted event: once every condition has held, its commands run. */
export interface MissionMapEvent {
  id: number;
  name: string;
  conditions: MissionMapCondition[];
  commands: MissionMapCommand[];
}

/**
 * A mission's hexamap (`TableBundles/HexaMap.zip`, `strategymap_<id>.json`). Tiles
 * are all listed, including ones events show later; units and objects only appear
 * once an event spawns them (the start event spawns most).
 */
export interface MissionMapData {
  tiles: HexCoord[];
  units: MissionMapUnit[];
  objects: MissionMapObject[];
  events: MissionMapEvent[];
}

export interface MissionParcel {
  /** `Item`, `Equipment` or `Currency` for mission drops. */
  parcelType: ParcelType;
  parcelId: number;
  amount: number;
}

export type MissionRewardTag = "FirstClear" | "Default" | "Rare" | "ThreeStar";

/** A drop (`CampaignStageRewardExcel`). Random drop groups (`GachaGroup`) are left out. */
export interface MissionRewardData extends MissionParcel {
  tag: MissionRewardTag;
  /** 0 to 1. */
  probability: number;
}

/** A main story mission (`CampaignStageExcel`). */
export interface MissionData {
  id: number;
  /** The area (chapter) number. */
  chapter: number;
  /** The mission's number within the area and difficulty. */
  stage: number;
  difficulty: MissionDifficulty;
  /** AP to enter. */
  cost: number;
  /** Echelons that can be deployed. */
  echelonCount: number;
  recommendedLevel: number;
  terrain: Terrain;
  /** The map is covered in fog: tiles show as echelons get near. */
  fog: boolean;
  /** The "Clear within N turns" star condition. */
  starTurns: number;
  /** The "Clear within N turns" challenge (`MissionExcel`), when the mission has one. */
  challengeTurns: number | null;
  /** The "Acquire S rank N times" star condition. */
  starSRanks: number;
  rewards: MissionRewardData[];
  map: MissionMapData;
  /** Whether Global's files have the mission. */
  isReleasedGlobal: boolean;
}

/** An item (`ItemExcel`), equipment piece (`EquipmentExcel`) or currency (`CurrencyExcel`). */
export type GameItemData = {
  id: number;
  names: Partial<Record<SkillLocale, string>>;
  /** The icon texture (`Item_Icon_SecretStone_Suzumi`); see `itemIconKey`. */
  iconName: string;
  rarity: ItemRarity;
} & (
  | {
      parcelType: "Item";
      itemCategory: ItemCategory;
    }
  | {
      parcelType: "Equipment";
      equipmentCategory: EquipmentCategory;
      tier: number;
    }
  | {
      parcelType: "Currency";
    }
);

export interface ExtractGameItemsOptions {
  sqlcipherKey?: string;
  globalSqlcipherKey?: string;
  /** Nexon gateway region used to fetch the Global key (`na` by default). */
  globalRegion?: string;
  cacheDir: string;
  logger?: SyncLogger;
}

export interface ExtractGameItemsResult {
  gameVersion: {
    jp: string;
    global: string;
  };
  /** By parcel type and id. */
  items: GameItemData[];
}

export interface ExtractMissionsOptions {
  sqlcipherKey?: string;
  globalSqlcipherKey?: string;
  /** Nexon gateway region used to fetch the Global key (`na` by default). */
  globalRegion?: string;
  cacheDir: string;
  logger?: SyncLogger;
}

export interface ExtractMissionsResult {
  gameVersion: {
    jp: string;
    global: string | null;
  };
  /** By area, difficulty and number. */
  missions: MissionData[];
  /** The items and equipment the missions drop. */
  items: GameItemData[];
  warnings: string[];
}

export interface DataSyncModule {
  listNewStudents(
    options: ListNewStudentsOptions,
  ): Promise<ListNewStudentsResult>;

  /** JP's released gifts and their tags. */
  listFavorItems(options: ListFavorItemsOptions): Promise<ListFavorItemsResult>;

  extractImageAssets(
    options: ExtractImageAssetsOptions,
  ): Promise<ExtractImageAssetsResult>;

  extractStudentSkills(
    options: ExtractStudentSkillsOptions,
  ): Promise<ExtractStudentSkillsResult>;

  /** The students' relationship story episodes, with their titles and unlocks. */
  extractBondStories(
    options: ExtractBondStoriesOptions,
  ): Promise<ExtractBondStoriesResult>;

  extractStories(options: ExtractStoriesOptions): Promise<ExtractStoriesResult>;

  extractUpcomingContent(
    options: ExtractUpcomingContentOptions,
  ): Promise<ExtractUpcomingContentResult>;

  /** The main story missions, with their drops and hexamaps. */
  extractMissions(
    options: ExtractMissionsOptions,
  ): Promise<ExtractMissionsResult>;

  /** Every item, equipment piece and currency, on JP or Global. */
  extractGameItems(
    options: ExtractGameItemsOptions,
  ): Promise<ExtractGameItemsResult>;

  /** The JP maintenance window the game announces, or `null` when there is none. */
  getJpMaintenance(
    options: GetJpMaintenanceOptions,
  ): Promise<JpMaintenance | null>;
}
