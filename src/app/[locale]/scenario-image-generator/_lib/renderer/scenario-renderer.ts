import {
  SCENARIO_LINE_HEIGHT,
  SCENARIO_LINE_WIDTH,
  SCENARIO_VIEW_HEIGHT,
  SCENARIO_VIEW_WIDTH,
} from "@/app/[locale]/scenario-image-generator/_lib/constants";
import {
  type ScenarioState,
  selectBackground,
} from "@/app/[locale]/scenario-image-generator/_lib/store";
import type { ScenarioCharacterData } from "@/app/[locale]/scenario-image-generator/_lib/types";
import { AdjustmentFilter, CRTFilter, ColorOverlayFilter } from "pixi-filters";
import {
  Application,
  Assets,
  CanvasTextMetrics,
  Container,
  type Filter,
  Graphics,
  Sprite,
  Text,
  TextStyle,
  Texture,
  type Ticker,
} from "pixi.js";

const TEXT_X = (SCENARIO_VIEW_WIDTH - SCENARIO_LINE_WIDTH) / 2;

const CHARACTER_BASE_X = SCENARIO_VIEW_WIDTH / 2;
const CHARACTER_BASE_Y = 50;

const GRADIENT_HEIGHT = 410;

const TRIANGLE_MAX_DISTANCE = 10;
const TRIANGLE_SPEED = 0.7;
const TRIANGLE_IDLE_MS = 800;

let fontsPromise: Promise<void> | null = null;

function loadScenarioFonts(): Promise<void> {
  if (!fontsPromise) {
    fontsPromise = (async () => {
      Assets.addBundle("scenario-fonts", [
        {
          alias: "Noto Sans",
          src: "/assets/fonts/noto-sans/NotoSans-Regular.ttf",
          data: {
            family: "Noto Sans",
          },
        },
        {
          alias: "GyeonggiTitle",
          src: "/assets/fonts/gyeonggi/Gyeonggi-Medium.woff",
          data: {
            family: "GyeonggiTitle",
          },
        },
        {
          alias: "ShinMGoUpr",
          src: "/assets/fonts/shinmgoupr/U-OTF-ShinMGoUpr-Medium.otf",
          data: {
            family: "ShinMGoUpr",
          },
        },
      ]);

      await Assets.loadBundle("scenario-fonts");
    })();
  }

  return fontsPromise;
}

function createGradientTexture(): Texture {
  const canvas = document.createElement("canvas");
  canvas.width = SCENARIO_VIEW_WIDTH;
  canvas.height = GRADIENT_HEIGHT;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  const gradient = ctx.createLinearGradient(0, 0, 0, GRADIENT_HEIGHT);
  gradient.addColorStop(0, "rgba(17, 37, 54, 0)");
  gradient.addColorStop(0.33, "rgba(17, 37, 54, 0.75)");
  gradient.addColorStop(0.55, "rgba(17, 37, 54, 0.86)");
  gradient.addColorStop(1, "rgba(17, 37, 54, 0.86)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SCENARIO_VIEW_WIDTH, GRADIENT_HEIGHT);

  return Texture.from(canvas);
}

function buildCharacterFilters(character: ScenarioCharacterData): Filter[] {
  const filters: Filter[] = [];

  if (character.silhouette) {
    filters.push(
      new ColorOverlayFilter({
        color: character.silhouetteColor ?? 0x000000,
        alpha: 1,
      }),
    );
  }

  if (character.darken) {
    filters.push(new ColorOverlayFilter({ color: 0x000000, alpha: 0.33 }));
  }

  if (character.hologram) {
    filters.push(
      new ColorOverlayFilter({ color: 0x71c5ff, alpha: 0.35 }),
      new AdjustmentFilter({
        contrast: 1.1,
        saturation: 0.6,
        brightness: 1.1,
        gamma: 0.8,
      }),
      new CRTFilter({
        lineWidth: 3.6,
        vignetting: 0,
        lineContrast: 0.15,
      }),
    );
  }

  return filters;
}

function revealText(lines: string[], charsToShow: number): string {
  let shown = 0;
  let result = "";

  for (const line of lines) {
    if (shown >= charsToShow) {
      break;
    }

    const remaining = charsToShow - shown;

    if (line.length <= remaining) {
      result += `${line}\n`;
      shown += line.length;
    } else {
      result += line.slice(0, remaining);
      shown += remaining;
      break;
    }
  }

  return result;
}

type CharacterSlot = {
  sprite: Sprite;
  character: ScenarioCharacterData | null;
  spriteUrl: string | null;
  filterKey: string;
  loadToken: number;
};

type ActiveTween = {
  elapsed: number;
  duration: number;
  apply: (progress: number) => void;
  resolve: () => void;
};

export class ScenarioRenderer {
  private readonly app: Application;

  private lastState: ScenarioState | null = null;

  private sceneBackground: Graphics;
  private backgroundSprite: Sprite;
  private backgroundUrl: string | null = null;
  private backgroundLoadToken = 0;

  private characterLayer: Container;
  private characterSlots: CharacterSlot[] = [];

  private gradientSprite: Sprite;
  private buttonsSprite: Sprite;
  private triangleSprite: Sprite;
  private lineGraphics: Graphics;
  private nameText: Text;
  private affiliationText: Text;
  private dialogueText: Text;
  private fadeOverlay: Graphics;

  private readonly triangleTexture: Texture;
  private readonly buttonsAutoOnTexture: Texture;
  private readonly buttonsAutoOffTexture: Texture;

  private typewriter = {
    active: false,
    progress: 0,
    lines: [] as string[],
    length: 0,
    complete: true,
  };
  private typewriterKey: string | null = null;

  private triangleYOffset = 0;
  private triangleDirection = 1; // 1 = down, -1 = up
  private triangleIdleCounter = 0;

  private tweens: ActiveTween[] = [];
  private dialogueWaiters: (() => void)[] = [];
  private clickWaitCancels = new Set<() => void>();

  static async create(host: HTMLElement): Promise<ScenarioRenderer> {
    const app = new Application();

    // The WebGL context's alpha flag is fixed at creation time based on the
    // background alpha, so always create a transparent context. The opaque
    // black backdrop is drawn as a stage rect instead (see sceneBackground),
    // which lets the transparent-background toggle work at runtime.
    await app.init({
      width: SCENARIO_VIEW_WIDTH,
      height: SCENARIO_VIEW_HEIGHT,
      backgroundColor: 0x000000,
      backgroundAlpha: 0,
    });

    const [, triangleTexture, buttonsAutoOnTexture, buttonsAutoOffTexture] =
      await Promise.all([
        loadScenarioFonts(),
        Assets.load<Texture>(
          "/assets/ui/scenario-viewer/scennario-triangle.png",
        ),
        Assets.load<Texture>("/assets/ui/scenario-viewer/buttons_auto_on.png"),
        Assets.load<Texture>("/assets/ui/scenario-viewer/buttons_auto_off.png"),
      ]);

    const renderer = new ScenarioRenderer(
      app,
      triangleTexture,
      buttonsAutoOnTexture,
      buttonsAutoOffTexture,
    );

    host.appendChild(app.canvas);

    return renderer;
  }

  private constructor(
    app: Application,
    triangleTexture: Texture,
    buttonsAutoOnTexture: Texture,
    buttonsAutoOffTexture: Texture,
  ) {
    this.app = app;
    this.triangleTexture = triangleTexture;
    this.buttonsAutoOnTexture = buttonsAutoOnTexture;
    this.buttonsAutoOffTexture = buttonsAutoOffTexture;

    this.sceneBackground = new Graphics();
    this.sceneBackground
      .rect(0, 0, SCENARIO_VIEW_WIDTH, SCENARIO_VIEW_HEIGHT)
      .fill(0x000000);

    this.backgroundSprite = new Sprite(Texture.EMPTY);
    this.backgroundSprite.visible = false;

    this.characterLayer = new Container();

    this.gradientSprite = new Sprite(createGradientTexture());
    this.gradientSprite.width = SCENARIO_VIEW_WIDTH;
    this.gradientSprite.height = GRADIENT_HEIGHT;
    this.gradientSprite.x = 0;
    this.gradientSprite.y = SCENARIO_VIEW_HEIGHT - GRADIENT_HEIGHT;

    this.buttonsSprite = new Sprite(buttonsAutoOffTexture);
    this.buttonsSprite.y = 25;

    this.triangleSprite = new Sprite(triangleTexture);
    this.triangleSprite.x = SCENARIO_VIEW_WIDTH - 133 - triangleTexture.width;
    this.triangleSprite.y = SCENARIO_VIEW_HEIGHT - 64 - triangleTexture.height;

    this.lineGraphics = new Graphics();
    this.lineGraphics
      .moveTo(TEXT_X, 844)
      .lineTo(TEXT_X + SCENARIO_LINE_WIDTH, 844)
      .stroke({
        color: 0xffffff,
        width: SCENARIO_LINE_HEIGHT,
        alpha: 0.5,
      });

    this.nameText = new Text({
      text: "",
      x: TEXT_X,
      y: 765,
      style: new TextStyle({
        fontFamily: "Noto Sans",
        fontSize: 57,
        fontWeight: "700",
        fill: "#ffffff",
        align: "left",
        stroke: {
          width: 4,
          color: "#2b435b",
        },
      }),
    });

    this.affiliationText = new Text({
      text: "",
      x: TEXT_X,
      y: 781,
      style: new TextStyle({
        fontFamily: "Noto Sans",
        fontSize: 41,
        fontWeight: "700",
        letterSpacing: -0.4,
        fill: "#7accf9",
        align: "left",
        stroke: {
          width: 4,
          color: "#2b435b",
        },
      }),
    });

    this.dialogueText = new Text({
      text: "",
      x: TEXT_X + 4,
      y: 861,
      style: new TextStyle({
        fontFamily: "Noto Sans",
        fontSize: 41,
        fill: "#ffffff",
        align: "left",
        letterSpacing: 0.4,
        lineHeight: 1.4 * 41,
        stroke: {
          width: 4,
          color: "#2b435b",
        },
        wordWrap: true,
        wordWrapWidth: SCENARIO_LINE_WIDTH,
      }),
    });

    this.fadeOverlay = new Graphics();
    this.fadeOverlay
      .rect(0, 0, SCENARIO_VIEW_WIDTH, SCENARIO_VIEW_HEIGHT)
      .fill(0x000000);
    this.fadeOverlay.alpha = 0;

    this.app.stage.addChild(
      this.sceneBackground,
      this.backgroundSprite,
      this.characterLayer,
      this.gradientSprite,
      this.buttonsSprite,
      this.triangleSprite,
      this.lineGraphics,
      this.nameText,
      this.affiliationText,
      this.dialogueText,
      this.fadeOverlay,
    );

    this.app.ticker.add(this.tick, this);
  }

  get canvas(): HTMLCanvasElement {
    return this.app.canvas;
  }

  destroy(): void {
    this.app.ticker.remove(this.tick, this);
    this.cancelWaits();
    this.cancelTweens(false);
    this.app.destroy(true, { children: true });
  }

  renderToCanvas(): HTMLCanvasElement {
    this.app.render();
    return this.app.canvas;
  }

  /**
   * Applies the given scenario state to the Pixi scene graph. Called from a
   * store subscription. NEVER call this from react renders.
   */
  sync(state: ScenarioState): void {
    this.lastState = state;

    this.sceneBackground.visible = !state.transparentBackground;

    this.syncBackground(state);
    this.syncCharacters(state.characters);

    const hasContent = state.content.length > 0;

    this.gradientSprite.visible = hasContent && state.displayGradient;
    this.lineGraphics.visible = hasContent && state.displayLine;

    this.buttonsSprite.visible = state.displayButtons;
    const buttonsTexture = state.autoEnabled
      ? this.buttonsAutoOnTexture
      : this.buttonsAutoOffTexture;
    if (this.buttonsSprite.texture !== buttonsTexture) {
      this.buttonsSprite.texture = buttonsTexture;
    }
    this.buttonsSprite.x = SCENARIO_VIEW_WIDTH - 20 - buttonsTexture.width;

    const showName = hasContent && state.name.length > 0;
    this.nameText.visible = showName;
    this.nameText.style.fontFamily = state.font.family;
    this.nameText.text = state.name;
    this.nameText.y = state.font.nameY ?? 765;

    const showAffiliation = showName && state.affiliation.length > 0;
    this.affiliationText.visible = showAffiliation;
    this.affiliationText.style.fontFamily = state.font.family;
    this.affiliationText.text = state.affiliation;
    this.affiliationText.x = TEXT_X + this.nameText.width + 13;
    this.affiliationText.y = state.font.affiliationY ?? 781;

    this.dialogueText.visible = hasContent;
    this.dialogueText.style.fontFamily = state.font.family;
    this.dialogueText.style.fontSize = state.fontSize;
    this.dialogueText.style.lineHeight = 1.4 * state.fontSize;
    this.syncTypewriter(state);

    if (!state.animate) {
      this.triangleYOffset = 0;
      this.triangleDirection = 1;
      this.triangleIdleCounter = 0;
      this.triangleSprite.y =
        SCENARIO_VIEW_HEIGHT - 64 - this.triangleTexture.height;
    }

    this.updateTriangleVisibility();
  }

  private syncBackground(state: ScenarioState): void {
    const url = selectBackground(state);

    this.backgroundSprite.visible = !!url;

    if (url !== this.backgroundUrl) {
      this.backgroundUrl = url;
      const token = ++this.backgroundLoadToken;

      if (!url) {
        this.backgroundSprite.texture = Texture.EMPTY;
      } else {
        Assets.load<Texture>(url)
          .then((texture) => {
            if (this.backgroundLoadToken !== token || !texture) {
              return;
            }

            this.backgroundSprite.texture = texture;
            this.layoutBackground();
          })
          .catch(() => {
            if (this.backgroundLoadToken !== token) {
              return;
            }

            this.backgroundSprite.texture = Texture.EMPTY;
            this.layoutBackground();
          });
      }
    }

    this.layoutBackground();
  }

  private layoutBackground(): void {
    const state = this.lastState;
    if (!state) {
      return;
    }

    const texture = this.backgroundSprite.texture;

    if (texture === Texture.EMPTY) {
      this.backgroundSprite.x = state.backgroundXOffset;
      this.backgroundSprite.y = state.backgroundYOffset;
      this.backgroundSprite.width = SCENARIO_VIEW_WIDTH;
      this.backgroundSprite.height = SCENARIO_VIEW_HEIGHT;
      return;
    }

    const scale = state.backgroundScale;
    const aspectRatio = texture.width / texture.height;
    const isWider = aspectRatio > SCENARIO_VIEW_WIDTH / SCENARIO_VIEW_HEIGHT;

    const baseScaledWidth = SCENARIO_VIEW_HEIGHT * aspectRatio;
    const baseScaledHeight = SCENARIO_VIEW_WIDTH / aspectRatio;

    const scaledWidth = isWider
      ? baseScaledWidth * scale
      : SCENARIO_VIEW_WIDTH * scale;
    const scaledHeight = isWider
      ? SCENARIO_VIEW_HEIGHT * scale
      : baseScaledHeight * scale;

    this.backgroundSprite.x =
      (SCENARIO_VIEW_WIDTH - scaledWidth) / 2 + state.backgroundXOffset;
    this.backgroundSprite.y =
      (SCENARIO_VIEW_HEIGHT - scaledHeight) / 2 + state.backgroundYOffset;
    this.backgroundSprite.width = scaledWidth;
    this.backgroundSprite.height = scaledHeight;
  }

  private syncCharacters(characters: ScenarioCharacterData[]): void {
    while (this.characterSlots.length > characters.length) {
      const slot = this.characterSlots.pop();
      slot?.sprite.destroy();
    }

    while (this.characterSlots.length < characters.length) {
      const sprite = new Sprite(Texture.EMPTY);
      sprite.anchor.set(0.5, 0);
      this.characterLayer.addChild(sprite);
      this.characterSlots.push({
        sprite,
        character: null,
        spriteUrl: null,
        filterKey: "",
        loadToken: 0,
      });
    }

    characters.forEach((character, index) => {
      const slot = this.characterSlots[index];
      slot.character = character;

      if (slot.spriteUrl !== character.spriteUrl) {
        slot.spriteUrl = character.spriteUrl;
        const token = ++slot.loadToken;

        if (!character.spriteUrl) {
          slot.sprite.texture = Texture.EMPTY;
        } else {
          Assets.load<Texture>(character.spriteUrl)
            .then((texture) => {
              if (slot.loadToken !== token || !texture) {
                return;
              }

              slot.sprite.texture = texture;
              this.layoutCharacter(slot);
            })
            .catch(() => {
              if (slot.loadToken !== token) {
                return;
              }

              slot.sprite.texture = Texture.EMPTY;
              this.layoutCharacter(slot);
            });
        }
      }

      const filterKey = [
        character.darken ? 1 : 0,
        character.hologram ? 1 : 0,
        character.silhouette ? 1 : 0,
        character.silhouetteColor ?? 0,
      ].join("|");

      if (slot.filterKey !== filterKey) {
        slot.filterKey = filterKey;
        slot.sprite.filters = buildCharacterFilters(character);
      }

      this.layoutCharacter(slot);
    });
  }

  private layoutCharacter(slot: CharacterSlot): void {
    const character = slot.character;
    if (!character) {
      return;
    }

    slot.sprite.x = CHARACTER_BASE_X + character.x;
    slot.sprite.y = CHARACTER_BASE_Y + character.y;

    const texture = slot.sprite.texture;

    if (texture === Texture.EMPTY) {
      slot.sprite.width = 0;
      slot.sprite.height = 0;
    } else {
      slot.sprite.width = texture.width * character.scale;
      slot.sprite.height = texture.height * character.scale;
    }
  }

  private syncTypewriter(state: ScenarioState): void {
    const key = [
      state.content,
      state.fontSize,
      state.font.family,
      state.animate,
    ].join("\u0000");

    if (key === this.typewriterKey) {
      return;
    }

    this.typewriterKey = key;

    if (!state.animate) {
      this.typewriter = {
        active: false,
        progress: 0,
        lines: [],
        length: state.content.length,
        complete: true,
      };
      this.dialogueText.text = state.content;
      this.notifyDialogueComplete();
      return;
    }

    const style = new TextStyle({
      fontFamily: state.font.family,
      fontSize: state.fontSize,
      wordWrap: true,
      wordWrapWidth: SCENARIO_LINE_WIDTH,
      letterSpacing: 0.4,
      lineHeight: 1.4 * state.fontSize,
    });

    const metrics = CanvasTextMetrics.measureText(state.content, style);

    this.typewriter = {
      active: true,
      progress: 0,
      lines: metrics.lines,
      length: state.content.length,
      complete: state.content.length === 0,
    };
    this.dialogueText.text = "";

    if (this.typewriter.complete) {
      this.notifyDialogueComplete();
    }
  }

  private updateTriangleVisibility(): void {
    const state = this.lastState;
    if (!state) {
      return;
    }

    this.triangleSprite.visible =
      state.content.length > 0 &&
      state.displayTriangle &&
      (!state.animate || this.typewriter.complete);
  }

  private tick(ticker: Ticker): void {
    const state = this.lastState;
    if (!state) {
      return;
    }

    // typewriter
    const typewriter = this.typewriter;
    if (typewriter.active && !typewriter.complete) {
      typewriter.progress = Math.min(
        typewriter.progress + ticker.deltaTime * state.scrollSpeed,
        typewriter.length,
      );
      this.dialogueText.text = revealText(
        typewriter.lines,
        Math.floor(typewriter.progress),
      );

      if (typewriter.progress >= typewriter.length) {
        typewriter.complete = true;
        this.notifyDialogueComplete();
      }

      this.updateTriangleVisibility();
    }

    // triangle bob
    if (state.animate) {
      if (this.triangleYOffset >= TRIANGLE_MAX_DISTANCE) {
        this.triangleDirection = -1;
      } else if (this.triangleYOffset <= 0) {
        this.triangleDirection = 1;
      }

      if (
        this.triangleDirection === 1 &&
        this.triangleYOffset <= 0 &&
        this.triangleIdleCounter < TRIANGLE_IDLE_MS
      ) {
        this.triangleIdleCounter += ticker.deltaMS;
      } else {
        this.triangleIdleCounter = 0;
        this.triangleYOffset +=
          this.triangleDirection * ticker.deltaTime * TRIANGLE_SPEED;
      }

      this.triangleSprite.y =
        SCENARIO_VIEW_HEIGHT -
        64 -
        this.triangleTexture.height +
        this.triangleYOffset;
    }

    // tweens
    if (this.tweens.length > 0) {
      const finished: ActiveTween[] = [];

      for (const tween of this.tweens) {
        tween.elapsed += ticker.deltaMS;
        const progress =
          tween.duration <= 0 ? 1 : Math.min(1, tween.elapsed / tween.duration);
        tween.apply(progress);

        if (progress >= 1) {
          finished.push(tween);
        }
      }

      if (finished.length > 0) {
        this.tweens = this.tweens.filter((t) => !finished.includes(t));
        for (const tween of finished) {
          tween.resolve();
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // Script playback primitives (tweens and waits)
  // ---------------------------------------------------------------------

  private tween(
    durationMs: number,
    apply: (progress: number) => void,
  ): Promise<void> {
    return new Promise<void>((resolve) => {
      if (durationMs <= 0) {
        apply(1);
        resolve();
        return;
      }

      apply(0);
      this.tweens.push({ elapsed: 0, duration: durationMs, apply, resolve });
    });
  }

  /** Cancels all running tweens, optionally jumping them to their end state. */
  cancelTweens(jumpToEnd: boolean): void {
    const pending = this.tweens;
    this.tweens = [];

    for (const tween of pending) {
      if (jumpToEnd) {
        tween.apply(1);
      }
      tween.resolve();
    }
  }

  cancelWaits(): void {
    const dialogueWaiters = this.dialogueWaiters;
    this.dialogueWaiters = [];
    for (const resolve of dialogueWaiters) {
      resolve();
    }

    const clickCancels = [...this.clickWaitCancels];
    this.clickWaitCancels.clear();
    for (const cancel of clickCancels) {
      cancel();
    }
  }

  wait(durationMs: number): Promise<void> {
    return this.tween(durationMs, () => {});
  }

  isDialogueComplete(): boolean {
    return this.typewriter.complete;
  }

  /** Instantly reveals the rest of the dialogue text. */
  completeDialogue(): void {
    const typewriter = this.typewriter;
    if (!typewriter.active || typewriter.complete) {
      return;
    }

    typewriter.progress = typewriter.length;
    this.dialogueText.text = revealText(typewriter.lines, typewriter.length);
    typewriter.complete = true;
    this.notifyDialogueComplete();
    this.updateTriangleVisibility();
  }

  waitForDialogueComplete(): Promise<void> {
    if (this.typewriter.complete) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      this.dialogueWaiters.push(resolve);
    });
  }

  /**
   * Resolves with "click" if the canvas is clicked before the dialogue text
   * finishes rendering, or "dialogue" once it finishes (or when waits are
   * cancelled).
   */
  waitForClickOrDialogueComplete(): Promise<"click" | "dialogue"> {
    if (this.typewriter.complete) {
      return Promise.resolve("dialogue");
    }

    return new Promise<"click" | "dialogue">((resolve) => {
      const canvas = this.app.canvas;
      let settled = false;

      const finish = (result: "click" | "dialogue") => {
        if (settled) {
          return;
        }

        settled = true;
        canvas.removeEventListener("pointerdown", onClick);
        this.clickWaitCancels.delete(cancel);
        resolve(result);
      };

      const onClick = () => finish("click");
      const cancel = () => finish("dialogue");

      this.clickWaitCancels.add(cancel);
      this.dialogueWaiters.push(() => finish("dialogue"));
      canvas.addEventListener("pointerdown", onClick);
    });
  }

  waitForClick(): Promise<void> {
    return new Promise<void>((resolve) => {
      const canvas = this.app.canvas;

      const finish = () => {
        canvas.removeEventListener("pointerdown", finish);
        this.clickWaitCancels.delete(finish);
        resolve();
      };

      this.clickWaitCancels.add(finish);
      canvas.addEventListener("pointerdown", finish);
    });
  }

  private notifyDialogueComplete(): void {
    const waiters = this.dialogueWaiters;
    this.dialogueWaiters = [];
    for (const resolve of waiters) {
      resolve();
    }
  }

  setOverlayAlpha(alpha: number): void {
    this.fadeOverlay.alpha = alpha;
  }

  fadeOverlayTo(from: number, to: number, durationMs: number): Promise<void> {
    return this.tween(durationMs, (progress) => {
      this.fadeOverlay.alpha = from + (to - from) * progress;
    });
  }

  setCharacterAlpha(index: number, alpha: number): void {
    const slot = this.characterSlots[index];
    if (slot) {
      slot.sprite.alpha = alpha;
    }
  }

  fadeCharacter(
    index: number,
    from: number,
    to: number,
    durationMs: number,
  ): Promise<void> {
    const slot = this.characterSlots[index];
    if (!slot) {
      return Promise.resolve();
    }

    return this.tween(durationMs, (progress) => {
      slot.sprite.alpha = from + (to - from) * progress;
    });
  }

  /**
   * Animates a character between two scene offsets. The store should already
   * hold the destination coordinates; this tween only overrides the sprite
   * position frame-by-frame until it finishes.
   */
  moveCharacter(
    index: number,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    durationMs: number,
  ): Promise<void> {
    const slot = this.characterSlots[index];
    if (!slot) {
      return Promise.resolve();
    }

    return this.tween(durationMs, (progress) => {
      slot.sprite.x = CHARACTER_BASE_X + fromX + (toX - fromX) * progress;
      slot.sprite.y = CHARACTER_BASE_Y + fromY + (toY - fromY) * progress;
    });
  }
}

let activeRenderer: ScenarioRenderer | null = null;

export function setActiveScenarioRenderer(
  renderer: ScenarioRenderer | null,
): void {
  activeRenderer = renderer;
}

export function getActiveScenarioRenderer(): ScenarioRenderer | null {
  return activeRenderer;
}
