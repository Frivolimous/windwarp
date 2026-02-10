import * as PIXI from 'pixi.js';
import { GameBlockType, IGameBlock } from "../engine/Objects/GameBlock";
import { Tilemap } from "@pixi/tilemap";

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
  ];

  static levelBitmaps: ImageBitmap[] = [];
  static mainTexture: PIXI.TextureSource;
  static tileTextures: PIXI.Texture[] = [];
  public static levelData: ILevelData[] = [];

  public static async setupTilemap() {
    // let src = 'assets/TilemapBETTER.png';
    let src = 'assets/TilemapBASIC.png';

    const tilesetTexture: PIXI.TextureSource = await PIXI.Assets.load({
      src,
      data: {
        mipmap: false,
      }
    });
    const TILE_SIZE = 20;
    const TILES_PER_ROW = tilesetTexture.width / TILE_SIZE;

    this.mainTexture = tilesetTexture;

    for (let i = 0; i < 20; i++) {
      const x = (i % TILES_PER_ROW) * TILE_SIZE;
      const y = Math.floor(i / TILES_PER_ROW) * TILE_SIZE;

      this.tileTextures[i] = new PIXI.Texture({
        source: tilesetTexture,
        frame: new PIXI.Rectangle(x, y, TILE_SIZE, TILE_SIZE),
      });
    }
  }

  public static initialize(onComplete: () => void) {
    this.setupTilemap().then(() => {
      let levelsLeft = this.levelSources.length;
      this.levelSources.forEach((src, i) => {
        const img = new Image(); // Create a new HTMLImageElement
        img.src = src; // Set the source URL to start loading

        img.onload = () => {
            // The image is loaded and ready for use
            createImageBitmap(img).then(bitmap => {
              this.levelBitmaps[i] = bitmap;
              this.levelData[i] = this.makeLevelData(bitmap);
              levelsLeft--;
              if (levelsLeft === 0) onComplete();
            });
        };
      });
    });
  }

  public static makeLevelData(bitmap: ImageBitmap, pixelsPerBlock = 20): ILevelData {
    let canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    let data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let m: ILevelData = {
      blocks: [],
      width: bitmap.width * pixelsPerBlock,
      height: bitmap.height * pixelsPerBlock,
      img: new Tilemap(this.tileTextures.map(el => el.source)),
    };

    for (let x = 0; x < bitmap.width; x++) {
      for (let y = 0; y < bitmap.height; y++) {
        let index = (y * bitmap.width + x) * 4;
        let type = ColorMapping[`${data[index]},${data[index + 1]},${data[index + 2]}`];
        if (type === 'player') {
          m.startingPosition = {x: x * pixelsPerBlock, y: y * pixelsPerBlock};
        } else if (type) {
          m.blocks.push({
            x: x * pixelsPerBlock,
            y: y * pixelsPerBlock,
            width: pixelsPerBlock,
            height: pixelsPerBlock,
            type: type,
          });
          type !== 'exploding' && m.img.tile(TileMap[type],x * pixelsPerBlock,y * pixelsPerBlock, TileMapOptions[type]);
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
}

const ColorMapping: Record<string, GameBlockType> = {
  '0,255,0': 'normal',
  '255,255,0': 'spring',
  '255,170,0': 'exploding',
  '255,0,0': 'player',
  '255,255,255': 'goal',
  '0,0,0': 'ghost',
  '0,255,255': 'checkpoint',
}

enum TileMap {
  'normal' = 0,
  'spring' = 1,
  'exploding' = 2,
  'checkpoint' = 3,
  'goal' = 4,
  'ghost' = 5
}

const TileMapOptions: Record<GameBlockType, any> = {
  'normal': {u:0, v: 0, tileWidth: 20, tileHeight: 20},
  'spring': {u:20, v: 0, tileWidth: 20, tileHeight: 20},
  'exploding': {u:40, v: 0, tileWidth: 20, tileHeight: 20},
  'checkpoint': {u:60, v: 0, tileWidth: 20, tileHeight: 20},
  'goal': {u:80, v: 0, tileWidth: 20, tileHeight: 20},
  'ghost': {u:0, v: 20, tileWidth: 20, tileHeight: 20},
  'player': {u:0, v: 0, tileWidth: 20, tileHeight: 20},
  'switch': {u:0, v: 0, tileWidth: 20, tileHeight: 20},
  'door': {u:0, v: 0, tileWidth: 20, tileHeight: 20},
}

export interface ILevelData {
  blocks: IGameBlock[];
  width: number;
  height: number;
  startingPosition?: {x: number, y: number};
  img: Tilemap;
}