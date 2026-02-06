import * as PIXI from "pixi.js";
import { JMTween } from "../../JMGE/JMTween";

export class GameBlock extends PIXI.Graphics {
    public animating = false;
    public destroyed = false;
    constructor(public config: IGameBlock) {
        super();
        this.rect(0, 0, config.width, config.height);
        this.position.set(config.x, config.y);
        this.fill(BlockColors[config.type]);
    }

    shrinkAway(then?: () => void) {
        if (this.animating) return;
        this.animating = true;
        let oHeight = this.config.height;
        let oY = this.config.y;
        new JMTween(this as any).to({y: this.y + this.config.height}).over(300).start();
        new JMTween(this.scale).to({y: 0}).over(300).onUpdate(() => {
            this.config.height = oHeight * this.scale.y;
            this.config.y = oY + oHeight - this.config.height;
        })
        .onComplete(() => {
            this.destroyed = true;
            then && then();
        }).start();
    }
}

const BlockColors: Record<GameBlockType, number> = {
    normal: 0x11cc33,
    spring: 0xffff66,
    breakable: 0x00aa22,
    switch: 0x44eeff,
    door: 0x00aaaa,
};

export interface IGameBlock {
    x: number;
    y: number;
    width: number;
    height: number;
    type: GameBlockType;
    subtype?: string;
}

export type GameBlockType = "normal" | "spring" | "breakable" | "switch" | "door";