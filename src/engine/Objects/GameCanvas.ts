import * as PIXI from "pixi.js";

export class GameCanvas extends PIXI.Graphics {

    constructor(width: number, height: number, scale: number) {
        super();

        this.rect(0, 0, width, height);
        this.fill(0x3366ff);

        this.rect(0, 900, width, height - 900);
        this.fill(0x33ff66);

        this.scale.set(scale, scale);
        this.eventMode = 'dynamic';
    }
}