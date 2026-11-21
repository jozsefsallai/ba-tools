"use client";

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PauseIcon,
  PlayIcon,
  XIcon,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  createContext,
  Fragment,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type BoardTransition,
  MissionBoard,
} from "@/app/[locale]/missions/_components/mission-board";
import {
  attackTypeStyle,
  defenseTypeStyle,
  type TeamBattle,
  teamBattles,
  teamDamageTypes,
} from "@/app/[locale]/missions/_lib/team-damage";
import { useTeamStudents } from "@/app/[locale]/missions/_lib/use-team-students";
import {
  DEFENSE_TYPES,
  getLocalizedStudentNames,
} from "@/app/[locale]/students/_lib/student-display";
import { StudentPicker } from "@/components/common/student-picker";
import { Button } from "@/components/ui/button";
import { useStudents } from "@/hooks/use-students";
import type { MissionMapData, MissionMapUnit } from "@/lib/game-data/contract";
import { mainArmor } from "@/lib/missions/armor";
import { echelonName, hexDirection } from "@/lib/missions/labels";
import type {
  EnemyAction,
  MissionAction,
  MissionSnapshot,
  MissionSolution,
  MissionSolutions,
  MissionSolutionTurn,
} from "@/lib/missions/solver";
import { buildStudentIconUrl } from "@/lib/url";
import { cn } from "@/lib/utils";
import type { AttackType, Student } from "~prisma";

const MOVE_MS = 1400;
const PAUSE_MS = 2200;

const SPEEDS = [
  1,
  2,
  3,
] as const;

type Speed = (typeof SPEEDS)[number];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ROUTE_KINDS = [
  "fastest",
  "withBox",
  "allStars",
] as const satisfies (keyof MissionSolutions)[];

type RouteKind = (typeof ROUTE_KINDS)[number];

type Route = {
  kind: RouteKind;
  solution: MissionSolution;
};

function routesOf(solutions: MissionSolutions): Route[] {
  return ROUTE_KINDS.flatMap((kind) => {
    const solution = solutions[kind];

    return solution
      ? [
          {
            kind,
            solution,
          },
        ]
      : [];
  });
}

const TeamStudents = createContext<
  (echelon: number) => {
    name: string;
    icon: string;
  } | null
>(() => null);

const TeamDamage = createContext<(echelon: number) => AttackType | null>(
  () => null,
);

function TeamName({ echelon }: { echelon: number }) {
  const t = useTranslations();

  const student = useContext(TeamStudents)(echelon);
  const damage = useContext(TeamDamage)(echelon);

  return (
    <span className={cn("font-bold", attackTypeStyle(damage).text)}>
      {student ? (
        <>
          <img
            src={student.icon}
            alt=""
            className="mr-1 inline-block size-4 rounded-sm align-[-0.2em]"
          />

          {t("tools.missions.route.teamWithStudent", {
            team: echelonName(echelon),
            student: student.name,
          })}
        </>
      ) : (
        t("tools.missions.route.team", {
          team: echelonName(echelon),
        })
      )}
    </span>
  );
}

function TeamBattles({ battles }: { battles: TeamBattle[] }) {
  const t = useTranslations();

  const groups: (TeamBattle & {
    count: number;
  })[] = [];

  for (const battle of battles) {
    const group = groups.find(
      (g) =>
        g.armor === battle.armor &&
        g.boss === battle.boss &&
        g.withdrawn === battle.withdrawn,
    );

    if (group) {
      group.count += 1;
    } else {
      groups.push({
        ...battle,
        count: 1,
      });
    }
  }

  return (
    <span className="col-span-3 px-1 pb-1 text-xs">
      <span className="text-muted-foreground">
        {t("tools.missions.teams.battles")}
      </span>{" "}
      {groups.map((g, i) => (
        <Fragment key={i}>
          {i > 0 && ", "}
          {t.rich(
            g.withdrawn
              ? "tools.missions.teams.withdrawal"
              : g.boss
                ? "tools.missions.teams.boss"
                : "tools.missions.teams.enemies",
            {
              count: g.count,
              armor: g.armor ? t(`common.defenseType.${g.armor}`) : "?",
              enemy: (chunks) => (
                <span
                  className={cn(
                    "font-semibold",
                    defenseTypeStyle(g.armor).text,
                  )}
                >
                  {chunks}
                </span>
              ),
            },
          )}
        </Fragment>
      ))}
    </span>
  );
}

function TeamStudentControl({
  echelon,
  student,
  battles,
  onChange,
}: {
  echelon: number;
  student: Student | null;
  battles: TeamBattle[];
  onChange: (studentId: string | null) => void;
}) {
  const t = useTranslations();
  const locale = useLocale();

  const team = echelonName(echelon);
  const damage = useContext(TeamDamage)(echelon);

  const { students } = useStudents();

  const strikers = useMemo(
    () => students.filter((s) => s.combatClass === "Main"),
    [
      students,
    ],
  );

  const name = student ? getLocalizedStudentNames(student, locale).name : null;

  return (
    <div className="contents">
      <span className="flex flex-col px-1 leading-tight">
        <span
          className={cn(
            "whitespace-nowrap text-sm font-bold",
            attackTypeStyle(damage).text,
          )}
        >
          {t("tools.missions.route.team", {
            team,
          })}
        </span>

        <span className="text-muted-foreground whitespace-nowrap text-xs">
          {damage
            ? t(`common.attackType.${damage}`)
            : t("tools.missions.teams.noBattles")}
        </span>
      </span>

      <StudentPicker
        students={strikers}
        onStudentSelected={(picked) => onChange(picked.id)}
        placeholder={t("tools.missions.teams.search")}
      >
        <Button
          variant="outline"
          size="sm"
          className="min-w-0 justify-start gap-2"
          aria-label={t("tools.missions.teams.choose", {
            team,
          })}
        >
          {student ? (
            <>
              <img
                src={buildStudentIconUrl(student)}
                alt=""
                className="size-5 shrink-0 rounded"
              />
              <span className="truncate">{name}</span>
            </>
          ) : (
            <span className="text-muted-foreground truncate">
              {t("tools.missions.teams.none")}
            </span>
          )}
        </Button>
      </StudentPicker>

      <Button
        variant="ghost"
        size="icon"
        className="size-8 shrink-0"
        onClick={() => onChange(null)}
        disabled={!student}
        aria-label={t("tools.missions.teams.remove", {
          team,
        })}
      >
        <XIcon />
      </Button>

      {battles.length > 0 && <TeamBattles battles={battles} />}
    </div>
  );
}

function PlayerStep({
  action,
  map,
}: {
  action: MissionAction;
  map: MissionMapData;
}) {
  const t = useTranslations();

  const direction = hexDirection(action.from, action.to);
  const where = direction ? t(`tools.missions.directions.${direction}`) : "";

  switch (action.type) {
    case "move": {
      const target =
        action.battle === undefined
          ? null
          : map.units.find((u) => u.entityId === action.battle);

      return (
        <>
          <TeamName echelon={action.echelon} />{" "}
          {target
            ? t.rich(
                target.grade === "Boss"
                  ? "tools.missions.route.attackBoss"
                  : "tools.missions.route.attackEnemy",
                {
                  direction: where,
                  enemy: (chunks) => (
                    <EnemyWord unit={target}>{chunks}</EnemyWord>
                  ),
                },
              )
            : t("tools.missions.route.move", {
                direction: where,
              })}
          {action.pickup && ` ${t("tools.missions.route.pickup")}`}
          {action.switchId !== undefined &&
            ` ${t("tools.missions.route.switch")}`}
        </>
      );
    }
    case "swap":
      return (
        <>
          <TeamName echelon={action.echelon} />{" "}
          {t("tools.missions.route.swapWith")}{" "}
          <TeamName echelon={action.other} />
        </>
      );
    case "teleport": {
      const target =
        action.battle === undefined
          ? null
          : map.units.find((u) => u.entityId === action.battle);

      return (
        <>
          <TeamName echelon={action.echelon} />{" "}
          {target
            ? t.rich(
                target.grade === "Boss"
                  ? "tools.missions.route.teleportAttackBoss"
                  : "tools.missions.route.teleportAttackEnemy",
                {
                  enemy: (chunks) => (
                    <EnemyWord unit={target}>{chunks}</EnemyWord>
                  ),
                },
              )
            : t("tools.missions.route.teleport")}
        </>
      );
    }
    case "evacuate":
      return (
        <>
          <TeamName echelon={action.echelon} />{" "}
          {t("tools.missions.route.evacuate")}
        </>
      );
    case "withdraw": {
      const target = map.units.find((u) => u.entityId === action.enemy);
      return (
        <>
          <TeamName echelon={action.echelon} />{" "}
          {t.rich(
            target?.grade === "Boss"
              ? "tools.missions.route.withdrawFromBoss"
              : "tools.missions.route.withdrawFromEnemy",
            {
              direction: where,
              enemy: (chunks) => <EnemyWord unit={target}>{chunks}</EnemyWord>,
            },
          )}
        </>
      );
    }
  }
}

function EnemyWord({
  unit,
  children,
}: PropsWithChildren<{
  unit: MissionMapUnit | undefined;
}>) {
  return (
    <span
      className={cn(
        "font-semibold",
        defenseTypeStyle(unit ? mainArmor(unit) : null).text,
      )}
    >
      {children}
    </span>
  );
}

function EnemyStep({
  action,
  map,
}: {
  action: EnemyAction;
  map: MissionMapData;
}) {
  const t = useTranslations();

  const unit = map.units.find((u) => u.entityId === action.entityId);
  const boss = unit?.grade === "Boss";

  if (action.battle === undefined) {
    return (
      <>
        {t.rich(
          boss
            ? "tools.missions.route.bossMoves"
            : "tools.missions.route.enemyMoves",
          {
            direction: (() => {
              const d = hexDirection(action.from, action.to);
              return d ? t(`tools.missions.directions.${d}`) : "";
            })(),
            enemy: (chunks) => <EnemyWord unit={unit}>{chunks}</EnemyWord>,
          },
        )}
      </>
    );
  }

  return (
    <>
      {t.rich(
        boss
          ? "tools.missions.route.bossAttacks"
          : "tools.missions.route.enemyAttacks",
        {
          enemy: (chunks) => <EnemyWord unit={unit}>{chunks}</EnemyWord>,
        },
      )}{" "}
      <TeamName echelon={action.battle} />
      {action.withdrawn &&
        `, ${t("tools.missions.route.withdrawsWhenAttacked")}`}
    </>
  );
}

export function MissionRoute({
  map,
  solutions,
  challengeTurns,
  starSRanks,
}: {
  map: MissionMapData;
  solutions: MissionSolutions;
  challengeTurns: number | null;
  starSRanks: number;
}) {
  const t = useTranslations();

  const routes = routesOf(solutions);

  const locale = useLocale();

  const { studentMap } = useStudents();

  const [kind, setKind] = useState<RouteKind>("fastest");
  const [position, setPosition] = useState(0);
  const [speed, setSpeed] = useState<Speed>(2);
  const [playing, setPlaying] = useState(false);
  const [transition, setTransition] = useState<BoardTransition | null>(null);
  const [moving, setMoving] = useState(false);
  const transitionId = useRef(0);

  const route = routes.find((r) => r.kind === kind) ?? routes[0];

  const { studentId, setStudent } = useTeamStudents();

  const battles = route ? teamBattles(map, route.solution) : [];
  const damages = teamDamageTypes(battles);

  const teamKey = (echelon: number) => {
    const damage = damages[echelon] ?? "none";

    return {
      damage,
      slot: damages.slice(0, echelon).filter((d) => (d ?? "none") === damage)
        .length,
    };
  };

  const teamStudent = (echelon: number) => {
    const { damage, slot } = teamKey(echelon);
    const id = studentId(damage, slot);
    return id ? (studentMap[id] ?? null) : null;
  };

  const setTeamStudent = (echelon: number, id: string | null) => {
    const { damage, slot } = teamKey(echelon);
    setStudent(damage, slot, id);
  };

  const teamStudentInfo = (echelon: number) => {
    const student = teamStudent(echelon);
    return student
      ? {
          name: getLocalizedStudentNames(student, locale).name,
          icon: buildStudentIconUrl(student),
        }
      : null;
  };

  const frames = useMemo(
    () => (route ? framesOf(route.solution) : []),
    [
      route,
    ],
  );

  const current = Math.min(position, Math.max(frames.length - 1, 0));
  const atEnd = current >= frames.length - 1;

  const advance = () => {
    if (current >= frames.length - 1) {
      return;
    }

    const step = frames[current];
    const duration = prefersReducedMotion() ? 0 : MOVE_MS / speed;

    transitionId.current += 1;

    setTransition({
      marks: {
        player: step.player,
        enemy: step.enemy,
      },
      previous: step.before,
      duration,
      id: transitionId.current,
    });

    setPosition(current + 1);
    setMoving(duration > 0);
  };

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    if (!moving || !transition) {
      return;
    }

    const timer = setTimeout(() => setMoving(false), transition.duration);
    return () => clearTimeout(timer);
  }, [
    moving,
    transition,
  ]);

  useEffect(() => {
    if (!playing || moving) {
      return;
    }

    if (atEnd) {
      setPlaying(false);
      return;
    }

    const timer = setTimeout(() => advanceRef.current(), PAUSE_MS / speed);
    return () => clearTimeout(timer);
  }, [
    playing,
    moving,
    atEnd,
    speed,
    current,
  ]);

  const labels = {
    title: t("tools.missions.map.title"),
    boss: t("tools.missions.map.boss"),
    enemy: t("tools.missions.map.enemy"),
    armor: Object.fromEntries(
      DEFENSE_TYPES.map((type) => [
        type,
        t(`common.defenseType.${type}`),
      ]),
    ),
  };

  const stepsRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const list = stepsRef.current;

    const item = list?.querySelector<HTMLElement>(`[data-frame="${current}"]`);
    if (!list || !item || list.scrollHeight <= list.clientHeight) {
      return;
    }

    const top = item.offsetTop;

    if (
      top < list.scrollTop ||
      top + item.offsetHeight > list.scrollTop + list.clientHeight
    ) {
      list.scrollTo({
        top: Math.max(0, top - list.clientHeight / 3),
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
    }
  }, [
    current,
  ]);

  if (!route) {
    return (
      <div className="flex flex-col gap-4">
        <MissionBoard map={map} snapshot={null} labels={labels} />
        <p className="text-muted-foreground text-sm">
          {t("tools.missions.route.none")}
        </p>
      </div>
    );
  }

  const { solution } = route;
  const frame = frames[current];

  const go = (index: number) => {
    setPlaying(false);
    setMoving(false);
    setTransition(null);
    setPosition(Math.max(0, Math.min(frames.length - 1, index)));
  };

  const togglePlaying = () => {
    if (playing) {
      setPlaying(false);
      return;
    }

    if (atEnd) {
      go(0);
    } else {
      advance();
    }

    setPlaying(true);
  };

  const firstOfTurn = (turnIndex: number) =>
    frames.findIndex((f) => f.turnIndex === turnIndex);

  const frameCount = (turnIndex: number) =>
    frames.filter((f) => f.turnIndex === turnIndex && f.kind === "action")
      .length;

  const shownEnemies = (actions: EnemyAction[]) =>
    actions.filter(
      (e) =>
        e.battle !== undefined ||
        map.units.find((u) => u.entityId === e.entityId)?.grade === "Boss",
    );

  const positionLabel =
    frame.kind === "action"
      ? t("tools.missions.route.position.action", {
          turn: solution.steps[frame.turnIndex].turn,
          step: (frame.actionIndex ?? 0) + 1,
          count: frameCount(frame.turnIndex),
        })
      : frame.kind === "enemy"
        ? t("tools.missions.route.position.enemy", {
            turn: solution.steps[frame.turnIndex].turn,
          })
        : frame.kind === "idle"
          ? t("tools.missions.route.position.idle", {
              turn: solution.steps[frame.turnIndex].turn,
            })
          : t("tools.missions.route.clearedIn", {
              count: solution.turns,
            });

  const lineClass = (index: number) =>
    cn(
      "-mx-1.5 rounded px-1.5 py-0.5 text-left",
      index === current ? "bg-sky-100 dark:bg-sky-900/50" : "hover:bg-muted",
    );

  return (
    <TeamStudents.Provider value={teamStudentInfo}>
      <TeamDamage.Provider value={(echelon) => damages[echelon] ?? null}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex flex-wrap gap-2" role="tablist">
              {routes.map((r) => (
                <button
                  key={r.kind}
                  type="button"
                  role="tab"
                  aria-selected={r.kind === route.kind}
                  onClick={() => {
                    setKind(r.kind);
                    go(0);
                  }}
                  className={cn(
                    "flex items-baseline gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition-colors",
                    r.kind === route.kind
                      ? "border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-100"
                      : "hover:bg-muted",
                  )}
                >
                  <span className="font-medium">
                    {t(`tools.missions.route.kinds.${r.kind}`)}
                  </span>

                  <span className="font-nexon-football-gothic text-base font-bold tabular-nums">
                    {t("tools.missions.turns", {
                      count: r.solution.turns,
                    })}
                  </span>
                </button>
              ))}
            </div>

            <p className="text-muted-foreground text-sm">
              {route.kind === "fastest" &&
                (challengeTurns !== null && solution.turns < challengeTurns
                  ? t("tools.missions.route.notes.fasterThanChallenge", {
                      challenge: challengeTurns,
                    })
                  : t("tools.missions.route.notes.fastest"))}
              {route.kind === "withBox" &&
                t("tools.missions.route.notes.withBox")}
              {route.kind === "allStars" &&
                t("tools.missions.route.notes.allStars", {
                  count: starSRanks,
                })}{" "}
              {t("tools.missions.route.notes.battles", {
                count: solution.battles,
              })}
              {solution.withdrawals > 0 &&
                ` ${t("tools.missions.route.notes.withdrawals", {
                  count: solution.withdrawals,
                })}`}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="flex min-w-0 flex-col rounded-lg border">
              <div className="flex flex-col gap-2 border-b px-3 py-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col" aria-live="polite">
                  <span
                    className={cn(
                      frame.kind === "clear"
                        ? "text-sm font-medium"
                        : "text-muted-foreground text-xs",
                    )}
                  >
                    {positionLabel}
                  </span>

                  <span className="grid">
                    {frames.map((f, index) => (
                      <span
                        key={index}
                        className={cn(
                          "col-start-1 row-start-1 flex flex-wrap gap-x-2 text-sm font-medium",
                          index !== current && "invisible",
                        )}
                        aria-hidden={index !== current}
                      >
                        {f.kind === "idle" && t("tools.missions.route.wait")}

                        {f.kind === "enemy" &&
                          shownEnemies(f.enemy).length === 0 &&
                          f.player.length === 0 &&
                          t("tools.missions.route.enemiesMove")}

                        {f.kind === "enemy" &&
                          shownEnemies(f.enemy).map((e, j) => (
                            <span key={`e${j}`}>
                              <EnemyStep action={e} map={map} />
                            </span>
                          ))}

                        {f.player.map((a, j) => (
                          <span key={`p${j}`}>
                            <PlayerStep action={a} map={map} />
                          </span>
                        ))}
                      </span>
                    ))}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="icon"
                    className="size-7 bg-sky-600 text-white hover:bg-sky-700"
                    onClick={togglePlaying}
                    aria-label={t(
                      playing
                        ? "tools.missions.route.pause"
                        : "tools.missions.route.play",
                    )}
                    aria-pressed={playing}
                  >
                    {playing ? <PauseIcon /> : <PlayIcon />}
                  </Button>

                  <fieldset className="flex items-center gap-1">
                    <legend className="sr-only">
                      {t("tools.missions.route.speed")}
                    </legend>

                    {SPEEDS.map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSpeed(value)}
                        aria-pressed={speed === value}
                        className={cn(
                          "font-nexon-football-gothic h-7 rounded-md border px-2 text-sm font-bold tabular-nums",
                          speed === value
                            ? "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/50 dark:text-sky-200"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {t("tools.missions.route.speedValue", {
                          speed: value,
                        })}
                      </button>
                    ))}
                  </fieldset>
                </div>
              </div>

              <div className="flex min-h-48 flex-1 items-center justify-center bg-white/40 p-1 sm:p-2 lg:min-h-96 dark:bg-slate-950/30">
                <MissionBoard
                  map={map}
                  snapshot={frame.before}
                  marks={
                    moving
                      ? undefined
                      : {
                          player: frame.player,
                          enemy: frame.enemy,
                        }
                  }
                  transition={transition}
                  teamColors={damages.map(
                    (damage) => attackTypeStyle(damage).fill,
                  )}
                  teamIcons={solution.deploy.map((_, echelon) => {
                    const student = teamStudent(echelon);
                    return student ? buildStudentIconUrl(student) : null;
                  })}
                  labels={labels}
                />
              </div>

              <div className="flex items-center gap-2 border-t px-3 py-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => go(current - 1)}
                  disabled={current <= 0}
                  aria-label={t("tools.missions.route.previous")}
                >
                  <ChevronLeftIcon />
                </Button>

                <div className="flex flex-1 flex-wrap justify-center gap-1">
                  {solution.steps.map((s, i) => (
                    <button
                      key={s.turn}
                      type="button"
                      onClick={() => go(firstOfTurn(i))}
                      aria-current={frame.turnIndex === i ? "step" : undefined}
                      aria-label={t("tools.missions.route.turn", {
                        turn: s.turn,
                      })}
                      className={cn(
                        "font-nexon-football-gothic size-9 rounded-md border text-base font-bold tabular-nums",
                        frame.turnIndex === i
                          ? "border-sky-500 bg-sky-500 text-white"
                          : "hover:bg-muted",
                      )}
                    >
                      {s.turn}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => go(frames.length - 1)}
                    aria-current={frame.kind === "clear" ? "step" : undefined}
                    className={cn(
                      "rounded-md border px-3 text-sm font-medium",
                      frame.kind === "clear"
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "hover:bg-muted",
                    )}
                  >
                    {t("tools.missions.route.cleared")}
                  </button>
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setPlaying(false);
                    advance();
                  }}
                  disabled={atEnd}
                  aria-label={t("tools.missions.route.next")}
                >
                  <ChevronRightIcon />
                </Button>
              </div>
            </div>

            <div className="relative min-h-0">
              <div className="flex min-h-0 flex-col gap-3 lg:absolute lg:inset-0">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-1 gap-y-1.5 rounded-lg border p-2">
                  <span className="text-muted-foreground col-span-3 px-1 text-xs">
                    {t("tools.missions.teams.label")}
                  </span>

                  {solution.deploy.map((_, echelon) => (
                    <TeamStudentControl
                      key={echelon}
                      echelon={echelon}
                      student={teamStudent(echelon)}
                      battles={battles[echelon] ?? []}
                      onChange={(id) => setTeamStudent(echelon, id)}
                    />
                  ))}
                </div>

                <ol
                  ref={stepsRef}
                  className="relative min-h-0 flex-1 divide-y rounded-lg border lg:overflow-y-auto"
                >
                  <li className="flex gap-3 px-3 py-2 text-sm">
                    <span className="text-muted-foreground w-14 shrink-0">
                      {t("tools.missions.route.setup")}
                    </span>

                    <span>
                      {t("tools.missions.route.deploy", {
                        count: solution.deploy.length,
                      })}
                    </span>
                  </li>

                  {solution.steps.map((s, i) => {
                    const turnFrames = frames
                      .map((f, index) => ({
                        f,
                        index,
                      }))
                      .filter(({ f }) => f.turnIndex === i);

                    return (
                      <li key={s.turn} className="flex gap-3 px-3 py-2 text-sm">
                        <span className="font-nexon-football-gothic text-muted-foreground w-14 shrink-0 pt-0.5 text-base font-bold">
                          {t("tools.missions.route.turn", {
                            turn: s.turn,
                          })}
                        </span>

                        <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                          {startEvacuations(s).map((a, j) => (
                            <span key={`s${j}`} className="px-1.5 py-0.5">
                              <PlayerStep action={a} map={map} />
                            </span>
                          ))}

                          {turnFrames.map(({ f, index }) => {
                            if (f.kind === "idle") {
                              return (
                                <button
                                  key={index}
                                  type="button"
                                  data-frame={index}
                                  onClick={() => go(index)}
                                  className={cn(
                                    lineClass(index),
                                    "text-muted-foreground",
                                  )}
                                >
                                  {t("tools.missions.route.wait")}
                                </button>
                              );
                            }

                            if (f.kind === "enemy") {
                              const enemies = shownEnemies(f.enemy);
                              if (
                                enemies.length === 0 &&
                                f.player.length === 0
                              ) {
                                return null;
                              }

                              return (
                                <button
                                  key={index}
                                  type="button"
                                  data-frame={index}
                                  onClick={() => go(index)}
                                  className={cn(
                                    lineClass(index),
                                    "flex flex-col",
                                  )}
                                >
                                  {enemies.map((e, j) => (
                                    <span key={`e${j}`}>
                                      <EnemyStep action={e} map={map} />
                                    </span>
                                  ))}

                                  {f.player.map((a, j) => (
                                    <span key={`a${j}`}>
                                      <PlayerStep action={a} map={map} />
                                    </span>
                                  ))}
                                </button>
                              );
                            }

                            return (
                              <button
                                key={index}
                                type="button"
                                data-frame={index}
                                onClick={() => go(index)}
                                className={cn(
                                  lineClass(index),
                                  "flex flex-col",
                                )}
                              >
                                {f.player.map((a, j) => (
                                  <span key={j}>
                                    <PlayerStep action={a} map={map} />
                                  </span>
                                ))}
                              </button>
                            );
                          })}
                        </span>
                      </li>
                    );
                  })}

                  <li
                    className={cn(
                      "flex gap-3 px-3 py-2 text-sm font-medium",
                      frame.kind === "clear" &&
                        "bg-sky-50/80 dark:bg-sky-950/30",
                    )}
                    data-frame={frames.length - 1}
                  >
                    <span className="w-14 shrink-0" />
                    {t("tools.missions.route.clearedIn", {
                      count: solution.turns,
                    })}
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </TeamDamage.Provider>
    </TeamStudents.Provider>
  );
}

type Frame = {
  turnIndex: number;
  kind: "action" | "enemy" | "idle" | "clear";
  actionIndex?: number;
  before: MissionSnapshot;
  player: MissionAction[];
  enemy: EnemyAction[];
};

function startEvacuations(step: MissionSolutionTurn) {
  const inFrames = (step.frames ?? []).reduce(
    (n, f) => n + f.actions.length,
    0,
  );

  return step.frames ? step.player.slice(0, step.player.length - inFrames) : [];
}

function framesOf(solution: MissionSolution): Frame[] {
  const frames: Frame[] = [];

  solution.steps.forEach((step, turnIndex) => {
    if (!step.frames || !step.enemyPhase) {
      frames.push({
        turnIndex,
        kind: "action",
        actionIndex: 0,
        before: step.start,
        player: step.player,
        enemy: step.enemy,
      });

      return;
    }

    let board = step.start;

    step.frames.forEach((f, actionIndex) => {
      frames.push({
        turnIndex,
        kind: "action",
        actionIndex,
        before: board,
        player: f.actions,
        enemy: [],
      });

      board = f.board;
    });

    const { actions, evacuations } = step.enemyPhase;

    if (actions.length > 0 || evacuations.length > 0) {
      frames.push({
        turnIndex,
        kind: "enemy",
        before: board,
        player: evacuations,
        enemy: actions,
      });
    } else if (step.frames.length === 0) {
      frames.push({
        turnIndex,
        kind: "idle",
        before: board,
        player: [],
        enemy: [],
      });
    }
  });

  frames.push({
    turnIndex: solution.steps.length,
    kind: "clear",
    before: solution.end,
    player: [],
    enemy: [],
  });

  return frames;
}
