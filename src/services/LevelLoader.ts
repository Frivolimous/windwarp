import { GameBlockType, IGameBlock } from "../engine/Objects/GameBlock";

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
  public static levelData: ILevelData[] = [];

  public static initialize(onComplete: () => void) {
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
  }

  public static makeLevelData(bitmap: ImageBitmap, pixelsPerBlock = 40): ILevelData {
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

export interface ILevelData {
  blocks: IGameBlock[];
  width: number;
  height: number;
  startingPosition?: {x: number, y: number};
}