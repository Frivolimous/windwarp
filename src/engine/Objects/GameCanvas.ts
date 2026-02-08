import * as PIXI from "pixi.js";
import { GameBlock, IGameBlock } from "./GameBlock";
import { colorLuminance } from "../../JMGE/others/Colors";

export class GameCanvas extends PIXI.Container {
  public static BACKGROUND = 0;
  public static OBJECTS = 1;
  public static PLAYER = 2;
  public static EFFECTS = 3;
  public static UI = 4;

  blocks: GameBlock[] = [];
  background: PIXI.Graphics = new PIXI.Graphics();
  backgroundRatio = 0.7;
  movingLayer: PIXI.Container = new PIXI.Container();
  staticLayer: PIXI.Container = new PIXI.Container();
  layers: PIXI.Container[] = [
    this.background,
    new PIXI.Container(),
    new PIXI.Container(),
    new PIXI.Container(),
    new PIXI.Container(),
  ];

  constructor(public boundWidth: number, public boundHeight: number, scale: number = 0.5) {
    super();
    this.addChild(this.background, this.movingLayer, this.staticLayer);
    this.movingLayer.addChild(this.layers[GameCanvas.OBJECTS], this.layers[GameCanvas.PLAYER], this.layers[GameCanvas.EFFECTS]);
    this.staticLayer.addChild(this.layers[GameCanvas.UI]);

    this.background.rect(0, 0, boundWidth * this.backgroundRatio, boundHeight * this.backgroundRatio);
    this.background.fill(0x3366ff);

    this.background.rect(0, 900, boundWidth, boundHeight - 900);
    this.background.fill(0x33ff66);

    this.eventMode = 'dynamic';
  }

  parallaxBackground() {
    let pX = this.movingLayer.x / this.boundWidth;
    let pY = this.movingLayer.y / this.boundHeight;

    this.background.position.set (this.boundWidth * this.backgroundRatio * pX, this.boundHeight * this.backgroundRatio * pY);
    // consol
  }

  resetBounds(width: number, height: number) {
    this.background.clear();

    this.background.rect(0, 0, width, height);
    this.background.fill(0x3366ff);
    
    let area = width * height;

    for (let i = 0; i < area; i += 100000) {
      this.background.ellipse(Math.random() * width, Math.random() * height, 50 + Math.random() * 50, 50 + Math.random() * 50);
      this.background.fill(colorLuminance(0x3366ff,  1.05 + Math.random() * 0.1))
    }

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