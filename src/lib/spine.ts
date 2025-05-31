import "pixi-spine";

import { Spine as PixiSpine } from "pixi-spine";

import * as PIXI from "pixi.js-v7";

const CHARA_BASE_PATH = "/assets/{charaId}/";
const CHARA_SKEL_PATH = `${CHARA_BASE_PATH}/{charaId}_spr.skel`;

export type SpineRendererOpts = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

export class SpineRenderer {
  private pixi: PIXI.Application;
  private chara?: PixiSpine;
  private loop = true;

  constructor({ canvas, width, height }: SpineRendererOpts) {
    canvas.width = width;
    canvas.height = height;

    this.pixi = new PIXI.Application({
      view: canvas,
      width: width,
      height: height,
      backgroundAlpha: 0,
    });
  }

  clear() {
    this.pixi.stage.removeChildren();
  }

  destroy() {
    this.clear();
    PIXI.Assets.loader.reset();
  }

  async loadChara({
    charaId,
    charaName,
  }: {
    charaId: string;
    charaName: string;
  }) {
    const skelPath = CHARA_SKEL_PATH.replace(/{charaId}/g, charaId);

    // biome-ignore lint/style/noNonNullAssertion:
    const oldSkelParser = PIXI.Assets.loader.parsers.find((p) =>
      p.test?.("a.skel"),
    )!;

    // biome-ignore lint/style/noNonNullAssertion:
    const oldAtlasParser = PIXI.Assets.loader.parsers.find((p) =>
      p.test?.("a.atlas"),
    )!;

    try {
      PIXI.Assets.loader.parsers.unshift(oldSkelParser, oldAtlasParser);

      const data = await PIXI.Assets.load(skelPath);

      const spine = new PixiSpine(data.spineData);
      spine.name = charaName;
      this.pixi.stage.addChild(spine);

      this.scaleToFit(spine);
      this.center(spine);

      return spine;
    } catch (err) {
      console.error("Failed to load chara", err);
      return null;
    }
  }

  private scaleToFit(spine: PixiSpine) {
    const width = spine.spineData.width;
    const height = spine.spineData.height;

    const widthScale = this.pixi.renderer.width / width;
    const heightScale = this.pixi.renderer.height / height;

    const min = Math.min(widthScale, heightScale);
    const scale = Math.ceil(min * 10) / 10;

    spine.scale.set(scale);
  }

  private center(spine: PixiSpine) {
    spine.x = this.pixi.renderer.width / 2;
    spine.y =
      this.pixi.renderer.height / 2 + (spine.height * spine.scale.y) / 2;
  }

  get animationNames(): string[] {
    if (!this.chara) {
      return [];
    }

    return this.chara.state.data.skeletonData.animations.map(
      (anim) => anim.name,
    );
  }

  playAnimation(track: number, name: string, loopOverride?: boolean) {
    if (!this.chara) {
      return;
    }

    this.chara.state.setAnimation(track, name, loopOverride ?? this.loop);
  }

  stopAnimation(track: number, mixDuration?: number) {
    if (!this.chara) {
      return;
    }

    if (mixDuration) {
      this.chara.state.addEmptyAnimation(track, mixDuration, 0);
    } else {
      this.chara.state.setEmptyAnimation(track, 0);
    }
  }

  async addChara({
    charaId,
    charaName,
    startAnim,
  }: {
    charaId: string;
    charaName: string;
    startAnim?: string;
  }) {
    this.clear();

    const chara = await this.loadChara({
      charaId,
      charaName,
    });

    if (!chara) {
      console.error("Failed to load chara");
      return;
    }

    this.chara = chara;

    const animation = this.animationNames.find((name) => name === startAnim);

    if (animation) {
      this.playAnimation(0, animation);
    } else {
      const firstAnimation = this.chara.state.data.skeletonData.animations[0];
      this.playAnimation(0, firstAnimation.name);
    }
  }

  setLoop(loop: boolean) {
    this.loop = loop;

    if (!this.chara) {
      return;
    }

    if (this.chara.state.tracks.length === 0) {
      return;
    }

    if (!this.chara.state.tracks[0]) {
      return;
    }

    this.chara.state.tracks[0].loop = loop;
  }

  findBone(name: string) {
    if (!this.chara) {
      return null;
    }

    return this.chara.skeleton.findBone(name);
  }

  resize(width: number, height: number) {
    this.pixi.renderer.resize(width, height);

    if (this.chara) {
      this.scaleToFit(this.chara);
      this.center(this.chara);
    }
  }

  drawDebugRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    filled = false,
  ) {
    const graphics = new PIXI.Graphics();

    graphics.lineStyle(1, color);

    if (filled) {
      graphics.beginFill(color);
    }

    graphics.drawRect(x, y, width, height);

    if (filled) {
      graphics.endFill();
    }

    this.pixi.stage.addChild(graphics);
  }
}
