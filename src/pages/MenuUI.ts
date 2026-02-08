import * as PIXI from 'pixi.js';
import { BaseUI } from './_BaseUI';
import { Button } from '../ui/Button';
import { Facade } from '../main';

export class MenuUI extends BaseUI {
  constructor(bounds: PIXI.Rectangle) {
    super();
    let background = new PIXI.Graphics();
    background.rect(0, 0, bounds.width, bounds.height).fill(0x00ccff);
    
    let title = new PIXI.Text({text: 'Skeleton Warrior Speed Run!', style: {fontSize: 50}});
    title.position.set(25, 50);
    
    let abaLevels = new PIXI.Text({text: "Aba's Levels:", style: {fontSize: 25}});
    let aba1 = new Button({buttonLabel: 'Loopy', onClick: () => this.startLevel(0), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let aba2 = new Button({buttonLabel: 'Long One', onClick: () => this.startLevel(4), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    abaLevels.position.set(25, 150);
    aba1.position.set(25, 190);
    aba2.position.set(25, 240);
    
    let talyaLevels = new PIXI.Text({text: "Talya's Levels:", style: {fontSize: 25}});
    let talya1 = new Button({buttonLabel: 'Run Run Run', onClick: () => this.startLevel(1), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let talya2 = new Button({buttonLabel: 'Super Fall', onClick: () => this.startLevel(7), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let talya3 = new Button({buttonLabel: 'Escape Room', onClick: () => this.startLevel(8), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    talyaLevels.position.set(275, 150);
    talya1.position.set(275, 190);
    talya2.position.set(275, 240);
    talya3.position.set(275, 290);
    
    let oriLevels = new PIXI.Text({text: "Ori's Levels:", style: {fontSize: 25}});
    let ori1 = new Button({buttonLabel: 'Treasure Hunt', onClick: () => this.startLevel(2), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let ori2 = new Button({buttonLabel: 'Sky Base', onClick: () => this.startLevel(3), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let ori3 = new Button({buttonLabel: 'Long Run', onClick: () => this.startLevel(5), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    let ori4 = new Button({buttonLabel: 'Secret Passage', onClick: () => this.startLevel(6), color: 0xffcc00, width: 150, height: 40, labelStyle: {fontSize: 20 }});
    oriLevels.position.set(525, 150);
    ori1.position.set(525, 190);
    ori2.position.set(525, 240);
    ori3.position.set(525, 290);
    ori4.position.set(525, 340);
    
    this.addChild(background, title);
    this.addChild(abaLevels, aba1, aba2);
    this.addChild(talyaLevels, talya1, talya2, talya3);
    this.addChild(oriLevels, ori1, ori2, ori3, ori4);
  }

  public startLevel(i: number) {
    Facade.gamePage.control.loadLevel(i);
    Facade.setPage(Facade.gamePage);
  }

  public navIn = () => {

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