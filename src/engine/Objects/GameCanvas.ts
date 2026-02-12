import * as PIXI from "pixi.js";
import { GameBlock, IGameBlock } from "./GameBlock";
import { colorLuminance } from "../../JMGE/others/Colors";
import { ILevelData, LevelLoader } from "../../services/LevelLoader";

export class GameCanvas extends PIXI.Container {
  public static BACKGROUND = 0;
  public static OBJECTS = 1;
  public static PLAYER = 2;
  public static EFFECTS = 3;
  public static UI = 4;

  blocks: GameBlock[] = [];
  background: PIXI.Graphics = new PIXI.Graphics();
  foreground = new PIXI.Graphics();
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

  constructor(public boundWidth: number, public boundHeight: number, public baseScale: number = 1) {
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

  addConfig(data: ILevelData) {
    this.layers[GameCanvas.OBJECTS].removeChildren()
    this.layers[GameCanvas.OBJECTS].addChild(data.img);
    this.layers[GameCanvas.OBJECTS].addChild(this.foreground);
    this.foreground.clear();

    let objects = data.blocks;
    objects.forEach(obj => {
      if (obj.type === 'exploding') {
        let block = new GameBlock(obj);
        this.blocks.push(block);
        this.layers[GameCanvas.OBJECTS].addChild(block);
      }
    });

    if (LevelLoader.DRAW_OUTLINES) {
      for (let x = 0; x < this.boundWidth; x += LevelLoader.TILE_SIZE) {
        for (let y = 0; y < this.boundHeight; y += LevelLoader.TILE_SIZE) {
          let b1 = this.findBlockAt(objects, x, y);
          let bR = this.findBlockAt(objects, x + LevelLoader.TILE_SIZE, y);
          let bD = this.findBlockAt(objects, x, y + LevelLoader.TILE_SIZE);
  
          if (((b1 === undefined) !== (bR === undefined)) || (b1 !== undefined && (b1.type != bR.type))) {
            if (b1 === undefined || bR === undefined || ((b1.type !== 'normal' || bR.type !== 'secret') && (b1.type !== 'secret' || bR.type !== 'normal'))) {
              this.foreground.moveTo(x + LevelLoader.TILE_SIZE, y).lineTo(x + LevelLoader.TILE_SIZE, y + LevelLoader.TILE_SIZE).stroke({width: 2, color: 0});
            }
          }
  
          if (((b1 === undefined) !== (bD === undefined)) || (b1 !== undefined && b1.type != bD.type)) {
            if (b1 === undefined || bD === undefined || ((b1.type !== 'normal' || bD.type !== 'secret') && (b1.type !== 'secret' || bD.type !== 'normal'))) {
              this.foreground.moveTo(x, y + LevelLoader.TILE_SIZE).lineTo(x + LevelLoader.TILE_SIZE, y + LevelLoader.TILE_SIZE).stroke({width: 2, color: 0});
            }
          }
        }
      }
    }
  }

  findBlockAt(objects: IGameBlock[], x: number, y: number): IGameBlock {
    return objects.find(el => (el.x <= x) && (el.x + el.width > x) && (el.y <= y) && (el.y + el.height > y) && (el.type !== 'exploding'));
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

  removePlayer(player: PIXI.Container) {
    try {
      this.layers[GameCanvas.PLAYER].removeChild(player);
    } catch (e) {}
  }
}