import * as PIXI from "pixi.js";
import { JMTween } from "../../JMGE/JMTween";
import { Firework } from "../../JMGE/effects/Firework";
import { LevelLoader } from "../../services/LevelLoader";
import { Tilemap } from "@pixi/tilemap";

export class GameBlock extends PIXI.Container {
  public animating = false;
  public tiling: Tilemap;
  public overlay = new PIXI.Graphics();
  public usedByGhost = false;
  public usedByPlayer = false;

  constructor(public config: IGameBlock) {
    super();
    this.tiling = LevelLoader.drawBlock(config);
    this.addChild(this.tiling);

    if (LevelLoader.DRAW_OUTLINES) {
      this.addChild(this.overlay);
      this.overlay.rect(0, 0, config.width, config.height);
      this.overlay.stroke({ width: 2, color: 0 });
    }
    this.position.set(config.x, config.y);
  }

  randomTint() {
    this.tint = Math.random() * 0xffffff;
  }

  shrinkAway(then?: () => void) {
    if (this.animating) return;

    this.animating = true;
    let oHeight = this.config.height;
    let oY = this.config.y;
    new JMTween(this as any).to({ y: this.y + this.config.height }).over(300).start();
    new JMTween(this.scale).to({ y: 0 }).over(300).onUpdate(() => {
      this.config.height = oHeight * this.scale.y;
      this.config.y = oY + oHeight - this.config.height;
    })
      .onComplete(() => {
        then && then();
      }).start();
  }

  explode() {
    if (this.animating) return;
    this.visible = false;
    this.animating = true;

    if (this.parent) Firework.makeExplosion(this.parent, { x: this.x + this.config.width / 2, y: this.y + this.config.height / 2, tint: BlockColors[this.config.type], count: 20 });
  }
}

export const BlockColors: Record<GameBlockType, number> = {
  normal: 0x00aa11,
  spring: 0xcccc33,
  exploding: 0xcc4411,
  switch: 0x44eeff,
  door: 0x00aaaa,
  player: 0xff0000,
  goal: 0x555555,
  secret: 0x00bb22,
  checkpoint: 0x226699,
  mud: 0x885522,
  speed: 0xaa00aa,
  lava: 0xff0000,
}

export interface IGameBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  type: GameBlockType;
  subtype?: string;
  usedByPlayer?: boolean;
  usedbyGhost?: boolean;
}

export type GameBlockType = "normal" | "spring" | "exploding" | "switch" | "door" |
  "player" | "goal" | "secret" | "checkpoint" |
  "mud" | "lava" | "speed";