import * as PIXI from "pixi.js";

export class GameCanvas extends PIXI.Graphics {

    constructor(public boundWidth: number, public boundHeight: number, scale: number) {
        super();

        this.rect(0, 0, boundWidth, boundHeight);
        this.fill(0x3366ff);

        this.rect(0, 900, boundWidth, boundHeight - 900);
        this.fill(0x33ff66);

        this.scale.set(scale, scale);
        this.eventMode = 'dynamic';
    }

    resetBounds(width: number, height: number, floorHeight: number) {
        this.clear();
        
        this.rect(0, 0, width, height);
        this.fill(0x3366ff);

        this.rect(0, floorHeight, width, height - floorHeight);
        this.fill(0x33ff66);

        this.boundWidth = width;
        this.boundHeight = height;
    }

    addObjects(objects: {x: number, y: number, width: number, height: number, spring?: boolean}[]) {
        objects.forEach(obj => {
            this.rect(obj.x, obj.y, obj.width, obj.height);
            if (obj.spring) {
                this.fill(0xffff66);
            } else {
                this.fill(0x11cc33);
            }
        })
    }
}