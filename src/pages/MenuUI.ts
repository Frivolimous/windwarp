import * as PIXI from 'pixi.js';
import { BaseUI } from './_BaseUI';
import { Button } from '../ui/Button';
import { Facade } from '../main';
import { SpriteButton } from '../ui/SpriteButton';
import { LevelLoader } from '../services/LevelLoader';

export class MenuUI extends BaseUI {
  playerB: Button;
  ghostB: Button;
  player1Avatar: SpriteButton;
  player2Avatar: SpriteButton;
  levelItems: LevelItem[] = [];

  constructor(bounds: PIXI.Rectangle) {
    super();
    let background = new PIXI.Graphics();
    background.rect(0, 0, bounds.width, bounds.height).fill(0x00ccff);
    
    let title = new PIXI.Text({text: 'Level Up Speed Run: D.A.D.A.!', style: {fontSize: 50}});
    title.position.set(25, 50);

    this.addChild(background, title);

    this.addColumn("Dad's Levels:", [['Loopy', 0], ['Super Obby', 4], ['Hurdles', 9]/*, ['Quicksand', 11]*/], 100, 150, 10);
    this.addColumn("Pizza Rainbow Levels:", [['The Mountains', 1], ['Fall Secrets', 7], ['Escape Room', 8]], 375, 150, 10);
    this.addColumn("Electric Orb Levels:", [['Treasure Hunt', 2], ['Sky Base', 3], ['AOAO', 5], ['Secret Passage', 6], ['Level AW', 10]], 675, 150, 10);

    this.ghostB = new Button({buttonLabel: 'Replay Ghost', onClick: this.toggleGhost, color: 0x00ccff, width: 90, height: 30, labelStyle: {fontSize: 15 }});
    this.ghostB.position.set(50, 505);

    this.playerB = new Button({buttonLabel: 'One Player', onClick: this.togglePlayerCount, color: 0xccff66, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    this.playerB.position.set(275, 500);

    this.player1Avatar = new SpriteButton({texture: LevelLoader.skins[0][2], onClick: () => this.toggleAvatar(0), color: 0xffcc00, width: 40, height: 40, spriteScale: 0.9});
    this.player2Avatar = new SpriteButton({texture: LevelLoader.skins[3][2], onClick: () => this.toggleAvatar(1), color: 0xee8833, width: 40, height: 40, spriteScale: 0.9});
    this.player1Avatar.position.set(435, 500);
    this.player2Avatar.position.set(485, 500);
    this.player2Avatar.visible = false;

    this.addChild(this.playerB);
    this.addChild(this.player1Avatar);
    this.addChild(this.player2Avatar);
    this.addChild(this.ghostB);
  }

  public addColumn(columnName: string, levelArray: [string, number][], centerX: number, top: number, gap: number) {
    let title = new PIXI.Text({text: columnName, style: {fontSize: 25}});
    title.position.set(centerX - title.width / 2, top);
    this.addChild(title);


    levelArray.forEach((el, i) => {
      let item = new LevelItem(el[0], el[1], this.startLevel);
      this.levelItems.push(item);
      item.position.set(centerX - 75, top + 40 + (40 + gap) * i);
      this.addChild(item);
    });
  }

  public startLevel(i: number) {
    Facade.gamePage.control.loadLevel(i);
    Facade.setPage(Facade.gamePage);
  }

  public togglePlayerCount = () => {
    Facade.gamePage.control.togglePlayerCount();
    if (Facade.gamePage.control.TWO_PLAYER) {
      this.playerB.addLabel('Two Players');
      this.player2Avatar.visible = true;
    } else {
      this.playerB.addLabel('One Player');
      this.player2Avatar.visible = false;
    }
  }

  public toggleAvatar(playerIndex = 0) {
    if (playerIndex === 0) {
      let player = Facade.gamePage.control.player;
      player.nextSkin(1);
      this.player1Avatar.addTexture(player.head.texture);
    } else {
      let player = Facade.gamePage.control.player2;
      player.nextSkin(1);
      this.player2Avatar.addTexture(player.head.texture);
    }
  }

  public toggleGhost = () => {
      // GHOST_MODE: 'off' | 'live' | 'replay' = 'off';
    switch(Facade.gamePage.control.GHOST_MODE) {
      // case 'off': Facade.gamePage.control.GHOST_MODE = 'live'; this.ghostB.addLabel('Live Ghost'); break;
      // case 'live': Facade.gamePage.control.GHOST_MODE = 'replay'; this.ghostB.addLabel('Replay'); break;
      // case 'replay': Facade.gamePage.control.GHOST_MODE = 'off'; this.ghostB.addLabel('No Ghost'); break;
      case 'off': Facade.gamePage.control.GHOST_MODE = 'replay'; this.ghostB.addLabel('Replay Ghost'); break;
      case 'replay': Facade.gamePage.control.GHOST_MODE = 'off'; this.ghostB.addLabel('No Ghost'); break;
    }
  }

  public navIn = () => {
    Facade.gamePage.control.player && this.player1Avatar.addTexture(Facade.gamePage.control.player.head.texture);
    Facade.gamePage.control.player2 && this.player2Avatar.addTexture(Facade.gamePage.control.player2.head.texture);

    let extrinsic = Facade.saveM.getExtrinsic();

    extrinsic.levelGhosts.forEach(ghost => {
      let item = this.levelItems.find(el => el.index === ghost.mapId);
      if (item) {
        item.updateTime(ghost.time);
      }
    })
  }

  public navOut = () => {

  }
}

class LevelItem extends PIXI.Container{
  button: Button;
  highscore: PIXI.Text;


  constructor(name: string, public index: number, onClick: (index: number) => void) {
    super();
    this.button = new Button({buttonLabel: name, onClick: () => onClick(index), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    this.addChild(this.button);
  }

  updateTime(time: number) {
    if (!this.highscore) {
      this.highscore = new PIXI.Text({style: {fontSize: 12}});
      this.highscore.position.set(155, 14);
      this.addChild(this.highscore);
    }
    let minutes = Math.floor(time / 60);
    let seconds = Math.floor(time - minutes * 60);
    let milli = Math.floor((time - Math.floor(time)) * 1000);

    this.highscore.text = `${this.addZeroes(minutes, 1)}:${this.addZeroes(seconds, 2)}:${this.addZeroes(milli, 3)}`;
  }

  addZeroes(n: number, digits: number) {
    let s = n.toString();

    while (s.length < digits) {
      s = '0' + s;
    }

    return s;
  }
}

// export interface IButton {
//   color?: number;
//   width?: number;
//   height?: number;
//   rounding?: number;
//   buttonLabel?: string;
//   labelStyle?: any;
//   onClick: () => void;
//   hoverScale?: number;
// }