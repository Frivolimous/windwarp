import * as PIXI from 'pixi.js';
import { GameCanvas } from '../engine/Objects/GameCanvas';
import { GameControl } from '../engine/Mechanics/GameControl';
import { KeyboardControl } from '../services/KeyboardControl';
import { Facade } from '../main';
import { BaseUI } from './_BaseUI';
import { Button } from '../ui/Button';
import { GameTimer } from '../engine/Objects/GameTimer';

export class GameUI extends BaseUI {
  public canvas: GameCanvas;
  public control: GameControl;
  public keyboard: KeyboardControl;
  private timer = new GameTimer();
  
  
  constructor(worldBounds: PIXI.Rectangle, private ticker: PIXI.Ticker) {
    super();
    this.keyboard = new KeyboardControl();
    this.canvas = new GameCanvas(worldBounds);
    this.control = new GameControl(this.canvas, this.keyboard, this.timer);

    this.keyboard.disabled = true;

    let backB = new Button({buttonLabel: '<', onClick: () => Facade.setPage(Facade.mainPage), color: 0xffcc00, width: 40, height: 40, labelStyle: {fontSize: 20, fontWeight: 'bold'}});
    backB.position.set(30, 30);

    this.addChild(this.canvas, backB, this.timer);
  }

  public navIn = () => {
    this.keyboard.disabled = false;
    this.ticker.add(this.control.onTick);
    this.timer.position.set(Facade.worldBounds.width - 80, 20);
  }
  
  public navOut = () => {
    this.keyboard.disabled = true;
    this.ticker.remove(this.control.onTick);
  }
}