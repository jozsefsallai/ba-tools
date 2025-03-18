import { SpineRenderer } from "@/lib/spine";
import type { Bone } from "@esotericsoftware/spine-pixi-v7";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export class Plana {
  private renderer: SpineRenderer;
  private canvas: HTMLCanvasElement;

  private isPatting = false;

  private touchPoint: Bone | null = null;

  private originalX = 0;
  private originalY = 0;

  private scaleModifier = 1;

  private blinkIntervalId: NodeJS.Timeout | number | null = null;
  private heartHaloTimeoutId: NodeJS.Timeout | number | null = null;

  static CANVAS_WIDTH = 500;
  static CANVAS_HEIGHT = 850;

  static HEADPAT_HITBOX = {
    x: 200,
    y: 180,
    dx: 310,
    dy: 220,
  };

  static HEADPAT_INCREMENT = 2;
  static HEADPAT_CLAMP = 30;
  static BLINK_INTERVAL = 10000;
  static HEART_HALO_TIMEOUT = 6000;

  constructor(canvas: HTMLCanvasElement) {
    this.updateScaleModifier();

    this.canvas = canvas;

    this.renderer = new SpineRenderer({
      canvas: this.canvas,
      width: this.width,
      height: this.height,
    });
  }

  updateScaleModifier() {
    if (window.innerWidth < 1780) {
      this.scaleModifier = 0.75;
    } else {
      this.scaleModifier = 1;
    }
  }

  async init() {
    await this.renderer.addChara({
      charaId: "NP0035",
      charaName: "Plana",
      startAnim: "Idle_01",
    });

    this.touchPoint = this.renderer.findBone("Touch_Point") as Bone | null;
    if (this.touchPoint) {
      this.originalX = this.touchPoint.x;
      this.originalY = this.touchPoint.y;
    }

    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    document.addEventListener("mouseup", this.handleMouseUp.bind(this));

    window.addEventListener("resize", this.handleResize.bind(this));

    this.blinkIntervalId = setInterval(
      this.blink.bind(this),
      Plana.BLINK_INTERVAL,
    );
  }

  deinit() {
    this.renderer.destroy();

    this.canvas.removeEventListener(
      "mousedown",
      this.handleMouseDown.bind(this),
    );
    this.canvas.removeEventListener(
      "mousemove",
      this.handleMouseMove.bind(this),
    );
    document.removeEventListener("mouseup", this.handleMouseUp.bind(this));

    window.removeEventListener("resize", this.handleResize.bind(this));

    if (this.blinkIntervalId) {
      clearInterval(this.blinkIntervalId);
    }
  }

  private get width() {
    return Plana.CANVAS_WIDTH * this.scaleModifier;
  }

  private get height() {
    return Plana.CANVAS_HEIGHT * this.scaleModifier;
  }

  private getHeadpatHitbox() {
    if (this.scaleModifier === 0.75) {
      return {
        x: Plana.HEADPAT_HITBOX.x * this.scaleModifier,
        y: Plana.HEADPAT_HITBOX.y * this.scaleModifier - 40,
        dx: Plana.HEADPAT_HITBOX.dx * this.scaleModifier,
        dy: Plana.HEADPAT_HITBOX.dy * this.scaleModifier - 40,
      };
    }

    return Plana.HEADPAT_HITBOX;
  }

  private handleMouseDown(e: MouseEvent) {
    const x = e.offsetX;
    const y = e.offsetY;

    const hitbox = this.getHeadpatHitbox();

    if (x >= hitbox.x && x <= hitbox.dx && y >= hitbox.y && y <= hitbox.dy) {
      this.pat();
    }
  }

  private handleMouseMove(e: MouseEvent) {
    const x = e.offsetX;
    const y = e.offsetY;
    const dx = e.movementX;
    const dy = e.movementY;

    this.rub(x, y, dx, dy);
  }

  private handleMouseUp() {
    this.unpat();
  }

  private handleResize() {
    this.updateScaleModifier();

    if (this.canvas.width === this.width) {
      return;
    }

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.renderer.resize(this.width, this.height);
  }

  private pat() {
    this.isPatting = true;

    this.renderer.playAnimation(1, "Pat_01_M", false);
    this.renderer.playAnimation(2, "Pat_01_A", false);

    this.canvas.style.cursor = "grab";

    this.heartHaloTimeoutId = setTimeout(() => {
      this.renderer.playAnimation(3, "Dev_Halo_love", true);
    }, Plana.HEART_HALO_TIMEOUT);
  }

  private rub(x: number, _y: number, dx: number, _dy: number) {
    if (!this.touchPoint || !this.isPatting) {
      return;
    }

    if (x >= this.width / 3 && dx > 0) {
      this.touchPoint.y = clamp(
        this.touchPoint.y - Plana.HEADPAT_INCREMENT,
        this.originalY - Plana.HEADPAT_CLAMP,
        this.originalY + Plana.HEADPAT_CLAMP,
      );
    } else if (x < (2 * this.width) / 3 && dx < 0) {
      this.touchPoint.y = clamp(
        this.touchPoint.y + Plana.HEADPAT_INCREMENT,
        this.originalY - Plana.HEADPAT_CLAMP,
        this.originalY + Plana.HEADPAT_CLAMP,
      );
    }
  }

  private unpat() {
    if (!this.isPatting) {
      return;
    }

    this.isPatting = false;

    this.renderer.playAnimation(1, "PatEnd_01_M", false);
    this.renderer.playAnimation(2, "PatEnd_01_A", false);

    this.renderer.stopAnimation(1, 0.1);
    this.renderer.stopAnimation(2, 0.1);

    this.canvas.style.cursor = "default";

    if (this.heartHaloTimeoutId) {
      clearTimeout(this.heartHaloTimeoutId);
      this.renderer.stopAnimation(3);
    }

    // slowly reset head position
    const interval = setInterval(() => {
      if (!this.touchPoint) {
        return clearInterval(interval);
      }

      if (
        Math.abs(this.touchPoint.x - this.originalX) <=
          Plana.HEADPAT_INCREMENT &&
        Math.abs(this.touchPoint.y - this.originalY) <= Plana.HEADPAT_INCREMENT
      ) {
        this.touchPoint.x = this.originalX;
        this.touchPoint.y = this.originalY;
        clearInterval(interval);
      }

      if (this.touchPoint.x < this.originalX) {
        this.touchPoint.x += Plana.HEADPAT_INCREMENT;
      }

      if (this.touchPoint.x > this.originalX) {
        this.touchPoint.x -= Plana.HEADPAT_INCREMENT;
      }

      if (this.touchPoint.y < this.originalY) {
        this.touchPoint.y += Plana.HEADPAT_INCREMENT;
      }

      if (this.touchPoint.y > this.originalY) {
        this.touchPoint.y -= Plana.HEADPAT_INCREMENT;
      }
    }, 10);
  }

  private blink() {
    if (this.isPatting) {
      return;
    }

    this.renderer.playAnimation(1, "Eye_Close_01", false);
  }
}
