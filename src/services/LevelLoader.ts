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
    'assets/Level10.bmp',
  ];

  static TILE_SIZE = 24;
  static CHAR_SIZE = 24;
  static DRAW_OUTLINES = true;

  static levelBitmaps: ImageBitmap[] = [];
  static mainTexture: PIXI.TextureSource;
  static tileTextures: PIXI.Texture[] = [];
  public static levelData: ILevelData[] = [];

  static characterTexture: PIXI.TextureSource;
  static skins: PIXI.Texture[][] = [];

  public static async setupTilemap() {
    let src = 'assets/Tilemap24.png';

    let charSrc = 'assets/Characters24.png';

    const tilesetTexture: PIXI.TextureSource = await PIXI.Assets.load({
      src,
      data: {
        mipmap: false,
      }
    });

    const TILES_PER_ROW = tilesetTexture.width / this.TILE_SIZE;

    this.mainTexture = tilesetTexture;

    for (let i = 0; i < 20; i++) {
      const x = (i % TILES_PER_ROW) * this.TILE_SIZE;
      const y = Math.floor(i / TILES_PER_ROW) * this.TILE_SIZE;

      this.tileTextures[i] = new PIXI.Texture({
        source: tilesetTexture,
        frame: new PIXI.Rectangle(x, y, this.TILE_SIZE, this.TILE_SIZE),
      });
    }

    this.characterTexture = await PIXI.Assets.load({
      src: charSrc,
      data: {
        mipmap: false,
      }
    });

    const CHAR_TILES_PER_ROW = 6;

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

  public static makeLevelData(bitmap: ImageBitmap): ILevelData {
    let canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    let ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    let data = ctx.getImageData(0, 0, bitmap.width, bitmap.height).data;
    let m: ILevelData = {
      blocks: [],
      width: bitmap.width * LevelLoader.TILE_SIZE,
      height: bitmap.height * LevelLoader.TILE_SIZE,
      img: new Tilemap(this.tileTextures.map(el => el.source)),
    };

    // m.img.scale.set(0.5);

    for (let x = 0; x < bitmap.width; x++) {
      for (let y = 0; y < bitmap.height; y++) {
        let index = (y * bitmap.width + x) * 4;
        let type = ColorMapping[`${data[index]},${data[index + 1]},${data[index + 2]}`];
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
          type !== 'exploding' && m.img.tile(TileMap[type],x * LevelLoader.TILE_SIZE,y * LevelLoader.TILE_SIZE, TileMapOptions[type]);
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
  '0,0,0': 'secret',
  '0,255,255': 'checkpoint',
}

enum TileMap {
  'normal' = 0,
  'spring' = 1,
  'exploding' = 2,
  'checkpoint' = 3,
  'goal' = 4,
  'secret' = 5
}

const TileMapOptions: Record<GameBlockType, any> = {
  'normal': {u:0, v: 0, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
  'spring': {u:LevelLoader.TILE_SIZE, v: 0, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
  'exploding': {u:LevelLoader.TILE_SIZE*2, v: 0, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
  'checkpoint': {u:LevelLoader.TILE_SIZE*3, v: 0, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
  'goal': {u:LevelLoader.TILE_SIZE*4, v: 0, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
  'secret': {u:0, v: LevelLoader.TILE_SIZE, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
  'player': {u:0, v: 0, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
  'switch': {u:0, v: 0, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
  'door': {u:0, v: 0, tileWidth: LevelLoader.TILE_SIZE, tileHeight: LevelLoader.TILE_SIZE},
}

export interface ILevelData {
  blocks: IGameBlock[];
  width: number;
  height: number;
  startingPosition?: {x: number, y: number};
  img: Tilemap;
}