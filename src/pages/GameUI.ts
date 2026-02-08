import * as PIXI from 'pixi.js';
import { GameCanvas } from '../engine/Objects/GameCanvas';
import { GameControl } from '../engine/Mechanics/GameControl';
import { KeyboardControl } from '../services/KeyboardControl';
import { Facade } from '../main';
import { BaseUI } from './_BaseUI';
import { Button } from '../ui/Button';

export class GameUI extends BaseUI {
  public canvas: GameCanvas;
  public control: GameControl;
  public keyboard: KeyboardControl;
  
  constructor(worldBounds: PIXI.Rectangle, private ticker: PIXI.Ticker) {
    super();
    this.keyboard = new KeyboardControl();
    this.canvas = new GameCanvas(worldBounds.width, worldBounds.height, 1);
    this.control = new GameControl(this.canvas, this.keyboard);

    this.keyboard.disabled = true;

    let backB = new Button({buttonLabel: '<<', onClick: () => Facade.setPage(Facade.mainPage), color: 0xffcc00, width: 80, height: 80, labelStyle: {fontSize: 40, fontWeight: 'bold'}});
    backB.position.set(50, 50);
    this.addChild(this.canvas, backB);
  }

  public navIn = () => {
    this.keyboard.disabled = false;
    this.ticker.add(this.control.onTick);
    this.control.loadLevel(this.control.currentLevelIndex);
  }
  
  public navOut = () => {
    this.keyboard.disabled = true;
    this.ticker.remove(this.control.onTick);
  }
}