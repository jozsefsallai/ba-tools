import { COMBAT_COLORS, defenseTypeColor } from "@/lib/combat-colors";
import type {
  HexCoord,
  MissionMapCommand,
  MissionMapData,
  MissionMapEvent,
  MissionMapObject,
  MissionMapUnit,
} from "@/lib/game-data/contract";
import { mainArmor } from "./armor";
import { HEX_DIRECTIONS, hexDistance, hexKey } from "./hex";
import { isBoxObject, isStartObject } from "./map-objects";

/**
 * Finds the fewest turns a mission's map can be cleared in by Concentrated
 * Command, and the fewest when the Pyroxene box is picked up on the way.
 *
 * Rules, as the solver plays them:
 * - Echelons are deployed on the start tiles before turn 1 (`FixedStartNN`
 *   tiles are where echelon NN goes; echelons are interchangeable here, so they
 *   count as start tiles). Fewer echelons than allowed may be used.
 * - In the player phase each echelon may move once, to a neighboring tile.
 *   Moving onto an enemy starts a battle, which is always won: the enemy is
 *   defeated and the echelon takes its tile. Two neighboring echelons can swap
 *   places at any time without using a move.
 * - Arriving on a tile uses its object: boxes are picked up and switches toggle
 *   the tiles of their id. Then the map's "arrive" events run.
 * - An echelon standing on a portal may teleport to the linked portal (when
 *   nobody stands there) at any time, without using its move.
 * - When the tile under an echelon disappears or closes, the echelon is moved
 *   to the nearest free start tile.
 * - In the enemy phase enemies act in map order. `Pursuit` enemies step towards
 *   the nearest echelon (by path length, through other enemies but never onto
 *   them), `Guard` enemies attack an echelon next to them, and other enemies
 *   stay put. An enemy that walks into an echelon starts a battle, which the
 *   echelon wins.
 * - The mission is cleared when an `endBattle` win event runs, which is in the
 *   turn the target enemy is defeated, whichever phase that is in.
 * - Teams that fight enemies of a single armor type can bring the one damage
 *   type that beats it, so among equally short routes the solver prefers ones
 *   where each team meets as few armor types as possible.
 * - A team can withdraw from any battle instead of winning it: when it attacks
 *   (using its move) or when it's attacked. It leaves the map for good, the
 *   enemy survives where it stood, and the battle earns no S rank. Enemies stop
 *   chasing a withdrawn team. Routes withdraw only when that saves turns or
 *   earns the box or stars sooner; a route with no teams left can't win.
 */

export type MissionAction =
  | {
      type: "move";
      echelon: number;
      from: HexCoord;
      to: HexCoord;
      /** The enemy defeated on arrival. */
      battle?: number;
      /** The echelon picked up the box (or another reward object). */
      pickup?: boolean;
      /** The switch the echelon toggled. */
      switchId?: number;
    }
  | {
      type: "swap";
      echelon: number;
      other: number;
      from: HexCoord;
      to: HexCoord;
    }
  | {
      /** Through a portal; doesn't use the echelon's move. */
      type: "teleport";
      echelon: number;
      from: HexCoord;
      to: HexCoord;
    }
  | {
      /** The echelon's tile went away, so the game moved it to a start tile. */
      type: "evacuate";
      echelon: number;
      from: HexCoord;
      to: HexCoord;
    }
  | {
      /**
       * The echelon attacks the enemy on `to` and withdraws from the battle: it
       * leaves the map, and the enemy stays.
       */
      type: "withdraw";
      echelon: number;
      from: HexCoord;
      to: HexCoord;
      /** The enemy it withdrew from. */
      enemy: number;
    };

export type EnemyAction = {
  entityId: number;
  from: HexCoord;
  to: HexCoord;
  /** The echelon the enemy attacked (and lost to, unless `withdrawn`). */
  battle?: number;
  /**
   * The attacked echelon withdrew instead of fighting: it left the map, and the
   * enemy stayed on the tile it attacked from.
   */
  withdrawn?: boolean;
  /** Moved by a map event rather than its AI. */
  scripted?: boolean;
};

/** The board at a point of a route. */
export interface MissionSnapshot {
  /** By echelon; null once the echelon has withdrawn. */
  echelons: (HexCoord | null)[];
  enemies: (HexCoord & {
    entityId: number;
  })[];
  /** Map tiles that aren't there (hidden by events). */
  hidden: HexCoord[];
  /** Objects on the map, by entity id. */
  objects: number[];
  /** Switch id → on. */
  switches: Record<number, boolean>;
}

/** One step of a player phase, for playing a turn back. */
export interface MissionSolutionFrame {
  /** The action, and any evacuations it caused. */
  actions: MissionAction[];
  /** The board after them. */
  board: MissionSnapshot;
}

export interface MissionSolutionTurn {
  turn: number;
  /** The board when the player phase begins (after the turn's events). */
  start: MissionSnapshot;
  /**
   * Everything the player's teams did, including evacuations at the start of
   * the turn (already reflected in `start`).
   */
  player: MissionAction[];
  /** What enemies did, including scripted moves at the start of the turn. */
  enemy: EnemyAction[];
  /** Evacuations caused by the enemy phase's events. */
  afterEnemy: MissionAction[];
  /** The player phase, action by action. */
  frames: MissionSolutionFrame[];
  /** The enemy phase alone, and the board after it. */
  enemyPhase: {
    actions: EnemyAction[];
    evacuations: MissionAction[];
    board: MissionSnapshot;
  };
}

export interface MissionSolution {
  turns: number;
  /** Whether the route picks up the box. */
  takesBox: boolean;
  /** Battles fought, which is how many S ranks the route can earn. */
  battles: number;
  /** Teams that withdrew from a battle. */
  withdrawals: number;
  /** Where each echelon is deployed, by echelon. */
  deploy: HexCoord[];
  steps: MissionSolutionTurn[];
  /** The board when the mission is cleared. */
  end: MissionSnapshot;
}

export interface MissionSolutions {
  /** The fewest turns, preferring routes that pick up the box. */
  fastest: MissionSolution | null;
  /** The fewest turns that also pick up the box, when `fastest` doesn't. */
  withBox: MissionSolution | null;
  /**
   * The fewest turns with enough battles for the "Acquire S rank N times" star,
   * when `fastest` has fewer.
   */
  allStars: MissionSolution | null;
  /** The map has a box to pick up. */
  hasBox: boolean;
  /** The search stopped (too many turns or states) before finding a route. */
  exhausted: boolean;
}

export interface SolveMissionOptions {
  echelonCount: number;
  /** Battles needed for the S rank star (`MissionData.starSRanks`). */
  sRanks?: number;
  /** Turns to search up to (12 by default). */
  maxTurns?: number;
  /** Stop after this many distinct states at turn boundaries (200,000 by default). */
  maxStates?: number;
}

interface Tile extends HexCoord {
  index: number;
  neighbors: number[];
}

type MapObject = MissionMapObject & {
  tile: number;
};

/** Unit slot values in the world array, besides a tile index. */
const ABSENT = -1;
const DEAD = -2;

/** An echelon's tile once it has withdrawn. */
const GONE = -1;

/**
 * Everything about a board that changes, besides the echelons, packed into one
 * array so that states are cheap to copy and to key (see `MissionMap` for the
 * layout). Commands waiting on a `wait` are kept beside it.
 */
type World = Int16Array;

interface Pending {
  /** The commands run at the start of this turn's player phase. */
  turn: number;
  commands: MissionMapCommand[];
  /** Where the commands come from, for state keys. */
  key: string;
}

interface State {
  turn: number;
  /** Tile of each echelon. */
  ech: number[];
  /** Armor types (`ARMOR_BITS`) each echelon has fought. */
  armor: number[];
  /** Battles each echelon has fought. */
  fights: number[];
  w: World;
  pending: Pending[];
  /** `worldKey`, once worked out. Swaps share it, since they don't change `w`. */
  key?: string;
}

/** What happened outside the player's own actions, for the route's steps. */
interface Log {
  player: MissionAction[];
  enemy: EnemyAction[];
}

type Trigger =
  | {
      type: "start";
    }
  | {
      type: "arrive";
      tile: number;
    }
  | {
      type: "turn";
      turn: number;
      phase: "player" | "enemy";
    }
  | {
      type: "check";
    };

class MissionMap {
  readonly tiles: Tile[] = [];
  private readonly byKey = new Map<string, number>();
  /** By entity id. */
  readonly units: MissionMapUnit[];
  readonly unitIndex = new Map<number, number>();
  readonly unitTile: number[];
  readonly objects: MapObject[];
  readonly objectIndex = new Map<number, number>();
  /** Object indices by tile. */
  readonly objectsAt: number[][];
  /** For each portal entrance (by object index), the objects it can lead to. */
  readonly portalExits: number[][];
  readonly switchIndex = new Map<number, number>();
  readonly events: MissionMapEvent[];
  readonly battleGoal: number;

  // Layout of `World`.
  readonly UNITS = 0;
  readonly VISIBLE: number;
  readonly OBJECTS: number;
  readonly SWITCHES: number;
  readonly FIRED: number;
  readonly BOX: number;
  readonly WON: number;
  readonly BATTLES: number;
  readonly size: number;

  constructor(map: MissionMapData, battleGoal: number) {
    for (const t of map.tiles) {
      this.addTile(t);
    }

    this.units = [
      ...map.units,
    ].sort((a, b) => a.entityId - b.entityId);

    this.unitTile = this.units.map((u, i) => {
      this.unitIndex.set(u.entityId, i);
      return this.addTile(u);
    });

    this.objects = map.objects.map((o, i) => {
      this.objectIndex.set(o.entityId, i);

      if (o.type === "SwitchToggle" && o.switchId !== undefined) {
        if (!this.switchIndex.has(o.switchId)) {
          this.switchIndex.set(o.switchId, this.switchIndex.size);
        }
      }

      return {
        ...o,
        tile: this.addTile(o),
      };
    });

    for (const o of this.objects) {
      if (
        o.type.startsWith("SwitchMovable") &&
        o.switchId !== undefined &&
        !this.switchIndex.has(o.switchId)
      ) {
        this.switchIndex.set(o.switchId, this.switchIndex.size);
      }
    }

    this.objectsAt = this.tiles.map(() => []);

    this.objects.forEach((o, i) => {
      this.objectsAt[o.tile].push(i);
    });

    this.portalExits = this.objects.map((o, i) => {
      if (o.type !== "Portal" && o.type !== "PortalOneWayEnterance") {
        return [];
      }

      const exitType = o.type === "Portal" ? "Portal" : "PortalOneWayExit";

      return this.objects.flatMap((other, j) =>
        j !== i && other.type === exitType && other.portalId === o.portalId
          ? [
              j,
            ]
          : [],
      );
    });

    for (const tile of this.tiles) {
      for (const d of HEX_DIRECTIONS) {
        const n = this.byKey.get(
          hexKey({
            x: tile.x + d.x,
            y: tile.y + d.y,
          }),
        );

        if (n !== undefined) {
          tile.neighbors.push(n);
        }
      }
    }

    this.events = map.events;
    this.battleGoal = battleGoal;

    this.VISIBLE = this.units.length;
    this.OBJECTS = this.VISIBLE + this.tiles.length;
    this.SWITCHES = this.OBJECTS + this.objects.length;
    this.FIRED = this.SWITCHES + this.switchIndex.size;
    this.BOX = this.FIRED + this.events.length;
    this.WON = this.BOX + 1;
    this.BATTLES = this.BOX + 2;
    this.size = this.BOX + 3;
  }

  private addTile(c: HexCoord) {
    const key = hexKey(c);

    const existing = this.byKey.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const index = this.tiles.length;

    this.tiles.push({
      x: c.x,
      y: c.y,
      index,
      neighbors: [],
    });

    this.byKey.set(key, index);

    return index;
  }

  tileOf(c: HexCoord) {
    return this.byKey.get(hexKey(c));
  }

  coord(tile: number): HexCoord {
    const t = this.tiles[tile];
    return {
      x: t.x,
      y: t.y,
    };
  }

  newWorld(): World {
    const w = new Int16Array(this.size);
    w.fill(ABSENT, this.UNITS, this.VISIBLE);
    w.fill(1, this.VISIBLE, this.OBJECTS);

    // Every switch starts on (see `MissionMapObject.switchOn`).
    for (const o of this.objects) {
      if (o.type === "SwitchToggle" && o.switchId !== undefined) {
        w[this.SWITCHES + (this.switchIndex.get(o.switchId) as number)] =
          o.switchOn === false ? 0 : 1;
      }
    }

    for (const [, i] of this.switchIndex) {
      if (
        !this.objects.some(
          (o) =>
            o.type === "SwitchToggle" &&
            this.switchIndex.get(o.switchId ?? -1) === i,
        )
      ) {
        w[this.SWITCHES + i] = 1;
      }
    }

    return w;
  }

  hasObject(w: World, object: number) {
    return w[this.OBJECTS + object] === 1;
  }

  switchOn(w: World, switchId: number | undefined) {
    const i = this.switchIndex.get(switchId ?? -1);
    return i === undefined ? true : w[this.SWITCHES + i] === 1;
  }

  /** Whether units can stand on the tile now. */
  isOpen(w: World, tile: number) {
    if (w[this.VISIBLE + tile] !== 1) {
      return false;
    }

    for (const i of this.objectsAt[tile]) {
      if (!this.hasObject(w, i)) {
        continue;
      }

      const o = this.objects[i];

      if (o.type === "SwitchMovableWhenToggleOn") {
        if (!this.switchOn(w, o.switchId)) {
          return false;
        }
      } else if (o.type === "SwitchMovableWhenToggleOff") {
        if (this.switchOn(w, o.switchId)) {
          return false;
        }
      }
    }

    return true;
  }

  /** The unit index of the enemy on the tile, or -1. */
  enemyAt(w: World, tile: number, except = -1) {
    for (let i = 0; i < this.units.length; i++) {
      if (i !== except && w[this.UNITS + i] === tile) {
        return i;
      }
    }

    return -1;
  }

  hasBox() {
    return this.objects.some((o) => isBoxObject(o.type));
  }

  defeat(w: World, unit: number) {
    w[this.UNITS + unit] = DEAD;
    w[this.BATTLES] = Math.min(w[this.BATTLES] + 1, this.battleGoal);
  }
}

/** Runs map events for a trigger, and any whose conditions now hold. */
function runEvents(map: MissionMap, st: State, trigger: Trigger, log?: Log) {
  const w = st.w;

  let changed = true;
  let first = true;

  while (changed) {
    changed = false;

    map.events.forEach((event, e) => {
      if (w[map.FIRED + e] === 1 || event.conditions.length === 0) {
        return;
      }

      const holds = event.conditions.every((c) => {
        switch (c.type) {
          case "start":
            return first && trigger.type === "start";
          case "arrive":
            return (
              first &&
              trigger.type === "arrive" &&
              trigger.tile === map.tileOf(c)
            );
          case "turn":
            return (
              first &&
              trigger.type === "turn" &&
              trigger.turn === c.turn &&
              trigger.phase === c.phase
            );
          case "unitsDead":
            return c.entityIds.every((id) => {
              const unit = map.unitIndex.get(id);
              return unit !== undefined && w[map.UNITS + unit] === DEAD;
            });
          default:
            return false;
        }
      });

      if (!holds) {
        return;
      }

      w[map.FIRED + e] = 1;
      runCommands(map, st, event.commands, `${e}`, log);
      changed = true;
    });

    first = false;
  }
}

function runCommands(
  map: MissionMap,
  st: State,
  commands: MissionMapCommand[],
  origin: string,
  log?: Log,
) {
  const w = st.w;

  for (let i = 0; i < commands.length; i++) {
    const c = commands[i];

    switch (c.type) {
      case "spawnUnits":
        for (const id of c.entityIds) {
          const unit = map.unitIndex.get(id);
          if (unit !== undefined && w[map.UNITS + unit] !== DEAD) {
            w[map.UNITS + unit] = map.unitTile[unit];
          }
        }
        break;
      case "spawnObjects":
      case "hideObjects":
        for (const id of c.entityIds) {
          const object = map.objectIndex.get(id);
          if (object !== undefined) {
            w[map.OBJECTS + object] = c.type === "spawnObjects" ? 1 : 0;
          }
        }
        break;
      case "showTiles":
      case "hideTiles":
        for (const t of c.tiles) {
          const tile = map.tileOf(t);
          if (tile !== undefined) {
            w[map.VISIBLE + tile] = c.type === "showTiles" ? 1 : 0;
          }
        }

        evacuate(map, st, log);
        break;
      case "moveUnit": {
        const unit = map.unitIndex.get(c.entityId);
        const to = map.tileOf(c);

        if (unit === undefined || to === undefined) {
          break;
        }

        const from = w[map.UNITS + unit];

        if (from < 0 || map.enemyAt(w, to) >= 0) {
          break;
        }

        const echelon = st.ech.indexOf(to);

        log?.enemy.push({
          entityId: c.entityId,
          from: map.coord(from),
          to: map.coord(to),
          scripted: true,
          ...(echelon >= 0
            ? {
                battle: echelon,
              }
            : {}),
        });

        if (echelon >= 0) {
          st.armor[echelon] |= armorMask(map.units[unit]);
          st.fights[echelon]++;
          map.defeat(w, unit);
        } else {
          w[map.UNITS + unit] = to;
        }

        break;
      }
      case "wait":
        st.pending = [
          ...st.pending,
          {
            turn: st.turn + c.turns,
            commands: commands.slice(i + 1),
            key: `${origin}.${i}`,
          },
        ];
        return;
      case "endBattle":
        if (c.win) {
          w[map.WON] = 1;
        }
        break;
    }
  }
}

/** Moves an echelon onto a neighbouring tile, with everything that follows. */
function moveEchelon(
  map: MissionMap,
  st: State,
  echelon: number,
  to: number,
  log: Log,
): MissionAction {
  const w = st.w;

  const from = st.ech[echelon];

  const action: MissionAction & {
    type: "move";
  } = {
    type: "move",
    echelon,
    from: map.coord(from),
    to: map.coord(to),
  };

  const enemy = map.enemyAt(w, to);
  st.ech[echelon] = to;

  if (enemy >= 0) {
    st.armor[echelon] |= armorMask(map.units[enemy]);
    st.fights[echelon]++;

    map.defeat(w, enemy);
    action.battle = map.units[enemy].entityId;

    runEvents(
      map,
      st,
      {
        type: "check",
      },
      log,
    );

    if (w[map.WON] === 1) {
      return action;
    }
  }

  for (const i of map.objectsAt[to]) {
    if (!map.hasObject(w, i)) {
      continue;
    }

    const o = map.objects[i];

    switch (o.type) {
      case "Parcel":
      case "ParcelOneTimePerAccount":
        w[map.BOX] = 1;
        w[map.OBJECTS + i] = 0;
        action.pickup = true;
        break;
      case "SwitchToggle": {
        const s = map.switchIndex.get(o.switchId ?? -1);
        if (s !== undefined) {
          w[map.SWITCHES + s] = w[map.SWITCHES + s] === 1 ? 0 : 1;
          action.switchId = o.switchId;
          evacuate(map, st, log);
        }

        break;
      }
      default:
        if (o.disposable && (o.type === "Heal" || o.type === "StatBuff")) {
          w[map.OBJECTS + i] = 0;
        }
    }
  }

  runEvents(
    map,
    st,
    {
      type: "arrive",
      tile: to,
    },
    log,
  );

  return action;
}

/** The portal an echelon on `tile` can teleport to, if it's free. */
function portalExit(map: MissionMap, st: State, tile: number) {
  const w = st.w;

  for (const i of map.objectsAt[tile]) {
    if (!map.hasObject(w, i)) {
      continue;
    }

    for (const exit of map.portalExits[i]) {
      const exitTile = map.objects[exit].tile;

      if (
        map.hasObject(w, exit) &&
        !st.ech.includes(exitTile) &&
        map.enemyAt(w, exitTile) < 0 &&
        map.isOpen(w, exitTile)
      ) {
        return exitTile;
      }
    }
  }

  return undefined;
}

/**
 * Moves echelons whose tile is gone (hidden, or closed by a switch) to the
 * nearest free start tile.
 */
function evacuate(map: MissionMap, st: State, log?: Log) {
  const w = st.w;

  st.ech.forEach((tile, echelon) => {
    if (tile === GONE || map.isOpen(w, tile)) {
      return;
    }

    let best: MapObject | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    map.objects.forEach((o, i) => {
      if (
        !map.hasObject(w, i) ||
        !isStartObject(o.type) ||
        !map.isOpen(w, o.tile) ||
        st.ech.includes(o.tile) ||
        map.enemyAt(w, o.tile) >= 0
      ) {
        return;
      }

      const distance = hexDistance(o, map.tiles[tile]);

      if (
        distance < bestDistance ||
        (distance === bestDistance && best && o.tile < best.tile)
      ) {
        best = o;
        bestDistance = distance;
      }
    });

    const to = (best as MapObject | null)?.tile;
    if (to === undefined) {
      return;
    }

    st.ech[echelon] = to;

    log?.player.push({
      type: "evacuate",
      echelon,
      from: map.coord(tile),
      to: map.coord(to),
    });
  });
}

/**
 * Distance from every tile to the nearest echelon, over open tiles. Other enemies
 * don't block the path (a pursuing enemy heads for a team behind its allies),
 * they only can't be stepped on.
 */
function distancesToEchelons(map: MissionMap, st: State) {
  const dist = new Array<number>(map.tiles.length).fill(
    Number.POSITIVE_INFINITY,
  );

  const queue: number[] = [];
  for (const tile of st.ech) {
    if (tile !== GONE) {
      dist[tile] = 0;
      queue.push(tile);
    }
  }

  for (let i = 0; i < queue.length; i++) {
    const tile = queue[i];

    for (const n of map.tiles[tile].neighbors) {
      if (dist[n] !== Number.POSITIVE_INFINITY || !map.isOpen(st.w, n)) {
        continue;
      }

      dist[n] = dist[tile] + 1;
      queue.push(n);
    }
  }

  return dist;
}

/**
 * Plays the enemy phase. Echelons in the `withdraw` bitmask withdraw when an
 * enemy attacks them; the others fight. Returns the echelons that fought, so
 * the caller can try withdrawing them instead.
 */
function enemyPhase(map: MissionMap, st: State, log: Log, withdraw = 0) {
  const w = st.w;
  let fought = 0;

  runEvents(
    map,
    st,
    {
      type: "turn",
      turn: st.turn,
      phase: "enemy",
    },
    log,
  );

  if (w[map.WON] === 1 || st.ech.every((t) => t === GONE)) {
    return fought;
  }

  // Units are sorted by entity id, which is the order enemies act in.
  let dist: number[] | null = null;

  for (let unit = 0; unit < map.units.length; unit++) {
    const start = w[map.UNITS + unit];
    const u = map.units[unit];

    if (start < 0 || u.ai === "None") {
      continue;
    }

    let tile = start;
    let before = start;
    let battle = -1;

    const steps = Math.max(1, u.moveRange);

    for (let step = 0; step < steps; step++) {
      const next = map.tiles[tile].neighbors.filter(
        (n) => map.enemyAt(w, n, unit) < 0 && map.isOpen(w, n),
      );

      const echelonNext = next.find((n) => st.ech.includes(n));

      if (echelonNext !== undefined) {
        before = tile;
        tile = echelonNext;
        battle = st.ech.indexOf(echelonNext);
        break;
      }

      if (u.ai !== "Pursuit") {
        break;
      }

      // Echelons don't move in the enemy phase, so distances only change when an
      // enemy's battle changes the board (handled by resetting `dist`).
      dist ??= distancesToEchelons(map, st);

      const here = dist[tile];
      const closer = next.find(
        (n) => dist?.[n] !== undefined && dist[n] < here,
      );

      if (closer === undefined) {
        break;
      }

      tile = closer;
      w[map.UNITS + unit] = tile;
    }

    if (tile === start && battle < 0) {
      continue;
    }

    const withdrawn = battle >= 0 && ((withdraw >> battle) & 1) === 1;

    log.enemy.push({
      entityId: u.entityId,
      from: map.coord(start),
      to: map.coord(tile),
      ...(battle >= 0
        ? {
            battle,
          }
        : {}),
      ...(withdrawn
        ? {
            withdrawn,
          }
        : {}),
    });

    if (withdrawn) {
      // The team leaves; the enemy stays where it attacked from.
      st.ech[battle] = GONE;
      w[map.UNITS + unit] = before;
      dist = null;

      if (st.ech.every((t) => t === GONE)) {
        return fought;
      }
    } else if (battle >= 0) {
      fought |= 1 << battle;
      st.armor[battle] |= armorMask(u);
      st.fights[battle]++;
      map.defeat(w, unit);

      runEvents(
        map,
        st,
        {
          type: "check",
        },
        log,
      );

      dist = null;

      if (w[map.WON] === 1) {
        return fought;
      }
    } else {
      w[map.UNITS + unit] = tile;
    }
  }

  return fought;
}

// Reads the world's 16-bit values as UTF-16 code units, which is much faster
// than building the string a character at a time. Values never fall in the
// surrogate range, so the decoder keeps them as they are.
const utf16 = new TextDecoder("utf-16le");

function worldKey(st: State) {
  if (st.key === undefined) {
    const key = utf16.decode(st.w);

    st.key =
      st.pending.length === 0
        ? key
        : `${key}|${st.pending.map((p) => `${p.turn}:${p.key}`).join(",")}`;
  }

  return st.key;
}

/**
 * Echelons are interchangeable, so keys ignore which echelon is where. Within a
 * turn, what each has fought is part of the key too (`withArmor`), so the turn
 * keeps the ways of matching teams to armor apart; between turns it isn't, and
 * the board where teams met fewer armor types wins, which keeps the search as
 * small as without armor.
 */
function positionsKey(st: State, acted: number, withArmor = true) {
  return String.fromCharCode(
    ...st.ech
      .map(
        (t, i) =>
          ((t + 1) * 2 + ((acted >> i) & 1)) * 32 +
          (withArmor ? st.armor[i] : 0),
      )
      .sort((a, b) => a - b),
  );
}

/** A unit's main armor as a bit, to track which types a team has fought. */
function armorMask(unit: MissionMapUnit) {
  const color = defenseTypeColor(mainArmor(unit));

  return color ? 1 << COMBAT_COLORS.indexOf(color) : 0;
}

/** How many armor types beyond one the teams have fought, summed over teams. */
function armorSpread(armor: number[]) {
  let spread = 0;

  for (let mask of armor) {
    let types = 0;

    while (mask) {
      types += mask & 1;
      mask >>= 1;
    }

    spread += Math.max(0, types - 1);
  }

  return spread;
}

function snapshot(map: MissionMap, ech: number[], w: World): MissionSnapshot {
  const switches: Record<number, boolean> = {};

  for (const [id, i] of map.switchIndex) {
    switches[id] = w[map.SWITCHES + i] === 1;
  }

  return {
    echelons: ech.map((t) => (t === GONE ? null : map.coord(t))),
    enemies: map.units.flatMap((u, i) =>
      w[map.UNITS + i] >= 0
        ? [
            {
              entityId: u.entityId,
              ...map.coord(w[map.UNITS + i]),
            },
          ]
        : [],
    ),
    hidden: map.tiles
      .filter((t) => w[map.VISIBLE + t.index] !== 1)
      .map((t) => map.coord(t.index)),
    objects: map.objects
      .filter((_, i) => map.hasObject(w, i))
      .map((o) => o.entityId)
      .sort((a, b) => a - b),
    switches,
  };
}

/** The board at the start of a turn, after the turn's own events. */
interface Begin {
  node: Node;
  st: State;
  log: Log;
}

/** A point in a player phase, reached by `action` from `parent`. */
interface Partial {
  st: State;
  acted: number;
  begin: Begin;
  parent: Partial | null;
  actions: MissionAction[];
  /** Actions since the start of the route. */
  count: number;
  /** Withdrawals since the start of the route. */
  withdrawals: number;
}

/** A board between turns. */
interface Node {
  st: State;
  parent: Node | null;
  /** How this node's turn went; null for the deployment. */
  begin: Begin | null;
  partial: Partial | null;
  enemy: EnemyAction[];
  afterEnemy: MissionAction[];
  deploy: number[];
  count: number;
  withdrawals: number;
}

const cloneState = (st: State): State => ({
  turn: st.turn,
  ech: [
    ...st.ech,
  ],
  armor: [
    ...st.armor,
  ],
  fights: [
    ...st.fights,
  ],
  w: st.w.slice(),
  pending: st.pending,
});

/**
 * How unevenly the battles so far fall on the teams: the sum of the squares of
 * each team's battle count (withdrawals aren't battles), so one team taking
 * every fight and losing too much HP counts against a route.
 */
const battleLoad = (st: State) => st.fights.reduce((sum, c) => sum + c * c, 0);

function actionsOf(partial: Partial | null) {
  const chunks: MissionAction[][] = [];

  for (let p = partial; p; p = p.parent) {
    chunks.unshift(p.actions);
  }

  return chunks.flat();
}

/**
 * Every way the player phases of a turn can end, from all the turn's starting
 * boards at once, with the fewest actions to get there. Partial phases already
 * reached from another start aren't explored again.
 */
function playerPhases(map: MissionMap, begins: Begin[]): Partial[] {
  const seen = new Set<string>();
  const ends = new Map<string, Partial>();
  const queue: Partial[] = [];

  const push = (p: Partial) => {
    const key = `${positionsKey(p.st, p.acted)}#${worldKey(p.st)}`;

    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    queue.push(p);
  };

  for (const begin of begins) {
    push({
      st: begin.st,
      acted: 0,
      begin,
      parent: null,
      actions: [],
      count: begin.node.count,
      withdrawals: begin.node.withdrawals,
    });
  }

  for (let q = 0; q < queue.length; q++) {
    const p = queue[q];

    const { st, acted } = p;

    const endKey = `${positionsKey(st, 0)}#${worldKey(st)}`;

    if (!ends.has(endKey)) {
      ends.set(endKey, p);
    }

    if (st.w[map.WON] === 1) {
      continue;
    }

    st.ech.forEach((tile, e) => {
      if (tile === GONE) {
        return;
      }

      const exit = portalExit(map, st, tile);

      if (exit !== undefined) {
        const next = cloneState(st);
        next.ech[e] = exit;

        const log: Log = {
          player: [],
          enemy: [],
        };

        runEvents(
          map,
          next,
          {
            type: "arrive",
            tile: exit,
          },
          log,
        );

        const actions: MissionAction[] = [
          {
            type: "teleport",
            echelon: e,
            from: map.coord(tile),
            to: map.coord(exit),
          },
          ...log.player,
        ];

        push({
          st: next,
          acted,
          begin: p.begin,
          parent: p,
          actions,
          count: p.count + 1,
          withdrawals: p.withdrawals,
        });
      }

      const eActed = (acted >> e) & 1;

      for (const n of map.tiles[tile].neighbors) {
        const other = st.ech.indexOf(n);

        if (other >= 0) {
          // Swapping only matters when it brings an echelon that can still move
          // somewhere else.
          if (eActed === ((acted >> other) & 1)) {
            continue;
          }

          const ech = [
            ...st.ech,
          ];
          ech[e] = n;
          ech[other] = tile;

          push({
            // Swaps don't change the world, so it (and its key) is shared.
            st: {
              ...st,
              ech,
            },
            acted,
            begin: p.begin,
            parent: p,
            actions: [
              {
                type: "swap",
                echelon: e,
                other,
                from: map.coord(tile),
                to: map.coord(n),
              },
            ],
            count: p.count + 1,
            withdrawals: p.withdrawals,
          });

          continue;
        }

        if (eActed || !map.isOpen(st.w, n)) {
          continue;
        }

        const next = cloneState(st);

        const log: Log = {
          player: [],
          enemy: [],
        };

        const action = moveEchelon(map, next, e, n, log);

        push({
          st: next,
          acted: acted | (1 << e),
          begin: p.begin,
          parent: p,
          actions: [
            action,
            ...log.player,
          ],
          count: p.count + 1,
          withdrawals: p.withdrawals,
        });

        // Or attack and withdraw from the battle: the team leaves the map.
        const enemy = map.enemyAt(st.w, n);

        if (enemy >= 0) {
          const gone = cloneState(st);
          gone.ech[e] = GONE;

          if (gone.ech.some((t) => t !== GONE)) {
            push({
              st: gone,
              acted: acted | (1 << e),
              begin: p.begin,
              parent: p,
              actions: [
                {
                  type: "withdraw",
                  echelon: e,
                  from: map.coord(tile),
                  to: map.coord(n),
                  enemy: map.units[enemy].entityId,
                },
              ],
              count: p.count + 1,
              withdrawals: p.withdrawals + 1,
            });
          }
        }
      }
    });
  }

  return [
    ...ends.values(),
  ];
}

function* subsets<T>(items: T[], size: number): Generator<T[]> {
  if (size === 0) {
    yield [];
    return;
  }

  for (let i = 0; i <= items.length - size; i++) {
    for (const rest of subsets(items.slice(i + 1), size - 1)) {
      yield [
        items[i],
        ...rest,
      ];
    }
  }
}

/** The ways echelons can be deployed: fewer echelons first. */
function deployments(map: MissionMap, w: World, count: number): number[][] {
  const tiles = [
    ...new Set(
      map.objects
        .filter((o, i) => map.hasObject(w, i) && isStartObject(o.type))
        .map((o) => o.tile),
    ),
  ];

  const out: number[][] = [];

  for (let size = 1; size <= Math.min(count, tiles.length); size++) {
    for (const subset of subsets(tiles, size)) {
      out.push(subset);
    }
  }

  return out;
}

export interface RouteBattle {
  echelon: number;
  entityId: number;
  /** The team withdrew instead of fighting. */
  withdrawn: boolean;
}

/** A route's battles in order, whether the team attacks or is attacked. */
export function routeBattles(steps: MissionSolutionTurn[]): RouteBattle[] {
  const battles: RouteBattle[] = [];

  for (const step of steps) {
    for (const a of step.player) {
      if (a.type === "move" && a.battle !== undefined) {
        battles.push({
          echelon: a.echelon,
          entityId: a.battle,
          withdrawn: false,
        });
      }

      if (a.type === "withdraw") {
        battles.push({
          echelon: a.echelon,
          entityId: a.enemy,
          withdrawn: true,
        });
      }
    }

    for (const e of step.enemy) {
      if (e.battle !== undefined) {
        battles.push({
          echelon: e.battle,
          entityId: e.entityId,
          withdrawn: Boolean(e.withdrawn),
        });
      }
    }
  }

  return battles;
}

function solution(map: MissionMap, node: Node): MissionSolution {
  const steps: MissionSolutionTurn[] = [];
  let deploy: number[] = [];

  for (let n: Node | null = node; n; n = n.parent) {
    if (n.begin) {
      const frames: MissionSolutionFrame[] = [];

      for (let p = n.partial; p?.parent; p = p.parent) {
        frames.unshift({
          actions: p.actions,
          board: snapshot(map, p.st.ech, p.st.w),
        });
      }

      steps.unshift({
        turn: n.begin.st.turn,
        start: snapshot(map, n.begin.st.ech, n.begin.st.w),
        frames,
        enemyPhase: {
          actions: n.enemy,
          evacuations: n.afterEnemy,
          board: snapshot(map, n.st.ech, n.st.w),
        },
        player: [
          ...n.begin.log.player,
          ...actionsOf(n.partial),
        ],
        enemy: [
          ...n.begin.log.enemy,
          ...n.enemy,
        ],
        afterEnemy: n.afterEnemy,
      });
    }

    deploy = n.deploy;
  }

  const battles = routeBattles(steps);

  return {
    turns: steps.length,
    takesBox: node.st.w[map.BOX] === 1,
    battles: battles.filter((b) => !b.withdrawn).length,
    withdrawals: battles.filter((b) => b.withdrawn).length,
    deploy: deploy.map((t) => map.coord(t)),
    steps,
    end: snapshot(map, node.st.ech, node.st.w),
  };
}

export function solveMission(
  data: MissionMapData,
  options: SolveMissionOptions,
): MissionSolutions {
  const goal = options.sRanks ?? 0;
  const map = new MissionMap(data, goal);
  const maxTurns = options.maxTurns ?? 12;
  const maxStates = options.maxStates ?? 200_000;
  const hasBox = map.hasBox();

  const initial: State = {
    turn: 0,
    ech: [],
    armor: [],
    fights: [],
    w: map.newWorld(),
    pending: [],
  };

  runEvents(map, initial, {
    type: "start",
  });

  let frontier: Node[] = deployments(map, initial.w, options.echelonCount).map(
    (deploy) => ({
      st: {
        turn: 1,
        ech: [
          ...deploy,
        ],
        armor: deploy.map(() => 0),
        fights: deploy.map(() => 0),
        w: initial.w.slice(),
        pending: initial.pending,
      },
      parent: null,
      begin: null,
      partial: null,
      enemy: [],
      afterEnemy: [],
      deploy,
      count: 0,
      withdrawals: 0,
    }),
  );

  const hasStars = (n: Node) => n.st.w[map.BATTLES] >= goal;

  let fastest: Node | null = null;
  let withBox: Node | null = null;
  let allStars: Node | null = null;
  let states = 0;
  let exhausted = false;

  for (let turn = 1; turn <= maxTurns && frontier.length > 0; turn++) {
    const begins: Begin[] = frontier.map((node) => {
      const st = cloneState(node.st);
      st.turn = turn;

      const log: Log = {
        player: [],
        enemy: [],
      };

      const due = st.pending.filter((p) => p.turn <= turn);
      st.pending = st.pending.filter((p) => p.turn > turn);

      for (const p of due) {
        runCommands(map, st, p.commands, p.key, log);
      }

      runEvents(
        map,
        st,
        {
          type: "turn",
          turn,
          phase: "player",
        },
        log,
      );

      return {
        node,
        st,
        log,
      };
    });

    const next = new Map<string, Node>();

    // Between boards that are otherwise the same, keep the one with the fewest
    // withdrawals, then where teams met the fewest armor types, then where the
    // battles are shared most evenly.
    const rank = (n: Node) =>
      n.withdrawals * 1_000_000 +
      armorSpread(n.st.armor) * 1000 +
      battleLoad(n.st);

    const wins: Node[] = [];

    for (const end of playerPhases(map, begins)) {
      // The enemy phase as fought, then with the attacked teams withdrawing
      // instead (in every combination), since that changes what enemies do.
      const tried = new Set<number>();
      const masks = [
        0,
      ];

      for (let m = 0; m < masks.length; m++) {
        const mask = masks[m];
        const st = cloneState(end.st);

        const log: Log = {
          player: [],
          enemy: [],
        };

        let fought = 0;

        if (st.w[map.WON] !== 1) {
          fought = enemyPhase(map, st, log, mask);
        }

        for (let e = 0; e < st.ech.length; e++) {
          const more = mask | (1 << e);

          if ((fought >> e) & 1 && !tried.has(more)) {
            tried.add(more);
            masks.push(more);
          }
        }

        const withdrawals = log.enemy.filter((a) => a.withdrawn).length;

        const child: Node = {
          st,
          parent: end.begin.node,
          begin: end.begin,
          partial: end,
          enemy: log.enemy,
          afterEnemy: log.player,
          deploy: end.begin.node.deploy,
          count: end.count,
          withdrawals: end.withdrawals + withdrawals,
        };

        if (st.w[map.WON] === 1) {
          wins.push(child);
          continue;
        }

        if (st.ech.every((t) => t === GONE)) {
          // Every team withdrew: the mission is lost.
          continue;
        }

        const key = `${positionsKey(st, 0, false)}#${worldKey(st)}`;
        const existing = next.get(key);

        if (!existing || rank(child) < rank(existing)) {
          next.set(key, child);
        }
      }
    }

    // Among routes of the same length, prefer ones that also pick up the box and
    // earn the stars, then ones where each team meets the fewest armor types,
    // then the fewest withdrawals, then battles shared most evenly between the
    // teams (so no team wears down), then the fewest actions.
    const score = (n: Node) =>
      (n.st.w[map.BOX] === 1 ? 0 : 2_000_000) +
      (hasStars(n) ? 0 : 1_000_000) +
      armorSpread(n.st.armor) * 10_000 +
      n.withdrawals * 1000;

    const best = (candidates: Node[]) => {
      let bestNode: Node | null = null;
      let bestRank: number[] = [];

      for (const n of candidates) {
        const rank = [
          score(n),
          battleLoad(n.st),
          n.count,
        ];

        const i = rank.findIndex((v, k) => v !== bestRank[k]);

        if (bestNode === null || (i >= 0 && rank[i] < bestRank[i])) {
          bestNode = n;
          bestRank = rank;
        }
      }

      return bestNode;
    };

    fastest ??= best(wins);

    if (hasBox) {
      withBox ??= best(wins.filter((w) => w.st.w[map.BOX] === 1));
    }

    if (goal > 0) {
      allStars ??= best(wins.filter(hasStars));
    }

    if (fastest && (!hasBox || withBox) && (goal === 0 || allStars)) {
      break;
    }

    states += next.size;
    if (states > maxStates) {
      exhausted = true;
      break;
    }

    frontier = [
      ...next.values(),
    ];
  }

  return {
    fastest: fastest ? solution(map, fastest) : null,
    withBox:
      withBox && fastest && fastest.st.w[map.BOX] !== 1
        ? solution(map, withBox)
        : null,
    allStars:
      allStars && fastest && !hasStars(fastest)
        ? solution(map, allStars)
        : null,
    hasBox,
    exhausted: exhausted || (!fastest && frontier.length > 0),
  };
}
