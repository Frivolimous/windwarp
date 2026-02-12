import * as PIXI from 'pixi.js';
import { GameBlockType, IGameBlock } from "../engine/Objects/GameBlock";
import { Tilemap } from "@pixi/tilemap";

// 16 option version

export class LevelLoader2 {
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

  static levelBitmaps: ImageBitmap[] = [];
  static mainTexture: PIXI.TextureSource;
  static tileTextures: PIXI.Texture[] = [];
  public static levelData: ILevelData[] = [];

  static characterTexture: PIXI.TextureSource;
  static skins: PIXI.Texture[][] = [];

  public static async setupTilemap() {
    let src = 'assets/TilemapBigger.png';
    // let src = 'assets/TilemapBETTER.png';
    // let src = 'assets/TilemapBASIC.png';
    // let src = 'assets/TilemapGIRL.png';
    // let src = 'assets/TilemapBOY.png';

    let charSrc = 'assets/CharactersEXPANDED.png';

    const tilesetTexture: PIXI.TextureSource = await PIXI.Assets.load({
      src,
      data: {
        mipmap: false,
      }
    });

    const TILE_SIZE = 32;
    const TILES_PER_ROW = tilesetTexture.width / TILE_SIZE;

    this.mainTexture = tilesetTexture;

    for (let i = 0; i < 12 * 8; i++) {
      const x = (i % TILES_PER_ROW) * TILE_SIZE;
      const y = Math.floor(i / TILES_PER_ROW) * TILE_SIZE;

      this.tileTextures[i] = new PIXI.Texture({
        source: tilesetTexture,
        frame: new PIXI.Rectangle(x, y, TILE_SIZE, TILE_SIZE),
      });
    }

    let CHAR_SIZE = 20;
    this.characterTexture = await PIXI.Assets.load({
      src: charSrc,
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
          frame: new PIXI.Rectangle(x * CHAR_SIZE, y * CHAR_SIZE, CHAR_SIZE, CHAR_SIZE),
        }));
      }
      skin = [];
      this.skins.push(skin);
      for (let x = 3; x < 6; x++) {
        skin.push(new PIXI.Texture({
          source: this.characterTexture,
          frame: new PIXI.Rectangle(x * CHAR_SIZE, y * CHAR_SIZE, CHAR_SIZE, CHAR_SIZE),
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

  public static makeLevelData(bitmap: ImageBitmap, pixelsPerBlock = 32): ILevelData {
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

    // m.img.scale.set(0.5);

    let typeMap: GameBlockType[][] = [];

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
          m.startingPosition = {x: x * pixelsPerBlock, y: y * pixelsPerBlock};
        } else if (type) {
          m.blocks.push({
            x: x * pixelsPerBlock,
            y: y * pixelsPerBlock,
            width: pixelsPerBlock,
            height: pixelsPerBlock,
            type: type,
          });

          if (type !== 'exploding') {
            let adjacents = {
              up: y > 0 && typeMap[x][y - 1] === type,
              left: x > 0 && typeMap[x - 1][y] === type,
              down: y < bitmap.height - 1 && typeMap[x][y + 1] === type,
              right: x < bitmap.width - 1 && typeMap[x + 1][y] === type,
            }
  
            let options = this.getTileMapOption(type, adjacents);
            // m.img.tile(3,x * pixelsPerBlock,y * pixelsPerBlock, options);
            m.img.tile(this.getTileMapIndex(type, adjacents),x * pixelsPerBlock,y * pixelsPerBlock, options);
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

  public static getColorAt(data: ImageDataArray, width: number, x: number, y: number): GameBlockType {
    let index = (y * width + x) * 4;
    return ColorMapping[`${data[index]},${data[index + 1]},${data[index + 2]}`];
  }

  public static getTileMapOption(type: GameBlockType, adjacents: {up: boolean, left: boolean, right: boolean, down: boolean}) {
    let setIndex = 0;
    let str = (adjacents.up ? 'T' : 'F') + (adjacents.left ? 'T' : 'F') + (adjacents.down ? 'T' : 'F') + (adjacents.right ? 'T' : 'F');
    let offX = 0;
    let offY = 0;
    switch (str) {
      case 'FFFF': offX = 0; offY = 3; break;
      case 'FFFT': offX = 1; offY = 3; break;
      case 'FFTF': offX = 3; offY = 0; break;
      case 'FTFF': offX = 3; offY = 3; break;
      case 'TFFF': offX = 3; offY = 2; break;
      case 'FFTT': offX = 0; offY = 0; break;
      case 'FTFT': offX = 2; offY = 3; break;
      case 'TFFT': offX = 0; offY = 2; break;
      case 'FTTF': offX = 2; offY = 0; break;
      case 'TFTF': offX = 3; offY = 1; break;
      case 'TTFF': offX = 2; offY = 2; break;
      case 'FTTT': offX = 1; offY = 0; break;
      case 'TFTT': offX = 0; offY = 1; break;
      case 'TTFT': offX = 1; offY = 2; break;
      case 'TTTF': offX = 2; offY = 1; break;
      case 'TTTT': offX = 1; offY = 1; break;
    }

    return {u: offX * 32, v: offY * 32, tileWidth: 32, tileHeight: 32};
  }

  public static getTileMapIndex(type: GameBlockType, adjacents: {up: boolean, left: boolean, right: boolean, down: boolean}) {
    let setIndex = 0;
    let str = (adjacents.up ? 'T' : 'F') + (adjacents.left ? 'T' : 'F') + (adjacents.down ? 'T' : 'F') + (adjacents.right ? 'T' : 'F');
    let offX = 0;
    let offY = 0;
    switch (str) {
      case 'FFFF': offX = 0; offY = 3; break;
      case 'FFFT': offX = 1; offY = 3; break;
      case 'FFTF': offX = 3; offY = 0; break;
      case 'FTFF': offX = 3; offY = 3; break;
      case 'TFFF': offX = 3; offY = 2; break;
      case 'FFTT': offX = 0; offY = 0; break;
      case 'FTFT': offX = 2; offY = 3; break;
      case 'TFFT': offX = 0; offY = 2; break;
      case 'FTTF': offX = 2; offY = 0; break;
      case 'TFTF': offX = 3; offY = 1; break;
      case 'TTFF': offX = 2; offY = 2; break;
      case 'FTTT': offX = 1; offY = 0; break;
      case 'TFTT': offX = 0; offY = 1; break;
      case 'TTFT': offX = 1; offY = 2; break;
      case 'TTTF': offX = 2; offY = 1; break;
      case 'TTTT': offX = 1; offY = 1; break;
    }

    return (setIndex + offX + offY * 12);
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

export interface ILevelData {
  blocks: IGameBlock[];
  width: number;
  height: number;
  startingPosition?: {x: number, y: number};
  img: Tilemap;
}