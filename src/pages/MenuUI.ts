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

  constructor(bounds: PIXI.Rectangle) {
    super();
    let background = new PIXI.Graphics();
    background.rect(0, 0, bounds.width, bounds.height).fill(0x00ccff);
    
    let title = new PIXI.Text({text: 'Level Up Speed Run: D.A.D.A.!', style: {fontSize: 50}});
    title.position.set(25, 50);
    
    let abaLevels = new PIXI.Text({text: "Aba's Levels:", style: {fontSize: 25}});
    let aba1 = new Button({buttonLabel: 'Loopy', onClick: () => this.startLevel(0), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let aba2 = new Button({buttonLabel: 'Super Obby', onClick: () => this.startLevel(4), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let aba3 = new Button({buttonLabel: 'Hurdles', onClick: () => this.startLevel(9), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let aba4 = new Button({buttonLabel: 'Quicksand', onClick: () => this.startLevel(11), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    abaLevels.position.set(25, 150);
    aba1.position.set(25, 190);
    aba2.position.set(25, 240);
    aba3.position.set(25, 290);
    aba4.position.set(25, 340);
    
    let talyaLevels = new PIXI.Text({text: "Talya's Levels:", style: {fontSize: 25}});
    let talya1 = new Button({buttonLabel: 'The Mountains', onClick: () => this.startLevel(1), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let talya2 = new Button({buttonLabel: 'Fall Secrets', onClick: () => this.startLevel(7), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let talya3 = new Button({buttonLabel: 'Escape Room', onClick: () => this.startLevel(8), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    talyaLevels.position.set(275, 150);
    talya1.position.set(275, 190);
    talya2.position.set(275, 240);
    talya3.position.set(275, 290);
    
    let oriLevels = new PIXI.Text({text: "Ori's Levels:", style: {fontSize: 25}});
    let ori1 = new Button({buttonLabel: 'Treasure Hunt', onClick: () => this.startLevel(2), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let ori2 = new Button({buttonLabel: 'Sky Base', onClick: () => this.startLevel(3), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let ori3 = new Button({buttonLabel: 'AOAO', onClick: () => this.startLevel(5), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let ori4 = new Button({buttonLabel: 'Secret Passage', onClick: () => this.startLevel(6), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let ori5 = new Button({buttonLabel: 'Level AW', onClick: () => this.startLevel(10), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    oriLevels.position.set(525, 150);
    ori1.position.set(525, 190);
    ori2.position.set(525, 240);
    ori3.position.set(525, 290);
    ori4.position.set(525, 340);
    ori5.position.set(525, 390);

    this.ghostB = new Button({buttonLabel: 'No Ghost', onClick: this.toggleGhost, color: 0x00ccff, width: 90, height: 30, labelStyle: {fontSize: 15 }});
    this.ghostB.position.set(50, 505);

    this.playerB = new Button({buttonLabel: 'One Player', onClick: this.togglePlayerCount, color: 0xccff66, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    this.playerB.position.set(275, 500);

    this.player1Avatar = new SpriteButton({texture: LevelLoader.skins[0][2], onClick: () => this.toggleAvatar(0), color: 0xffcc00, width: 40, height: 40, spriteScale: 0.9});
    this.player2Avatar = new SpriteButton({texture: LevelLoader.skins[3][2], onClick: () => this.toggleAvatar(1), color: 0xee8833, width: 40, height: 40, spriteScale: 0.9});
    this.player1Avatar.position.set(435, 500);
    this.player2Avatar.position.set(485, 500);
    this.player2Avatar.visible = false;

    this.addChild(background, title);
    this.addChild(abaLevels, aba1, aba2, aba3, aba4);
    this.addChild(talyaLevels, talya1, talya2, talya3);
    this.addChild(oriLevels, ori1, ori2, ori3, ori4, ori5);

    this.addChild(this.playerB, this.player1Avatar, this.player2Avatar);
    this.addChild(this.ghostB);
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
      case 'off': Facade.gamePage.control.GHOST_MODE = 'live'; this.ghostB.addLabel('Live Ghost'); break;
      case 'live': Facade.gamePage.control.GHOST_MODE = 'replay'; this.ghostB.addLabel('Replay'); break;
      case 'replay': Facade.gamePage.control.GHOST_MODE = 'off'; this.ghostB.addLabel('No Ghost'); break;
    }
  }

  public navIn = () => {
    Facade.gamePage.control.player && this.player1Avatar.addTexture(Facade.gamePage.control.player.head.texture);
    Facade.gamePage.control.player2 && this.player2Avatar.addTexture(Facade.gamePage.control.player2.head.texture);
  }

  public navOut = () => {

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