import { IGameBlock } from "./GameBlock";
import { GameCanvas } from "./GameCanvas";
import { PlayerSprite } from "./PlayerSprite";

export class GameEnvironment {
  private wallLeft = 0;
  private wallRight = 1900;
  
  public floorHeight = 900;
  public objects: IGameBlock[] = [];

  constructor(public canvas: GameCanvas) {

  }

  setupLevel(levelWidth: number, floorHeight: number, objects: IGameBlock[]) {
    this.wallRight = levelWidth;
    this.floorHeight = floorHeight;
    this.objects = objects;
  }

  public checkWorld(rect: {x: number, y: number, width: number, height: number}): WorldResponse {
    let response = {
      up: Infinity,
      down: Infinity,
      left: Infinity,
      right: Infinity,
      upBlock: null,
      downBlock: null,
      leftBlock: null,
      rightBlock: null,
    }
    response.down = this.floorHeight - rect.y - rect.height;
    response.left = rect.x - this.wallLeft;
    response.right = this.wallRight - rect.x - rect.width;

    this.objects.forEach(obj => {
      let dX = rect.x + rect.width / 2 - obj.x - obj.width / 2;
      let dY = rect.y + rect.height / 2 - obj.y - obj.height / 2;

      let mX = (rect.width + obj.width) / 2;
      let mY = (rect.height + obj.height) / 2;

      let oX = mX - Math.abs(dX);
      let oY = mY - Math.abs(dY);

      if (Math.abs(dX) < mX && Math.abs(dY) < mY) {
        if (oX < oY) {
          if (dX > 0) {
            response.left = -oX;
            response.leftBlock = obj;
          } else {
            response.right = -oX;
            response.rightBlock = obj;
          }
        } else {
          if (dY > 0) {
            response.up = -oY;
            response.upBlock = obj;
          } else {
            response.down = -oY;
            response.downBlock = obj;
          }
        }
      } else {
        if (Math.abs(dX) < mX) {
          if (dY > 0) {
            if (-oY < response.up) {
              response.up = -oY;
              response.upBlock = obj;
            }
          } else {
            if (-oY < response.down) {
              response.down = -oY;
              response.downBlock = obj;
            }
          }
        }
        if (Math.abs(dY) < mY) {
          if (dX > 0) {
            if (-oX < response.left) {
              response.left = -oX;
              response.leftBlock = obj;
            }
          } else {
            if (-oX < response.right) {
              response.right = -oX;
              response.rightBlock = obj;
            }
          }
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
}

export interface WorldResponse {
  down: number;
  up: number;
  left: number;
  right: number;
  downBlock?: IGameBlock;
  upBlock?: IGameBlock;
  leftBlock?: IGameBlock;
  rightBlock?: IGameBlock;
}