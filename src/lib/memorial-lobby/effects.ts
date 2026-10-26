import type { Spine } from "@esotericsoftware/spine-pixi-v7";
import * as PIXI from "pixi.js-v7";

import FRAGMENT from "./shaders/effect.frag.glsl";
import VERTEX from "./shaders/effect.vert.glsl";

import type {
  MemorialLobbyColorValue,
  MemorialLobbyCurve,
  MemorialLobbyEffect,
  MemorialLobbyEffects,
  MemorialLobbyGradient,
  MemorialLobbyMaterial,
  MemorialLobbyMesh,
  MemorialLobbyParticleSystem,
} from "@/lib/game-data/contract";

/**
 * The effects of a memorial lobby: Unity particle systems simulated here and
 * textured meshes, drawn with one shader that approximates the game's effect
 * shaders (`DSFX/FX_SHADER_*`): a main texture, optionally masked and
 * distorted by scrolling textures, tinted by an HDR color.
 */

type Color = [number, number, number, number];

// Curve slopes at or beyond this are steps.
const STEP = 1e8;

/** Evaluates a Hermite curve given as `[time, value, inSlope, outSlope, ...]`. */
function curveAt(keys: number[], t: number): number {
  const n = keys.length / 4;

  if (n === 0) {
    return 0;
  }

  if (n === 1 || t <= keys[0]) {
    return keys[1];
  }

  if (t >= keys[(n - 1) * 4]) {
    return keys[(n - 1) * 4 + 1];
  }

  let i = 0;
  while (i < n - 2 && t > keys[(i + 1) * 4]) {
    i++;
  }

  const t0 = keys[i * 4];
  const v0 = keys[i * 4 + 1];
  const out0 = keys[i * 4 + 3];
  const t1 = keys[(i + 1) * 4];
  const v1 = keys[(i + 1) * 4 + 1];
  const in1 = keys[(i + 1) * 4 + 2];

  if (Math.abs(out0) >= STEP || Math.abs(in1) >= STEP) {
    return v0;
  }

  const dt = t1 - t0;
  const s = (t - t0) / dt;
  const s2 = s * s;
  const s3 = s2 * s;

  return (
    (2 * s3 - 3 * s2 + 1) * v0 +
    (s3 - 2 * s2 + s) * dt * out0 +
    (-2 * s3 + 3 * s2) * v1 +
    (s3 - s2) * dt * in1
  );
}

/** Evaluates a MinMaxCurve at time `t` (0–1) for a particle's random `r`. */
function valueAt(curve: MemorialLobbyCurve, t: number, r: number): number {
  if (typeof curve === "number") {
    return curve;
  }

  if ("min" in curve) {
    return curve.min + (curve.max - curve.min) * r;
  }

  const max = curveAt(curve.curve, t);

  const value = curve.minCurve
    ? curveAt(curve.minCurve, t) + (max - curveAt(curve.minCurve, t)) * r
    : max;

  return value * curve.scale;
}

function gradientAt(g: MemorialLobbyGradient, t: number): Color {
  const channel = (keys: number[], stride: number, offset: number) => {
    const n = keys.length / stride;

    if (n === 0) {
      return 1;
    }

    if (t <= keys[0] || n === 1) {
      return keys[offset];
    }

    for (let i = 0; i < n - 1; i++) {
      const t0 = keys[i * stride];
      const t1 = keys[(i + 1) * stride];

      if (t <= t1) {
        if (g.fixed) {
          return keys[(i + 1) * stride + offset];
        }

        const s = t1 > t0 ? (t - t0) / (t1 - t0) : 0;

        return (
          keys[i * stride + offset] * (1 - s) +
          keys[(i + 1) * stride + offset] * s
        );
      }
    }

    return keys[(n - 1) * stride + offset];
  };

  return [
    channel(g.colors, 4, 1),
    channel(g.colors, 4, 2),
    channel(g.colors, 4, 3),
    channel(g.alphas, 2, 1),
  ];
}

const lerpColor = (a: Color, b: Color, s: number): Color => [
  a[0] + (b[0] - a[0]) * s,
  a[1] + (b[1] - a[1]) * s,
  a[2] + (b[2] - a[2]) * s,
  a[3] + (b[3] - a[3]) * s,
];

function colorAt(value: MemorialLobbyColorValue, t: number, r: number): Color {
  if ("color" in value) {
    return value.color;
  }

  if ("colors" in value) {
    return lerpColor(value.colors[0], value.colors[1], r);
  }

  if ("gradient" in value) {
    return gradientAt(value.gradient, t);
  }

  if ("gradients" in value) {
    return lerpColor(
      gradientAt(value.gradients[0], t),
      gradientAt(value.gradients[1], t),
      r,
    );
  }

  return gradientAt(value.randomGradient, r);
}

type Vec3 = [number, number, number];

/** Rotation by Euler angles in degrees, in Unity's order (z, then x, then y). */
function eulerMatrix([x, y, z]: Vec3): number[] {
  const rad = Math.PI / 180;

  const [cx, sx] = [Math.cos(x * rad), Math.sin(x * rad)];
  const [cy, sy] = [Math.cos(y * rad), Math.sin(y * rad)];
  const [cz, sz] = [Math.cos(z * rad), Math.sin(z * rad)];

  return [
    cy * cz + sy * sx * sz,
    -cy * sz + sy * sx * cz,
    sy * cx,
    cx * sz,
    cx * cz,
    -sx,
    -sy * cz + cy * sx * sz,
    sy * sz + cy * sx * cz,
    cy * cx,
  ];
}

const transform3 = (m: number[], v: Vec3): Vec3 => [
  m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
  m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
  m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
];

const length3 = (v: Vec3) => Math.hypot(v[0], v[1], v[2]);

const normalize3 = (v: Vec3): Vec3 => {
  const l = length3(v) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

function randomUnit(): Vec3 {
  const z = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);

  return [r * Math.cos(a), r * Math.sin(a), z];
}

// Unity's default gravity, in world units per second squared.
const GRAVITY = -9.81;

// How many random numbers each particle keeps for its curves.
const RANDOMS = 12;

enum R {
  Lifetime = 0,
  Speed = 1,
  Size = 2,
  Rotation = 3,
  Color = 4,
  RotationSpeed = 5,
  Velocity = 6,
  Force = 7,
  Frame = 8,
  Row = 9,
  Custom = 10,
  SizeOverLife = 11,
}

type Particle = {
  position: Vec3;
  velocity: Vec3;
  age: number;
  lifetime: number;
  size: [number, number];
  rotation: number;
  /** Rotations around x and y, for 3D particles (radians). */
  tilt: [number, number] | null;
  /** -1 for particles that turn the other way. */
  spin: number;
  color: Color;
  random: Float32Array;
  /** For world-space systems: where the effect was when the particle was emitted. */
  frozen: number[] | null;
};

/** One Unity particle system, simulated in its own space. */
class ParticleSystem {
  particles: Particle[] = [];

  private time = 0;
  private emitDebt = 0;
  private burstsDone: number[] = [];
  private playing = false;

  /** The effect's current space → scene transform, for world-space emission. */
  current: number[] = [1, 0, 0, 0, 0, 1, 0, 0];

  constructor(readonly ps: MemorialLobbyParticleSystem) {}

  get alive() {
    return this.playing || this.particles.length > 0;
  }

  play() {
    this.particles = [];
    this.playing = true;
    this.time = -valueAt(this.ps.startDelay, 0, Math.random());
    this.emitDebt = 0;
    this.burstsDone = this.ps.emission?.bursts.map(() => 0) ?? [];

    if (this.ps.looping && this.ps.prewarm) {
      const step = 1 / 30;

      for (let t = 0; t < this.ps.duration; t += step) {
        this.step(step);
      }
    }
  }

  stop() {
    this.playing = false;
    this.particles = [];
  }

  update(dt: number) {
    if (!this.alive) {
      return;
    }

    this.step(dt * this.ps.simulationSpeed);
  }

  private step(dt: number) {
    const ps = this.ps;

    // Existing particles age (and die) before new ones are emitted, as in
    // Unity: a system capped at one particle replaces it without a gap.
    for (const p of this.particles) {
      this.age(p, dt);
    }

    const ring = ps.ringBuffer;

    if (ring) {
      // Particles outlive their lifetime: paused at its end, or looping
      // through part of it.
      for (const p of this.particles) {
        if (p.age < p.lifetime) {
          continue;
        }

        if (!ring.loop) {
          p.age = p.lifetime * 0.9999;
          continue;
        }

        const start = ring.range[0] * p.lifetime;

        const span = Math.max(
          (ring.range[1] - ring.range[0]) * p.lifetime,
          1e-3,
        );

        p.age = start + ((p.age - start) % span);
      }
    } else {
      this.particles = this.particles.filter((p) => p.age < p.lifetime);
    }

    if (this.playing) {
      const before = this.time;

      this.time += dt;

      if (this.time >= 0) {
        this.emit(Math.max(before, 0), this.time);
      }

      if (this.time >= ps.duration) {
        if (ps.looping) {
          this.time -= ps.duration;
          this.burstsDone = this.burstsDone.map(() => 0);

          if (this.time > 0) {
            this.emit(0, this.time);
          }
        } else {
          this.playing = false;
        }
      }
    }
  }

  private emit(from: number, to: number) {
    const emission = this.ps.emission;

    if (!emission) {
      return;
    }

    const loop = this.ps.duration || 1;

    const rate = valueAt(
      emission.rate,
      Math.min(from / loop, 1),
      Math.random(),
    );

    this.emitDebt += rate * (to - from);

    let count = Math.floor(this.emitDebt);

    this.emitDebt -= count;

    emission.bursts.forEach((burst, i) => {
      // Zero cycles repeat the burst for as long as the system runs.
      const cycles =
        burst.cycles > 0 || burst.interval <= 0
          ? Math.max(burst.cycles, 1)
          : Number.POSITIVE_INFINITY;

      while (this.burstsDone[i] < cycles) {
        const at = burst.time + this.burstsDone[i] * burst.interval;

        if (at > to || at >= loop) {
          break;
        }

        this.burstsDone[i]++;

        if (at >= from && Math.random() <= burst.probability) {
          count += Math.round(valueAt(burst.count, 0, Math.random()));
        }
      }
    });

    const t = Math.min(to / loop, 1);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.ps.maxParticles) {
        // Ring buffers replace their oldest particle; others stop emitting.
        if (!this.ps.ringBuffer) {
          break;
        }

        this.particles.shift();
      }

      this.particles.push(this.spawn(t));
    }
  }

  private spawn(t: number): Particle {
    const ps = this.ps;

    const random = new Float32Array(RANDOMS);

    for (let i = 0; i < RANDOMS; i++) {
      random[i] = Math.random();
    }

    const { position, direction } = this.shapePoint();
    const speed = valueAt(ps.start.speed, t, random[R.Speed]);
    const size = valueAt(ps.start.size, t, random[R.Size]);
    const flipped = Math.random() < ps.start.flipRotation;

    return {
      position,
      velocity: [
        direction[0] * speed,
        direction[1] * speed,
        direction[2] * speed,
      ],
      age: 0,
      lifetime: Math.max(
        valueAt(ps.start.lifetime, t, random[R.Lifetime]),
        1e-3,
      ),
      size: [
        size,
        ps.start.sizeY ? valueAt(ps.start.sizeY, t, random[R.Size]) : size,
      ],
      rotation:
        valueAt(ps.start.rotation, t, random[R.Rotation]) * (flipped ? -1 : 1),
      tilt: ps.start.rotation3D
        ? [
            valueAt(ps.start.rotation3D[0], t, random[R.Rotation]),
            valueAt(ps.start.rotation3D[1], t, random[R.Rotation]),
          ]
        : null,
      spin: flipped ? -1 : 1,
      color: colorAt(ps.start.color, t, random[R.Color]),
      random,
      frozen: ps.worldSpace ? [...this.current] : null,
    };
  }

  /** A point on the emitter shape and the direction particles leave it in. */
  private shapePoint(): { position: Vec3; direction: Vec3 } {
    const shape = this.ps.shape;
    if (!shape) {
      return { position: [0, 0, 0], direction: [0, 0, 1] };
    }

    const radius = shape.radius;
    const inner = 1 - shape.radiusThickness;
    const arc = (Math.random() * shape.arc * Math.PI) / 180;

    let position: Vec3;
    let direction: Vec3;

    switch (shape.type) {
      case 0:
      case 1:
      case 2:
      case 3: {
        const dir = randomUnit();

        if (shape.type >= 2) {
          dir[2] = Math.abs(dir[2]);
        }

        const r = radius * (inner + (1 - inner) * Math.cbrt(Math.random()));

        position = [dir[0] * r, dir[1] * r, dir[2] * r];
        direction = dir;

        break;
      }
      case 4:
      case 7:
      case 8:
      case 9: {
        const r = Math.sqrt(
          inner * inner + (1 - inner * inner) * Math.random(),
        );

        const [cx, cy] = [Math.cos(arc), Math.sin(arc)];

        const spread = Math.sin((shape.angle * Math.PI) / 180) * r;

        direction = normalize3([
          cx * spread,
          cy * spread,
          Math.cos((shape.angle * Math.PI) / 180),
        ]);

        position = [cx * r * radius, cy * r * radius, 0];

        if (shape.type === 8 || shape.type === 9) {
          const along = Math.random() * shape.length;

          position = [
            position[0] + direction[0] * along,
            position[1] + direction[1] * along,
            position[2] + direction[2] * along,
          ];
        }

        break;
      }
      case 10:
      case 11:
      case 17: {
        const r =
          radius *
          (shape.type === 11
            ? 1
            : Math.sqrt(inner * inner + (1 - inner * inner) * Math.random()));

        direction = [Math.cos(arc), Math.sin(arc), 0];
        position = [direction[0] * r, direction[1] * r, 0];

        break;
      }
      case 12:
        position = [(Math.random() * 2 - 1) * radius, 0, 0];
        direction = [0, 1, 0];
        break;
      case 18:
        position = [Math.random() - 0.5, Math.random() - 0.5, 0];
        direction = [0, 0, 1];
        break;
      default:
        // Boxes (5, 15, 16) and anything else: inside the unit box.
        position = [
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ];
        direction = [0, 0, 1];
    }

    if (shape.sphericalDirection > 0) {
      const outward = normalize3(position);

      direction = normalize3([
        direction[0] + (outward[0] - direction[0]) * shape.sphericalDirection,
        direction[1] + (outward[1] - direction[1]) * shape.sphericalDirection,
        direction[2] + (outward[2] - direction[2]) * shape.sphericalDirection,
      ]);
    }

    if (shape.randomDirection > 0) {
      const random = randomUnit();

      direction = normalize3([
        direction[0] + (random[0] - direction[0]) * shape.randomDirection,
        direction[1] + (random[1] - direction[1]) * shape.randomDirection,
        direction[2] + (random[2] - direction[2]) * shape.randomDirection,
      ]);
    }

    const s = shape.scale;
    const rotation = eulerMatrix(shape.rotation);

    position = transform3(rotation, [
      position[0] * s[0],
      position[1] * s[1],
      position[2] * s[2],
    ]);

    direction = normalize3(
      transform3(rotation, [
        direction[0] * s[0],
        direction[1] * s[1],
        direction[2] * s[2],
      ]),
    );

    if (shape.randomPosition > 0) {
      const random = randomUnit();
      position = position.map(
        (v, i) => v + random[i] * shape.randomPosition,
      ) as Vec3;
    }

    return {
      position: [
        position[0] + shape.position[0],
        position[1] + shape.position[1],
        position[2] + shape.position[2],
      ],
      direction,
    };
  }

  private toLocal(v: Vec3, world: boolean): Vec3 {
    return world ? transform3(this.ps.worldToLocal, v) : v;
  }

  private age(p: Particle, dt: number) {
    const ps = this.ps;
    p.age += dt;

    const t = Math.min(p.age / p.lifetime, 1);
    const r = p.random;

    const gravity = valueAt(ps.start.gravity, t, r[R.Force]);
    if (gravity) {
      const g = this.toLocal([0, GRAVITY * gravity, 0], true);

      p.velocity = [
        p.velocity[0] + g[0] * dt,
        p.velocity[1] + g[1] * dt,
        p.velocity[2] + g[2] * dt,
      ];
    }

    if (ps.force) {
      const f = this.toLocal(
        [
          valueAt(ps.force.x, t, r[R.Force]),
          valueAt(ps.force.y, t, r[R.Force]),
          valueAt(ps.force.z, t, r[R.Force]),
        ],
        ps.force.world,
      );

      p.velocity = [
        p.velocity[0] + f[0] * dt,
        p.velocity[1] + f[1] * dt,
        p.velocity[2] + f[2] * dt,
      ];
    }

    let velocity: Vec3 = [...p.velocity];
    let speedModifier = 1;

    const v = ps.velocity;

    if (v) {
      const extra = this.toLocal(
        [
          valueAt(v.x, t, r[R.Velocity]),
          valueAt(v.y, t, r[R.Velocity]),
          valueAt(v.z, t, r[R.Velocity]),
        ],
        v.world,
      );

      velocity = [
        velocity[0] + extra[0],
        velocity[1] + extra[1],
        velocity[2] + extra[2],
      ];

      const offset: Vec3 = [
        valueAt(v.offset[0], t, r[R.Velocity]),
        valueAt(v.offset[1], t, r[R.Velocity]),
        valueAt(v.offset[2], t, r[R.Velocity]),
      ];

      const radial = valueAt(v.radial, t, r[R.Velocity]);

      if (radial) {
        const out = normalize3([
          p.position[0] - offset[0],
          p.position[1] - offset[1],
          p.position[2] - offset[2],
        ]);

        velocity = [
          velocity[0] + out[0] * radial,
          velocity[1] + out[1] * radial,
          velocity[2] + out[2] * radial,
        ];
      }

      const orbit: Vec3 = [
        valueAt(v.orbital[0], t, r[R.Velocity]) * dt,
        valueAt(v.orbital[1], t, r[R.Velocity]) * dt,
        valueAt(v.orbital[2], t, r[R.Velocity]) * dt,
      ];

      if (orbit[0] || orbit[1] || orbit[2]) {
        const rel: Vec3 = [
          p.position[0] - offset[0],
          p.position[1] - offset[1],
          p.position[2] - offset[2],
        ];

        const turned = transform3(
          eulerMatrix(orbit.map((a) => (a * 180) / Math.PI) as Vec3),
          rel,
        );

        p.position = [
          turned[0] + offset[0],
          turned[1] + offset[1],
          turned[2] + offset[2],
        ];
      }

      speedModifier = valueAt(v.speedModifier, t, r[R.Velocity]);
    }

    const limit = ps.limitVelocity;

    if (limit) {
      const max = valueAt(limit.speed, t, r[R.Velocity]);
      const speed = length3(velocity);

      if (speed > max && speed > 0) {
        // Unity removes `dampen` of the excess every frame (at 30 fps).
        const keep = (1 - limit.dampen) ** (dt * 30);
        const target = max + (speed - max) * keep;
        const scale = target / speed;

        p.velocity = p.velocity.map((c) => c * scale) as Vec3;
        velocity = velocity.map((c) => c * scale) as Vec3;
      }

      const drag = valueAt(limit.drag, t, r[R.Velocity]);

      if (drag) {
        const keep = Math.max(0, 1 - drag * dt);
        p.velocity = p.velocity.map((c) => c * keep) as Vec3;
      }
    }

    p.position = [
      p.position[0] + velocity[0] * speedModifier * dt,
      p.position[1] + velocity[1] * speedModifier * dt,
      p.position[2] + velocity[2] * speedModifier * dt,
    ];

    if (ps.rotation) {
      p.rotation += valueAt(ps.rotation, t, r[R.RotationSpeed]) * p.spin * dt;
    }

    (p as Particle & { lastVelocity?: Vec3 }).lastVelocity = velocity;
  }
}

/** Shader inputs from a material, after picking the properties the shader family uses. */
type MaterialSetup = {
  main: TextureSlot | null;
  mask: TextureSlot | null;
  distort: TextureSlot | null;
  tint: Color;
  family: ShaderFamily;
  /** For the mixed family: how much it covers instead of adding (`_Blend`). */
  cover: number;
  /** Burns the texture away over the particle's life; see `Dissolve`. */
  dissolve: Dissolve;
  /** How soft the dissolve's edge is (`_Step_Power` when it's a fraction). */
  dissolveSoftness: number;
  /** Smoke shaders pack shading into the red channel; the others are masks. */
  redShading: boolean;
  /** The particles' alpha counts (`_Vertex_Alpha_Use`, on unless a material says). */
  vertexAlpha: boolean;
  distortPower: [number, number];
  distortMain: boolean;
  distortMask: boolean;
  customData: CustomDataUse;
};

/**
 * How a shader blends: `additive` adds light; `alpha` covers what's behind;
 * `mixed` (the `AlphaBlend_Add` family) adds its color and covers by its
 * alpha as much as the material's `_Blend` says (lobbies almost always leave
 * it at 0, adding).
 */
enum ShaderFamily {
  Additive = 0,
  Mixed = 1,
  Alpha = 2,
}

/**
 * Where the dissolve threshold comes from. What's thinner than the threshold
 * is cut away.
 */
enum Dissolve {
  None = 0,
  /** Step shaders: the custom data's 4th value. */
  CustomData = 1,
  /**
   * Step materials with `_Step_Custom_DataVertex_color_Use`: the particle's
   * alpha (1 − alpha), so it burns away as it fades.
   */
  VertexAlpha = 2,
  /**
   * Smoke shaders keep a dissolve map in the texture's blue channel and burn
   * it away as the custom data's 4th value rises over the particle's life.
   */
  BlueChannel = 3,
}

/**
 * What a particle's custom data does: offset the main texture by `xy`, or
 * the main texture by `x` and the mask by `y` (shooting star trails).
 */
enum CustomDataUse {
  None = 0,
  MainOffset = 1,
  MainMaskOffset = 2,
}

type TextureSlot = {
  texture: PIXI.Texture;
  st: [number, number, number, number];
  speed: [number, number];
  /** Data (noise, masks) rather than sRGB color. */
  linear: boolean;
  /** No alpha channel: brightness is opacity (most effect textures). */
  opaque: boolean;
};

const MAIN_TEXTURES = [
  "_Tex_Main",
  "_Texture",
  "_Main_Tex",
  "_MainTex",
  "_TextureSample0",
  "_MainTexRGBA",
  "_FX_TEX_FocusLine",
];

const MASK_TEXTURES = ["_Tex_Mask", "_B"];

const DISTORT_TEXTURES = [
  "_Tex_Distort",
  "_Tex_DistortRG",
  "_D",
  "_FlowTex",
  "_FlowTexRGB",
];

function materialSetup(
  material: MemorialLobbyMaterial | null,
  textures: Map<string, PIXI.Texture>,
): MaterialSetup {
  const slot = (names: string[], speed: string): TextureSlot | null => {
    const name = names.find(
      (n) =>
        material?.textures[n] && textures.has(material.textures[n].texture),
    );

    if (!name || !material) {
      return null;
    }

    const t = material.textures[name];

    // Shaders that don't tile their main texture leave its scale at 0.
    const [sx, sy] = t.scale[0] === 0 && t.scale[1] === 0 ? [1, 1] : t.scale;

    return {
      texture: textures.get(t.texture) as PIXI.Texture,
      linear: !!t.linear,
      opaque: !!t.opaque,
      st: [sx, sy, t.offset[0], t.offset[1]],
      speed: [
        material.floats[`_${speed}_Speed_X`] ?? 0,
        material.floats[`_${speed}_Speed_Y`] ?? 0,
      ],
    };
  };

  const shader = material?.shader.toLowerCase() ?? "";
  const floats = material?.floats ?? {};
  const colors = material?.colors ?? {};

  let main = slot(MAIN_TEXTURES, "Main");
  let mask = slot(MASK_TEXTURES, "Mask");

  // Step shaders draw their mask texture alone.
  if (!main && mask) {
    main = mask;
    mask = null;
  }

  const base = colors._Color ??
    colors._TintColor ??
    colors._MainColor ?? [1, 1, 1, 1];

  const multiply = floats._Multiply ?? 1;

  const tint: Color = [
    base[0] * multiply,
    base[1] * multiply,
    base[2] * multiply,
    base[3],
  ];

  return {
    main,
    mask,
    distort: slot(DISTORT_TEXTURES, "Dis"),
    tint,
    cover: floats._Blend === 1 ? 1 : 0,
    dissolve: floats._BCustom_Data_Use
      ? Dissolve.BlueChannel
      : floats._Step_Custom_DataVertex_color_Use
        ? Dissolve.VertexAlpha
        : shader.includes("step")
          ? Dissolve.CustomData
          : Dissolve.None,
    redShading: shader.includes("explosion_smoke"),
    dissolveSoftness:
      floats._Step_Power > 0 && floats._Step_Power < 1
        ? floats._Step_Power
        : 0.1,
    vertexAlpha: floats._Vertex_Alpha_Use !== 0,
    // Step shaders (fire, splashes) glow like additive ones in the game.
    // Materials mostly leave Unity's blend factors at defaults that don't
    // say anything; an explicit SrcAlpha / OneMinusSrcAlpha blends normally
    // whatever the shader is.
    family:
      floats._SrcBlend === 5 && floats._DstBlend === 10
        ? ShaderFamily.Alpha
        : shader.includes("additive") || shader.includes("step")
          ? ShaderFamily.Additive
          : shader.includes("alphablend_add")
            ? ShaderFamily.Mixed
            : ShaderFamily.Alpha,
    distortPower: [
      floats._Distortion_Power_X ?? 0,
      floats._Distortion_Power_Y ?? 0,
    ],
    // Shaders spell these flags both ways.
    distortMain: !!(floats._Main_Distortion_Use || floats._Main_Distort_Use),
    distortMask: !!(floats._Mask_Distortion_Use || floats._Mask_Distort_Use),
    customData: floats._Custom_Data_MainMask_Offset_Use
      ? CustomDataUse.MainMaskOffset
      : floats._Custom_Data_Offset_Use || floats._Custom_Data_Main_Offset_Use
        ? CustomDataUse.MainOffset
        : CustomDataUse.None,
  };
}

let emptyTexture: PIXI.Texture | null = null;

// Pixi v7's buffer types predate TypeScript's generic typed arrays.
const gpu = (data: Float32Array | Uint32Array) =>
  data as unknown as PIXI.IArrayBuffer;

/** Draws one effect: a particle system's particles or a mesh. */
class EffectDisplay {
  readonly mesh: PIXI.Mesh<PIXI.Shader>;

  private readonly geometry = new PIXI.Geometry();
  private capacity = 0;
  private positions = new Float32Array();
  private uvs = new Float32Array();
  private colors = new Float32Array();
  private custom = new Float32Array();
  private indices = new Uint32Array();
  private readonly shader: PIXI.Shader;
  private time = 0;

  constructor(material: MaterialSetup) {
    emptyTexture ??= PIXI.Texture.WHITE;

    this.geometry
      .addAttribute(
        "aVertexPosition",
        new PIXI.Buffer(gpu(new Float32Array()), false),
        2,
      )
      .addAttribute(
        "aTextureCoord",
        new PIXI.Buffer(gpu(new Float32Array()), false),
        2,
      )
      .addAttribute(
        "aColor",
        new PIXI.Buffer(gpu(new Float32Array()), false),
        4,
      )
      .addAttribute(
        "aCustom",
        new PIXI.Buffer(gpu(new Float32Array()), false),
        4,
      )
      .addIndex(new PIXI.Buffer(gpu(new Uint32Array()), true, true));

    const tex = (slot: TextureSlot | null) => slot?.texture ?? emptyTexture;

    this.shader = PIXI.Shader.from(VERTEX, FRAGMENT, {
      uMain: tex(material.main),
      uMask: tex(material.mask),
      uDistort: tex(material.distort),
      uMainST: material.main?.st ?? [1, 1, 0, 0],
      uMaskST: material.mask?.st ?? [1, 1, 0, 0],
      uDistortST: material.distort?.st ?? [1, 1, 0, 0],
      uMainSpeed: material.main?.speed ?? [0, 0],
      uMaskSpeed: material.mask?.speed ?? [0, 0],
      uDistortSpeed: material.distort?.speed ?? [0, 0],
      uDistortPower: material.distortPower,
      uTint: material.tint,
      uFamily: material.family,
      uCover: material.cover,
      uMainOpaque: material.main?.opaque ? 1 : 0,
      uMaskOpaque: material.mask?.opaque ? 1 : 0,
      uDissolve: material.dissolve,
      uDissolveSoftness: material.dissolveSoftness,
      // Blur radius for smoke, in texture coordinates (the gaps between the
      // puffs of the 2x2 sheet leave room for about this much).
      uSmokeBlur: 0.2,
      uRedShading: material.redShading ? 1 : 0,
      uTime: 0,
      uVertexAlpha: material.vertexAlpha ? 1 : 0,
      uHasMain: material.main ? 1 : 0,
      uHasMask: material.mask ? 1 : 0,
      uHasDistort: material.distort ? 1 : 0,
      uDistortMain: material.distortMain ? 1 : 0,
      uDistortMask: material.distortMask ? 1 : 0,
      uCustomData: material.customData,
    });

    this.mesh = new PIXI.Mesh(this.geometry, this.shader);
    this.mesh.state.blendMode = PIXI.BLEND_MODES.NORMAL;
    this.mesh.state.culling = false;
  }

  /** Makes room for `vertices` vertices and `indexCount` indices. */
  reserve(vertices: number, indexCount: number) {
    if (vertices > this.capacity || indexCount > this.indices.length) {
      this.capacity = Math.max(vertices, this.capacity * 2, 16);
      this.positions = new Float32Array(this.capacity * 2);
      this.uvs = new Float32Array(this.capacity * 2);
      this.colors = new Float32Array(this.capacity * 4);
      this.custom = new Float32Array(this.capacity * 4);
      this.indices = new Uint32Array(
        Math.max(indexCount, this.indices.length * 2, 24),
      );
    }

    return {
      positions: this.positions,
      uvs: this.uvs,
      colors: this.colors,
      custom: this.custom,
      indices: this.indices,
    };
  }

  commit(vertices: number, indexCount: number, dt: number) {
    this.time += dt;

    this.shader.uniforms.uTime = this.time;

    this.geometry
      .getBuffer("aVertexPosition")
      .update(gpu(this.positions.subarray(0, vertices * 2)));

    this.geometry
      .getBuffer("aTextureCoord")
      .update(gpu(this.uvs.subarray(0, vertices * 2)));

    this.geometry
      .getBuffer("aColor")
      .update(gpu(this.colors.subarray(0, vertices * 4)));

    this.geometry
      .getBuffer("aCustom")
      .update(gpu(this.custom.subarray(0, vertices * 4)));

    this.geometry.getIndex().update(gpu(this.indices.subarray(0, indexCount)));

    this.mesh.visible = indexCount > 0;
  }

  destroy() {
    if (!this.mesh.destroyed) {
      this.mesh.destroy();
    }

    this.geometry.destroy();
  }
}

/** A 2x4 transform: effect space (3D) -> scene, dropping depth. */
type Projection = number[];

/** Maps a direction from effect space to the scene (no translation). */
function linear(
  m: Projection,
  x: number,
  y: number,
  z: number,
): [number, number] {
  return [m[0] * x + m[1] * y + m[2] * z, m[4] * x + m[5] * y + m[6] * z];
}

function project(
  m: Projection,
  x: number,
  y: number,
  z: number,
): [number, number] {
  return [
    m[0] * x + m[1] * y + m[2] * z + m[3],
    m[4] * x + m[5] * y + m[6] * z + m[7],
  ];
}

export type EffectAnchor = { spine: Spine; display: PIXI.Container };

type LiveEffect = {
  effect: MemorialLobbyEffect;
  /** The skeleton the effect is drawn inside of, between its layers; null for the scene. */
  parent: PIXI.Container | null;
  display: EffectDisplay;
  system: ParticleSystem | null;
  mesh: MemorialLobbyMesh | null;
  meshes: MemorialLobbyMesh[];
  active: boolean;
};

/** Plays a lobby's effects. */
export class MemorialLobbyEffectPlayer {
  private readonly live: LiveEffect[] = [];

  /** Timeline switches already applied, as `effect:key`. */
  private readonly switched = new Set<string>();

  private constructor(
    private readonly data: MemorialLobbyEffects,
    private readonly screenHeight: number,
    textures: Map<string, PIXI.Texture>,
  ) {
    const materials = data.materials.map((m) => materialSetup(m, textures));

    const fallback = materialSetup(null, textures);

    for (const effect of data.effects) {
      const material =
        effect.particles?.renderer.material ?? effect.mesh?.material ?? null;

      const system = effect.particles
        ? new ParticleSystem(effect.particles)
        : null;

      this.live.push({
        effect,
        display: new EffectDisplay(
          material === null ? fallback : (materials[material] ?? fallback),
        ),
        system,
        mesh: effect.mesh ? (data.meshes[effect.mesh.mesh] ?? null) : null,
        parent: null,
        meshes: (effect.particles?.renderer.meshes ?? [])
          .map((i) => data.meshes[i])
          .filter((m): m is MemorialLobbyMesh => !!m),
        active: false,
      });
    }
  }

  /**
   * Loads a lobby's effects file and its textures, which are named relative
   * to `baseUrl`. `screenHeight` is the game's screen height in the scene's
   * units, which particle size limits are relative to.
   */
  static async load(url: string, baseUrl: string, screenHeight: number) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status}`);
    }

    const data = (await res.json()) as MemorialLobbyEffects;

    const urlOf = (file: string) =>
      baseUrl + file.split("/").map(encodeURIComponent).join("/");

    const files = new Map<string, boolean>();

    for (const material of data.materials) {
      for (const t of Object.values(material.textures)) {
        files.set(t.texture, !!t.clamp);
      }
    }

    const textures = new Map<string, PIXI.Texture>();

    await Promise.all(
      [...files].map(async ([file, clamp]) => {
        try {
          const image = await new Promise<HTMLImageElement>(
            (resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => resolve(img);
              img.onerror = () => reject(new Error(`Failed to load ${file}`));
              img.src = urlOf(file);
            },
          );

          const base = PIXI.BaseTexture.from(image, {
            alphaMode: PIXI.ALPHA_MODES.NO_PREMULTIPLIED_ALPHA,
            wrapMode: clamp ? PIXI.WRAP_MODES.CLAMP : PIXI.WRAP_MODES.REPEAT,
            mipmap: PIXI.MIPMAP_MODES.ON,
            scaleMode: PIXI.SCALE_MODES.LINEAR,
          });

          textures.set(file, new PIXI.Texture(base));
        } catch {
          // A missing texture leaves its effect untextured.
        }
      }),
    );

    return new MemorialLobbyEffectPlayer(data, screenHeight, textures);
  }

  /** Displays to add to the scene, with their place in the draw order. */
  get displays() {
    return this.live.map((l, index) => ({
      index,
      order: l.effect.order,
      display: l.display.mesh as PIXI.DisplayObject,
    }));
  }

  /** Draws an effect inside a skeleton's container instead of the scene. */
  setParent(index: number, parent: PIXI.Container | null) {
    const live = this.live[index];
    if (live) {
      live.parent = parent;
    }
  }

  /** Shows the effects active from the start and starts their particles. */
  start() {
    this.live.forEach((_, i) => this.setActive(i, this.live[i].effect.active));
  }

  /**
   * Applies the intro timeline's switches up to `time`: effects switched on
   * start over, ones switched off stop at once.
   */
  syncTimeline(time: number) {
    for (const { effect, keys } of this.data.switches) {
      keys.forEach((key, idx) => {
        const id = `${effect}:${idx}`;

        if (key.time <= time && !this.switched.has(id)) {
          this.switched.add(id);
          this.setActive(effect, key.active);
        }
      });
    }
  }

  /** Switches an effect on (restarting its particles) or off. */
  setActive(index: number, active: boolean) {
    const live = this.live[index];
    if (!live) {
      return;
    }

    live.active = active;

    if (active) {
      if (live.system?.ps.playOnAwake) {
        live.system.play();
      }
    } else {
      live.system?.stop();
    }
  }

  update(dt: number, anchorOf: (skeleton: string) => EffectAnchor | null) {
    const screenHeight = this.screenHeight;

    for (const live of this.live) {
      const anchor = anchorOf(live.effect.skeleton);
      const shown = live.active && !!anchor && anchor.display.visible;

      if (!shown || !anchor) {
        live.display.commit(0, 0, dt);
        continue;
      }

      const m = this.projection(live.effect, anchor, live.parent);

      if (live.system) {
        live.system.current = m;
        live.system.update(dt);
        this.drawParticles(live, m, screenHeight, dt);
      } else if (live.mesh) {
        this.drawMesh(live, m, dt);
      }
    }
  }

  /** The effect's space -> scene transform, through its bone or skeleton. */
  private projection(
    effect: MemorialLobbyEffect,
    anchor: EffectAnchor,
    parent: PIXI.Container | null,
  ): Projection {
    // Only the local transform: a Spine's `updateTransform` redraws it.
    anchor.display.transform.updateLocalTransform();

    let s = anchor.display.localTransform.clone();

    // Inside a skeleton's container, coordinates are that container's.
    if (parent) {
      parent.transform.updateLocalTransform();
      s = parent.localTransform.clone().invert().append(s);
    }

    // Bone (or skeleton) → skeleton display coordinates. Spine bones are
    // y down here; effects are placed in y-up Spine coordinates.
    let a = 1;
    let b = 0;
    let c = 0;
    let d = -1;
    let tx = 0;
    let ty = 0;

    const bone = effect.bone
      ? anchor.spine.skeleton.findBone(effect.bone)
      : null;

    if (bone) {
      a = bone.a;
      b = bone.b;
      c = bone.c;
      d = bone.d;
      tx = bone.worldX;
      ty = bone.worldY;
    }

    // x' = a·x + b·y + tx; y' = c·x + d·y + ty, then the display's transform.
    const A = [
      s.a * a + s.c * c,
      s.a * b + s.c * d,
      s.a * tx + s.c * ty + s.tx,
      s.b * a + s.d * c,
      s.b * b + s.d * d,
      s.b * tx + s.d * ty + s.ty,
    ];

    const e = effect.matrix;

    return [
      A[0] * e[0] + A[1] * e[4],
      A[0] * e[1] + A[1] * e[5],
      A[0] * e[2] + A[1] * e[6],
      A[0] * e[3] + A[1] * e[7] + A[2],
      A[3] * e[0] + A[4] * e[4],
      A[3] * e[1] + A[4] * e[5],
      A[3] * e[2] + A[4] * e[6],
      A[3] * e[3] + A[4] * e[7] + A[5],
    ];
  }

  private drawMesh(live: LiveEffect, m: Projection, dt: number) {
    const mesh = live.mesh as MemorialLobbyMesh;
    const count = mesh.positions.length / 3;
    const buf = live.display.reserve(count, mesh.indices.length);

    for (let i = 0; i < count; i++) {
      const [x, y] = project(
        m,
        mesh.positions[i * 3],
        mesh.positions[i * 3 + 1],
        mesh.positions[i * 3 + 2],
      );

      buf.positions[i * 2] = x;
      buf.positions[i * 2 + 1] = y;
      buf.uvs[i * 2] = mesh.uvs[i * 2];
      buf.uvs[i * 2 + 1] = mesh.uvs[i * 2 + 1];

      for (let k = 0; k < 4; k++) {
        buf.colors[i * 4 + k] = mesh.colors ? mesh.colors[i * 4 + k] : 1;
        buf.custom[i * 4 + k] = 0;
      }
    }

    buf.indices.set(mesh.indices);
    live.display.commit(count, mesh.indices.length, dt);
  }

  private drawParticles(
    live: LiveEffect,
    current: Projection,
    screenHeight: number,
    dt: number,
  ) {
    const system = live.system as ParticleSystem;
    const ps = system.ps;
    const renderer = ps.renderer;
    const particles = system.particles;

    const meshes =
      renderer.mode === "mesh" && live.meshes.length > 0 ? live.meshes : null;

    // Billboards seen edge on (`horizontal`) don't show with the game's camera.
    if (renderer.mode === "horizontal" || particles.length === 0) {
      live.display.commit(0, 0, dt);
      return;
    }

    const perParticle = meshes
      ? Math.max(...meshes.map((x) => x.positions.length / 3))
      : 4;

    const perIndices = meshes
      ? Math.max(...meshes.map((x) => x.indices.length))
      : 6;

    const buf = live.display.reserve(
      particles.length * perParticle,
      particles.length * perIndices,
    );

    const sheet = ps.textureSheet;

    let v = 0;
    let n = 0;

    for (const p of particles) {
      const m = p.frozen ?? current;
      const t = Math.min(p.age / p.lifetime, 1);

      // The effect's scale on screen: its longest axis there (an axis turned
      // into the screen shrinks to nothing).
      const scale = Math.max(
        Math.hypot(m[0], m[4]),
        Math.hypot(m[1], m[5]),
        Math.hypot(m[2], m[6]),
      );

      let rx = p.size[0];
      let ry = p.size[1];

      if (ps.size) {
        const f = valueAt(ps.size.x, t, p.random[R.SizeOverLife]);
        rx *= f;
        ry *= ps.size.y ? valueAt(ps.size.y, t, p.random[R.SizeOverLife]) : f;
      }

      // Particles aligned with the effect or the world (`local`, `world`) keep
      // that orientation in 3D; the rest face the camera.
      const aligned =
        renderer.alignment === "local" || renderer.alignment === "world";

      let sx = rx * scale;
      let sy = ry * scale;

      const maxSize = renderer.maxSize * screenHeight;
      if (sx > maxSize) {
        sy *= maxSize / sx;
        sx = maxSize;
      }

      const color = ps.color ? colorAt(ps.color, t, p.random[R.Color]) : null;

      const rgba: Color = color
        ? [
            p.color[0] * color[0],
            p.color[1] * color[1],
            p.color[2] * color[2],
            p.color[3] * color[3],
          ]
        : p.color;

      let custom = [0, 0, 0, 0];

      const stream = ps.customData?.[0];

      if (stream && "vector" in stream) {
        custom = [0, 1, 2, 3].map((k) =>
          stream.vector[k] === undefined
            ? 0
            : valueAt(stream.vector[k], t, p.random[R.Custom]),
        );
      }

      // The texture sheet frame, as a UV rectangle (Unity convention: v up,
      // frame 0 at the top left).
      let u0 = 0;
      let v0 = 0;
      let du = 1;
      let dv = 1;

      if (sheet) {
        const row =
          sheet.row === null
            ? null
            : sheet.row === "random"
              ? Math.floor(p.random[R.Row] * sheet.tilesY)
              : sheet.row;

        const frames =
          row === null ? sheet.tilesX * sheet.tilesY : sheet.tilesX;

        const start = valueAt(sheet.startFrame, t, p.random[R.Frame]);
        const phase = (t * sheet.cycles) % 1;

        const frameValue =
          valueAt(sheet.frame, phase, p.random[R.Frame]) * frames +
          (start >= 1 ? start : start * frames);

        const frame = Math.min(Math.floor(frameValue) % frames, frames - 1);

        const index = row === null ? frame : row * sheet.tilesX + frame;

        const col = index % sheet.tilesX;
        const line = Math.floor(index / sheet.tilesX);

        du = 1 / sheet.tilesX;
        dv = 1 / sheet.tilesY;
        u0 = col * du;
        v0 = 1 - (line + 1) * dv;
      }

      const [cx, cy] = project(m, p.position[0], p.position[1], p.position[2]);
      const first = v;

      // Unity turns particles clockwise as seen by the camera.
      const cos = Math.cos(p.rotation);
      const sin = Math.sin(p.rotation);

      if (meshes) {
        // 3D particles turn around all axes (Unity's z turns clockwise).
        const turn = p.tilt
          ? eulerMatrix([
              (p.tilt[0] * 180) / Math.PI,
              (p.tilt[1] * 180) / Math.PI,
              (-p.rotation * 180) / Math.PI,
            ])
          : null;

        const mesh = meshes[Math.floor(p.random[R.Row] * meshes.length)];
        const count = mesh.positions.length / 3;

        for (let i = 0; i < count; i++) {
          let x: number;
          let y: number;

          if (aligned) {
            const lx = mesh.positions[i * 3] * rx;
            const ly = mesh.positions[i * 3 + 1] * ry;
            const lz = mesh.positions[i * 3 + 2] * rx;

            const turned = turn
              ? transform3(turn, [lx, ly, lz])
              : [lx * cos + ly * sin, ly * cos - lx * sin, lz];

            [x, y] = linear(m, turned[0], turned[1], turned[2]);
          } else {
            const lx = mesh.positions[i * 3] * sx;
            const ly = mesh.positions[i * 3 + 1] * sy;
            x = lx * cos + ly * sin;
            y = lx * sin - ly * cos;
          }

          buf.positions[v * 2] = cx + x;
          buf.positions[v * 2 + 1] = cy + y;
          buf.uvs[v * 2] = u0 + mesh.uvs[i * 2] * du;
          buf.uvs[v * 2 + 1] = v0 + mesh.uvs[i * 2 + 1] * dv;
          buf.colors.set(rgba, v * 4);
          buf.custom.set(custom, v * 4);

          v++;
        }

        for (const index of mesh.indices) {
          buf.indices[n++] = first + index;
        }

        continue;
      }

      // Quad corners: along the particle's axes, in screen space (y down).
      let ax: number;
      let ay: number;
      let bx: number;
      let by: number;

      if (renderer.mode === "stretched") {
        const velocity =
          (p as Particle & { lastVelocity?: Vec3 }).lastVelocity ?? p.velocity;

        const [ex, ey] = project(
          m,
          p.position[0] + velocity[0],
          p.position[1] + velocity[1],
          p.position[2] + velocity[2],
        );

        let dx = ex - cx;
        let dy = ey - cy;

        const speed = Math.hypot(dx, dy);

        if (speed > 0) {
          dx /= speed;
          dy /= speed;
        } else {
          dx = 1;
          dy = 0;
        }

        const length =
          sx * renderer.lengthScale + speed * renderer.velocityScale;

        // The texture's u runs backwards along the velocity, v across it.
        ax = -dx * length;
        ay = -dy * length;
        bx = -dy * sy;
        by = dx * sy;
      } else if (aligned) {
        [ax, ay] = linear(m, cos * rx, -sin * rx, 0);
        [bx, by] = linear(m, sin * ry, cos * ry, 0);
      } else {
        ax = cos * sx;
        ay = sin * sx;
        bx = sin * sy;
        by = -cos * sy;
      }

      const px =
        cx - (ax + bx) / 2 + renderer.pivot[0] * ax - renderer.pivot[1] * bx;
      const py =
        cy - (ay + by) / 2 + renderer.pivot[0] * ay - renderer.pivot[1] * by;

      const corners = [
        [px, py, u0, v0],
        [px + ax, py + ay, u0 + du, v0],
        [px + bx, py + by, u0, v0 + dv],
        [px + ax + bx, py + ay + by, u0 + du, v0 + dv],
      ];

      for (const [x, y, u, w] of corners) {
        buf.positions[v * 2] = x;
        buf.positions[v * 2 + 1] = y;
        buf.uvs[v * 2] = u;
        buf.uvs[v * 2 + 1] = w;
        buf.colors.set(rgba, v * 4);
        buf.custom.set(custom, v * 4);

        v++;
      }

      buf.indices.set(
        [first, first + 1, first + 2, first + 2, first + 1, first + 3],
        n,
      );

      n += 6;
    }

    live.display.commit(v, n, dt);
  }

  destroy() {
    for (const live of this.live) {
      live.display.destroy();
    }
  }
}
