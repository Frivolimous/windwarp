import * as PIXI from 'pixi.js';
import { GameBlockType, IGameBlock } from "../engine/Objects/GameBlock";
import { settings, Tilemap } from "@pixi/tilemap";

export class LevelLoader {
  static levelSources: string[] = [
    'assets/Level1.bmp',
    'assets/Level2.bmp',
    'assets/Level3.bmp',
    'assets/Level4.bmp',
    'assets/Level5.bmp',
    'assets/Level6.bmp',
    'assets/Level7.bmp',
    'assets/Level8.bmp',
    'assets/Level9.bmp',
    'assets/Level10.bmp',
    'assets/Level11.bmp',
  ];

  static TilemapSrc = 'assets/Tilemap24PLUS.png';
  static PlayerSrc = 'assets/Characters24.png';

  static TILE_SIZE = 24;
  static CHAR_SIZE = 24;
  static DRAW_OUTLINES = false;

  static levelBitmaps: ImageBitmap[] = [];
  static mainTextureSource: PIXI.TextureSource;

  static characterTexture: PIXI.TextureSource;
  static skins: PIXI.Texture[][] = [];

  public static async initialize() {
    settings.use32bitIndex = true;

    const tilesetTexture: PIXI.TextureSource = await PIXI.Assets.load({
      src: this.TilemapSrc,
      data: {
        mipmap: false,
      }
    });

    this.mainTextureSource = new PIXI.Texture(tilesetTexture).source;

    this.characterTexture = await PIXI.Assets.load({
      src: this.PlayerSrc,
      data: {
        mipmap: false,
      }
    });

    for (let y = 0; y < 6; y++) {
      let skin: PIXI.Texture[] = [];
      this.skins.push(skin);
      for (let x = 0; x < 3; x++) {
        skin.push(new PIXI.Texture({
          source: this.characterTexture,
          frame: new PIXI.Rectangle(x * this.CHAR_SIZE, y * this.CHAR_SIZE, this.CHAR_SIZE, this.CHAR_SIZE),
        }));
      }
      skin = [];
      this.skins.push(skin);
      for (let x = 3; x < 6; x++) {
        skin.push(new PIXI.Texture({
          source: this.characterTexture,
          frame: new PIXI.Rectangle(x * this.CHAR_SIZE, y * this.CHAR_SIZE, this.CHAR_SIZE, this.CHAR_SIZE),
        }));
      }
    }
  }

  public static drawBlock(config: IGameBlock): Tilemap {
    let img = new Tilemap(LevelLoader.mainTextureSource);
    let type = config.type;

    function matchTypeAt(x: number, y: number) {
      if (y < 0 || x < 0 || (y >= config.height / LevelLoader.TILE_SIZE) || (x >= config.width / LevelLoader.TILE_SIZE)) return false;  
      return true;
    }

    for (let x = 0; x < config.width / this.TILE_SIZE; x++) {
      for (let y = 0; y < config.height / this.TILE_SIZE; y++) {
        let tl = [matchTypeAt(x, y-1),matchTypeAt(x-1, y),matchTypeAt(x-1, y-1)];
        let tr = [matchTypeAt(x, y-1),matchTypeAt(x+1, y),matchTypeAt(x+1, y-1)];
        let bl = [matchTypeAt(x, y+1),matchTypeAt(x-1, y),matchTypeAt(x-1, y+1)];
        let br = [matchTypeAt(x, y+1),matchTypeAt(x+1, y),matchTypeAt(x+1, y+1)];

        img.tile(0, x * LevelLoader.TILE_SIZE, y * LevelLoader.TILE_SIZE, this.getHalfTileMapOption(type, 0, tl));
        img.tile(0, (x + 0.5) * LevelLoader.TILE_SIZE, y * LevelLoader.TILE_SIZE, this.getHalfTileMapOption(type, 1, tr));
        img.tile(0, (x) * LevelLoader.TILE_SIZE, (y + 0.5) * LevelLoader.TILE_SIZE, this.getHalfTileMapOption(type, 2, bl));
        img.tile(0, (x + 0.5) * LevelLoader.TILE_SIZE, (y + 0.5) * LevelLoader.TILE_SIZE, this.getHalfTileMapOption(type, 3, br));
      }
    }

    return img;
  }

  public static async makeLevelDataFromUrl(src: string) {
    let img = new Image();
    img.src = src;

    let result =  await new Promise<ILevelData>(resolve => {
      img.onload = () => {
        createImageBitmap(img).then(bitmap => {
          let data = this.makeLevelData(bitmap);
          resolve(data);
        });
      }
    });

    return result;
  }

  public static makeLevelData(bitmap: ImageBitmap): ILevelData {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    let data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let m: ILevelData = {
      blocks: [],
      width: bitmap.width * LevelLoader.TILE_SIZE,
      height: bitmap.height * LevelLoader.TILE_SIZE,
      img: new Tilemap(this.mainTextureSource),
    };
    
    let typeMap: GameBlockType[][] = [];

    function matchTypeAt(type: GameBlockType, x: number, y: number) {
      if (y < 0 || x < 0 || (y >= bitmap.height) || (x >= bitmap.width)) return false;  
      return typeMap[x][y] === type;
    }

    for (let x = 0; x < bitmap.width; x++) {
      let row: GameBlockType[] = [];
      typeMap.push(row);
      for (let y = 0; y < bitmap.height; y++) {
        let index = (y * bitmap.width + x) * 4;
        let type = ColorMapping[`${data[index]},${data[index + 1]},${data[index + 2]}`];
        row.push(type);
      }
    }

    for (let x = 0; x < bitmap.width; x++) {
      for (let y = 0; y < bitmap.height; y++) {
        let type = typeMap[x][y];
        if (type === 'player') {
          m.startingPosition = {x: x * LevelLoader.TILE_SIZE, y: y * LevelLoader.TILE_SIZE};
        } else if (type) {
          m.blocks.push({
            x: x * LevelLoader.TILE_SIZE,
            y: y * LevelLoader.TILE_SIZE,
            width: LevelLoader.TILE_SIZE,
            height: LevelLoader.TILE_SIZE,
            type: type,
          });

          if (type !== 'exploding') {
            let tl = [matchTypeAt(type, x, y-1),matchTypeAt(type, x-1, y),matchTypeAt(type, x-1, y-1)];
            let tr = [matchTypeAt(type, x, y-1),matchTypeAt(type, x+1, y),matchTypeAt(type, x+1, y-1)];
            let bl = [matchTypeAt(type, x, y+1),matchTypeAt(type, x-1, y),matchTypeAt(type, x-1, y+1)];
            let br = [matchTypeAt(type, x, y+1),matchTypeAt(type, x+1, y),matchTypeAt(type, x+1, y+1)];

            m.img.tile(0, x * LevelLoader.TILE_SIZE, y * LevelLoader.TILE_SIZE, this.getHalfTileMapOption(type, 0, tl));
            m.img.tile(0, (x + 0.5) * LevelLoader.TILE_SIZE, y * LevelLoader.TILE_SIZE, this.getHalfTileMapOption(type, 1, tr));
            m.img.tile(0, x * LevelLoader.TILE_SIZE, (y + 0.5) * LevelLoader.TILE_SIZE, this.getHalfTileMapOption(type, 2, bl));
            m.img.tile(0, (x + 0.5) * LevelLoader.TILE_SIZE, (y + 0.5) * LevelLoader.TILE_SIZE, this.getHalfTileMapOption(type, 3, br));
          }
        }
      }
    }

    // merge blocks horizontally
    for (let i = 0; i < m.blocks.length; i++) {
      let foundBlock: IGameBlock;
      do {
        let block = m.blocks[i];
        foundBlock = m.blocks.find(b => b.y === block.y && b.x === block.x + block.width && b.type === block.type);
        if (foundBlock) {
          block.width += foundBlock.width;
          m.blocks = m.blocks.filter(b => b !== foundBlock);
        }
      } while(foundBlock);
    }

    // merge blocks vertically
    for (let i = 0; i < m.blocks.length; i++) {
      let foundBlock: IGameBlock;
      do {
        let block = m.blocks[i];
        foundBlock = m.blocks.find(b => b.x === block.x && b.y === block.y + block.height && block.width === b.width && b.type === block.type);
        if (foundBlock) {
          block.height += foundBlock.height;
          m.blocks = m.blocks.filter(b => b !== foundBlock);
        }
      } while(foundBlock);
    }

    return m;
  }

  public static getHalfTileMapOption(type: GameBlockType, corner: number, adjacents: boolean[]) {
    let setIndex = HalfTileTypeOffsets[type];
    let str = corner + (adjacents[0] ? 'T' : 'F') + (adjacents[1] ? 'T' : 'F') + (adjacents[2] ? 'T' : 'F');
    let [offX, offY] = HalfTileMapOffsets[str];
    offX += setIndex[0];
    offY+= setIndex[1];

    return {u: offX * this.TILE_SIZE/2, v: offY * this.TILE_SIZE/2, tileWidth: this.TILE_SIZE/2, tileHeight: this.TILE_SIZE/2};
  }
}

const ColorMapping: Record<string, GameBlockType> = {
  '0,255,0': 'normal',
  '255,255,0': 'spring',
  '255,170,0': 'exploding',
  '255,0,0': 'player',
  '255,255,255': 'goal',
  '0,0,0': 'secret',
  '0,255,255': 'checkpoint',
}

export interface ILevelData {
  blocks: IGameBlock[];
  width: number;
  height: number;
  startingPosition?: {x: number, y: number};
  img: Tilemap;
}

const HalfTileMapOffsets: Record<string, [number, number]> = {
  //0: TL, 1: TR, 2: BL, 3: BR
  // VHD
  '0FFF': [0, 0], //CORNER
  '0FFT': [0, 0], //CORNER
  '0FTF': [1, 0], //FLAT V
  '0FTT': [1, 0], //FLAT V
  '0TFF': [0, 1], //FLAT H
  '0TFT': [0, 1], //FLAT H
  '0TTF': [4, 1], //INNER CORNER
  '0TTT': [1, 1], // FULL
  '1FFF': [2, 0], //CORNER
  '1FFT': [2, 0], //CORNER
  '1FTF': [1, 0], //FLAT V
  '1FTT': [1, 0], //FLAT V
  '1TFF': [2, 1], //FLAT H
  '1TFT': [2, 1], //FLAT H
  '1TTF': [3, 1], //INNER CORNER
  '1TTT': [1, 1], // FULL
  '2FFF': [0, 2], //CORNER
  '2FFT': [0, 2], //CORNER
  '2FTF': [1, 2], //FLAT V
  '2FTT': [1, 2], //FLAT V
  '2TFF': [0, 1], //FLAT H
  '2TFT': [0, 1], //FLAT H
  '2TTF': [4, 0], //INNER CORNER
  '2TTT': [1, 1], // FULL
  '3FFF': [2, 2], //CORNER
  '3FFT': [2, 2], //CORNER
  '3FTF': [1, 2], //FLAT V
  '3FTT': [1, 2], //FLAT V
  '3TFF': [2, 1], //FLAT H
  '3TFT': [2, 1], //FLAT H
  '3TTF': [3, 0], //INNER CORNER
  '3TTT': [1, 1], // FULL
}

const HalfTileTypeOffsets: Record<GameBlockType, [number, number]> = {
  normal: [0, 0],
  spring: [5, 0],
  exploding: [10, 0],
  switch: [0, 0],
  door: [0, 0],
  player: [0, 0],
  goal: [0, 3],
  secret: [5 , 3],
  checkpoint: [15, 0],
};