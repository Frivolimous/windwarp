import * as PIXI from "pixi.js";

export class GameBlock extends PIXI.Graphics {
    constructor(x: number, y: number, width: number, height: number, color: number) {
        super();
        this.rect(x, y, width, height);
        this.fill(color);
    }
}
