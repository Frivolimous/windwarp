import * as PIXI from "pixi.js";
import { GameBlock, IGameBlock } from "./GameBlock";

export class GameCanvas extends PIXI.Container {
  public static BACKGROUND = 0;
  public static OBJECTS = 1;
  public static PLAYER = 2;
  public static EFFECTS = 3;
  public static UI = 4;

  blocks: GameBlock[] = [];
  background: PIXI.Graphics = new PIXI.Graphics();
  movingLayer: PIXI.Container = new PIXI.Container();
  staticLayer: PIXI.Container = new PIXI.Container();
  layers: PIXI.Container[] = [
    this.background,
    new PIXI.Container(),
    new PIXI.Container(),
    new PIXI.Container(),
    new PIXI.Container(),
  ];

  constructor(public boundWidth: number, public boundHeight: number, scale: number) {
    super();
    this.addChild(this.movingLayer);
    this.addChild(this.staticLayer);
    this.layers.forEach(layer => this.movingLayer.addChild(layer));
    this.staticLayer.addChild(this.layers[GameCanvas.UI]);

    this.background.rect(0, 0, boundWidth, boundHeight);
    this.background.fill(0x3366ff);

    this.background.rect(0, 900, boundWidth, boundHeight - 900);
    this.background.fill(0x33ff66);

    this.scale.set(scale, scale);
    this.eventMode = 'dynamic';
  }

  resetBounds(width: number, height: number, floorHeight: number) {
    this.background.clear();

    this.background.rect(0, 0, width, height);
    this.background.fill(0x3366ff);

    this.background.rect(0, floorHeight, width, height - floorHeight);
    this.background.fill(0x33ff66);

    this.boundWidth = width;
    this.boundHeight = height;
  }

  clearObjects() {
    this.blocks.forEach(block => this.layers[GameCanvas.OBJECTS].removeChild(block));
    this.blocks = [];
  }

  addObjects(objects: IGameBlock[]) {
    objects.forEach(obj => {
      let block = new GameBlock(obj);
      
      // let upObj = !objects.filter(o => (o.y + o.height === obj.y && o.x <= obj.x && o.x + o.width >= obj.x + obj.width));
      // let leftObj = !objects.filter(o => (o.x + o.width === obj.x && o.y <= obj.y && o.y + o.height >= obj.y + obj.height));

      this.blocks.push(block);
      this.layers[GameCanvas.OBJECTS].addChild(block);
    });
  }

  removeObject(obj: IGameBlock) {
    let index = this.blocks.findIndex(block => block.config === obj);
    if (index !== -1) {
      this.layers[GameCanvas.OBJECTS].removeChild(this.blocks[index]);
      this.blocks.splice(index, 1);
    }
  }

  addPlayer(player: PIXI.Container) {
    this.layers[GameCanvas.PLAYER].addChild(player);
  }
}