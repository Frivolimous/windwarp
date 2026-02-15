import { ILevelData, LevelLoader } from "../../services/LevelLoader";
import { GameBlock, GameBlockType, IGameBlock } from "./GameBlock";
import { GameCanvas } from "./GameCanvas";
import { PlayerCollider, PlayerSprite } from "./PlayerSprite";

export class GameEnvironment {
  private worldLeft = 0;
  private worldRight = 1900;
  private TILE_SIZE = 24;
  
  public worldBottom = 900;
  public tiles: GameBlockType[][];
  public objects: IGameBlock[] = [];

  public data: ILevelData;

  constructor(public canvas: GameCanvas) {

  }

  setupLevel(data: ILevelData) { 
    this.data = data; 
    this.worldRight = data.width;
    this.worldBottom = data.height;
    this.tiles = data.tiles;
    this.objects = data.objects;
    this.TILE_SIZE = LevelLoader.TILE_SIZE;
  }

  public checkTop = (sprite: PlayerCollider, isGhost = true): ColliionResponse => {
    let top = Math.floor((sprite.top - 1) / this.TILE_SIZE);

    let left = Math.floor((sprite.left + 1) / this.TILE_SIZE);
    let right = Math.floor((sprite.right - 2) / this.TILE_SIZE);

    let types: GameBlockType[] = [this.getTypeAt(left, top), this.getTypeAt(right, top)];
    let blocks: GameBlock[] = [this.getObjectAt(left * this.TILE_SIZE, top * this.TILE_SIZE), this.getObjectAt(right * this.TILE_SIZE, top * this.TILE_SIZE)];
    
    let globalRight = right * this.TILE_SIZE;
    if ((Math.abs(sprite.left - globalRight) < Math.abs(sprite.right - globalRight))) {
      types = [types[1], types[0]];
      blocks = [blocks[1], blocks[0]];
    }

    let type: GameBlockType;
    let block: GameBlock;

    if (types[0] && (!blocks[0] || (isGhost && !blocks[0].usedByGhost) || (!isGhost && !blocks[0].usedByPlayer))) {
      type = types[0];
      block = blocks[0];
    } else if (types[1] && (!blocks[1] || (isGhost && !blocks[1].usedByGhost) || (!isGhost && !blocks[1].usedByPlayer))) {
      type = types[1];
      block = blocks[1];
    } else {
      return null;
    }

    let depth = (top + 1) * this.TILE_SIZE - sprite.top;

    return {type, depth, block};
  }

  public checkBottom = (sprite: PlayerCollider, isGhost = true): ColliionResponse => {
    if (sprite.bottom >= this.worldBottom) return {type: undefined, depth: this.worldBottom - sprite.bottom};

    let bottom = Math.floor((sprite.bottom) / this.TILE_SIZE);

    let left = Math.floor((sprite.left + 1) / this.TILE_SIZE);
    let right = Math.floor((sprite.right - 2) / this.TILE_SIZE);

    let types: GameBlockType[] = [this.getTypeAt(left, bottom), this.getTypeAt(right, bottom)];
    let blocks: GameBlock[] = [this.getObjectAt(left * this.TILE_SIZE, bottom * this.TILE_SIZE), this.getObjectAt(right * this.TILE_SIZE, bottom * this.TILE_SIZE)];
    
    let globalRight = right * this.TILE_SIZE;
    if ((Math.abs(sprite.left - globalRight) < Math.abs(sprite.right - globalRight))) {
      types = [types[1], types[0]];
      blocks = [blocks[1], blocks[0]];
    }

    let type: GameBlockType;
    let block: GameBlock;

    if (types[0] && (!blocks[0] || (isGhost && !blocks[0].usedByGhost) || (!isGhost && !blocks[0].usedByPlayer))) {
      type = types[0];
      block = blocks[0];
    } else if (types[1] && (!blocks[1] || (isGhost && !blocks[1].usedByGhost) || (!isGhost && !blocks[1].usedByPlayer))) {
      type = types[1];
      block = blocks[1];
    } else {
      return null;
    }

    let depth = sprite.bottom - bottom * this.TILE_SIZE;

    return {type, depth, block};
  }

  public checkLeft = (sprite: PlayerCollider, isGhost = true): ColliionResponse => {
    let left = Math.floor((sprite.left - 1) / this.TILE_SIZE);

    let top = Math.floor((sprite.top + 1) / this.TILE_SIZE);
    let bottom = Math.floor((sprite.bottom - 2) / this.TILE_SIZE);

    let types: GameBlockType[] = [this.getTypeAt(left, top), this.getTypeAt(left, bottom)];
    let blocks: GameBlock[] = [this.getObjectAt(left * this.TILE_SIZE, top * this.TILE_SIZE), this.getObjectAt(left * this.TILE_SIZE, bottom * this.TILE_SIZE)];
    
    let globalBottom = bottom * this.TILE_SIZE;
    if ((Math.abs(sprite.left - globalBottom) < Math.abs(sprite.right - globalBottom))) {
      types = [types[1], types[0]];
      blocks = [blocks[1], blocks[0]];
    }

    let type: GameBlockType;
    let block: GameBlock;

    if (types[0] && (!blocks[0] || (isGhost && !blocks[0].usedByGhost) || (!isGhost && !blocks[0].usedByPlayer))) {
      type = types[0];
      block = blocks[0];
    } else if (types[1] && (!blocks[1] || (isGhost && !blocks[1].usedByGhost) || (!isGhost && !blocks[1].usedByPlayer))) {
      type = types[1];
      block = blocks[1];
    } else {
      return null;
    }

    let depth = (left + 1) * this.TILE_SIZE - sprite.left - 1;

    return {type, depth, block};
  }

  public checkRight = (sprite: PlayerCollider, isGhost = true): ColliionResponse => {
    let right = Math.floor((sprite.right) / this.TILE_SIZE);

    let top = Math.floor((sprite.top + 1) / this.TILE_SIZE);
    let bottom = Math.floor((sprite.bottom - 2) / this.TILE_SIZE);

    let types: GameBlockType[] = [this.getTypeAt(right, top), this.getTypeAt(right, bottom)];
    let blocks: GameBlock[] = [this.getObjectAt(right * this.TILE_SIZE, top * this.TILE_SIZE), this.getObjectAt(right * this.TILE_SIZE, bottom * this.TILE_SIZE)];
    
    let globalBottom = bottom * this.TILE_SIZE;
    if ((Math.abs(sprite.right - globalBottom) < Math.abs(sprite.right - globalBottom))) {
      types = [types[1], types[0]];
      blocks = [blocks[1], blocks[0]];
    }

    let type: GameBlockType;
    let block: GameBlock;

    if (types[0] && (!blocks[0] || (isGhost && !blocks[0].usedByGhost) || (!isGhost && !blocks[0].usedByPlayer))) {
      type = types[0];
      block = blocks[0];
    } else if (types[1] && (!blocks[1] || (isGhost && !blocks[1].usedByGhost) || (!isGhost && !blocks[1].usedByPlayer))) {
      type = types[1];
      block = blocks[1];
    } else {
      return null;
    }

    let depth = sprite.right - right * this.TILE_SIZE;

    return {type, depth, block};
  }

  public checkLR = (sprite: PlayerCollider, isGhost = true, direction: number): ColliionResponse => {
    if (direction < 0) {
      return this.checkLeft(sprite, isGhost);
    } else if (direction > 0) {
      return this.checkRight(sprite, isGhost);
    }

    return null;
  }

  public removeObject(obj: IGameBlock) {
    let index = this.objects.indexOf(obj);
    if (index !== -1) {
      this.objects.splice(index, 1);
      this.canvas.removeObject(obj);
    }
  }

  public getTypeAt(x: number, y: number): GameBlockType {
    if (x < 0) return 'normal';
    if (y < 0) return undefined;
    if (x >= this.tiles.length) return 'normal';
    if (y >= this.tiles[x].length) return undefined;
    // if (x > this.tiles[])
    let type = this.tiles[x][y];
    if (type === 'secret') type = undefined;
    return type;
  }

  public getObject(obj: IGameBlock): GameBlock {
    return this.canvas.blocks.find(o => o.config === obj);
  }

  public getObjectAt(x: number, y: number): GameBlock {
    // console.log(x, y);
    for (let block of this.canvas.blocks) {
      if (block.x <= x && (block.x + block.width) > x && block.y <= y && (block.y + block.height) > y) return block;
    }

    return null;
  }

  public globalToTile(point: {x: number, y: number}): {x: number, y: number} {
    // let scale = this.TILE_SIZE;
    return {x: Math.floor(point.x / this.TILE_SIZE), y: Math.floor(point.y / this.TILE_SIZE)};
  }

  public getRightmostTile(maxX: number, type: GameBlockType): {x: number, y: number} {
    maxX = Math.floor(maxX / this.TILE_SIZE);
    for (let x = maxX; x >= 0; x--) {
      for (let y = 0; y < this.tiles[x].length; y++) {
        if (this.tiles[x][y] === type) {
          return {x: x * this.TILE_SIZE, y: y * this.TILE_SIZE};
        }
      }
    }

    return null;
  }

  public tileToGlobal(point: {x: number, y: number}): {x: number, y: number} {
    return {x: point.x * this.TILE_SIZE, y: point.y * this.TILE_SIZE};
  }
}

export interface ColliionResponse {
  depth: number;
  type?: GameBlockType;
  block?: GameBlock;
}