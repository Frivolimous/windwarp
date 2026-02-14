import { ILevelData } from "../../services/LevelLoader";
import { GameBlock, IGameBlock } from "./GameBlock";
import { GameCanvas } from "./GameCanvas";
import { PlayerSprite } from "./PlayerSprite";

export class GameEnvironment {
  private worldLeft = 0;
  private worldRight = 1900;
  
  public worldBottom = 900;
  public objects: IGameBlock[] = [];

  public data: ILevelData;

  constructor(public canvas: GameCanvas) {

  }

  setupLevel(data: ILevelData) { 
    this.data = data; 
    this.worldRight = data.width;
    this.worldBottom = data.height;
    this.objects = data.blocks;
  }

  public checkVertical(sprite: {x: number, y: number, width: number, height: number}, isGhost = true): CollisionResponse {
    let response: CollisionResponse = {
      up: Infinity,
      down: Infinity,
      upBlock: null,
      downBlock: null,
    }

    response.down = this.worldBottom - sprite.y - sprite.height;

    let upoX = 0;
    let downoX = 0;

    this.objects.forEach(obj => {
      if (obj.type === 'secret') return;
      if (!isGhost && obj.usedByPlayer) return;
      if (isGhost && obj.usedbyGhost) return;

      let dX = sprite.x + sprite.width / 2 - obj.x - obj.width / 2;
      let dY = sprite.y + sprite.height / 2 - obj.y - obj.height / 2;

      let mX = (sprite.width + obj.width) / 2;
      let mY = (sprite.height + obj.height) / 2;

      let oX = Math.abs(dX) - mX;
      let oY = Math.abs(dY) - mY;

      if (oX < 0 && oY <= 0) {
          if (dY > 0) {
            if (oX < upoX) {
              upoX = oX;
              response.up = oY;
              response.upBlock = obj;
            }
          } else {
            if (oX < downoX) {
              downoX = oX;
              response.down = oY;
              response.downBlock = obj;
            }
          }
      }
    });

    return response;
  }

  public checkHorizontal(sprite: {x: number, y: number, width: number, height: number}, isGhost = true): CollisionResponse {
    let response: CollisionResponse = {
      left: Infinity,
      right: Infinity,
      leftBlock: null,
      rightBlock: null,
    }

    response.left = sprite.x - this.worldLeft;
    response.right = this.worldRight - sprite.x - sprite.width;


    this.objects.forEach(obj => {
      if (obj.type === 'secret') return;
      if (!isGhost && obj.usedByPlayer) return;
      if (isGhost && obj.usedbyGhost) return;

      let dX = sprite.x + sprite.width / 2 - obj.x - obj.width / 2;
      let dY = sprite.y + sprite.height / 2 - obj.y - obj.height / 2;

      let mX = (sprite.width + obj.width) / 2;
      let mY = (sprite.height + obj.height) / 2;

      let oX = Math.abs(dX) - mX;
      let oY = Math.abs(dY) - mY;

      if (oX <= 0 && oY < 0) {
          if (dX > 0) {
            response.left = oX;
            response.leftBlock = obj;
          } else {
            response.right = oX;
            response.rightBlock = obj;
          }
      }
    });

    return response;
  }

  public removeObject(obj: IGameBlock) {
    let index = this.objects.indexOf(obj);
    if (index !== -1) {
      this.objects.splice(index, 1);
      this.canvas.removeObject(obj);
    }
  }

  public getObject(obj: IGameBlock): GameBlock {
    return this.canvas.blocks.find(o => o.config === obj);
  }
}

export interface CollisionResponse {
  down?: number;
  up?: number;
  left?: number;
  right?: number;
  downBlock?: IGameBlock;
  upBlock?: IGameBlock;
  leftBlock?: IGameBlock;
  rightBlock?: IGameBlock;
}