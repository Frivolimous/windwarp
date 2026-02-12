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

  public checkWorld(sprite: {x: number, y: number, width: number, height: number}, isPlayer = true): CollisionResponse {
    let response: CollisionResponse = {
      up: Infinity,
      down: Infinity,
      left: Infinity,
      right: Infinity,
      upBlock: null,
      downBlock: null,
      leftBlock: null,
      rightBlock: null,
    }
    response.down = this.worldBottom - sprite.y - sprite.height;
    response.left = sprite.x - this.worldLeft;
    response.right = this.worldRight - sprite.x - sprite.width;

    this.objects.forEach(obj => {
      if (obj.type === 'secret') return;
      if (isPlayer && obj.usedByPlayer) return;
      if (!isPlayer && obj.usedbyGhost) return;
      
      let dX = sprite.x + sprite.width / 2 - obj.x - obj.width / 2;
      let dY = sprite.y + sprite.height / 2 - obj.y - obj.height / 2;

      let mX = (sprite.width + obj.width) / 2;
      let mY = (sprite.height + obj.height) / 2;

      let oX = Math.abs(dX) - mX;
      let oY = Math.abs(dY) - mY;

      if (oX < 0 && oY < 0) {
        if (oX > oY) {
          if (dX > 0) {
            response.left = oX;
            response.leftBlock = obj;
          } else {
            response.right = oX;
            response.rightBlock = obj;
          }
        } else {
          if (dY > 0) {
            response.up = oY;
            response.upBlock = obj;
          } else {
            response.down = oY;
            response.downBlock = obj;
          }
        }
      } else {
        if (oX < 0) {
          if (dY > 0) {
            if (oY < response.up) {
              response.up = oY;
              response.upBlock = obj;
            }
          } else {
            if (oY < response.down) {
              response.down = oY;
              response.downBlock = obj;
            }
          }
        }
        if (oY < 0) {
          if (dX > 0) {
            if (oX < response.left) {
              response.left = oX;
              response.leftBlock = obj;
            }
          } else {
            if (oX < response.right) {
              response.right = oX;
              response.rightBlock = obj;
            }
          }
        }
      }
    });
    
    return response;
  }

  public checkVertical(sprite: {x: number, y: number, width: number, height: number}, isPlayer = true): CollisionResponse {
    let response: CollisionResponse = {
      up: Infinity,
      down: Infinity,
      upBlock: null,
      downBlock: null,
    }

    response.down = this.worldBottom - sprite.y - sprite.height;

    this.objects.forEach(obj => {
      if (obj.type === 'secret') return;
      if (isPlayer && obj.usedByPlayer) return;
      if (!isPlayer && obj.usedbyGhost) return;

      let dX = sprite.x + sprite.width / 2 - obj.x - obj.width / 2;
      let dY = sprite.y + sprite.height / 2 - obj.y - obj.height / 2;

      let mX = (sprite.width + obj.width) / 2;
      let mY = (sprite.height + obj.height) / 2;

      let oX = Math.abs(dX) - mX;
      let oY = Math.abs(dY) - mY;

      if (oX < 0 && oY <= 0) {
          if (dY > 0) {
            response.up = oY;
            response.upBlock = obj;
          } else {
            response.down = oY;
            response.downBlock = obj;
          }
      }
    });

    return response;
  }

  public checkHorizontal(sprite: {x: number, y: number, width: number, height: number}, isPlayer = true): CollisionResponse {
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
      if (isPlayer && obj.usedByPlayer) return;
      if (!isPlayer && obj.usedbyGhost) return;

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