import * as PIXI from "pixi.js";
import _ from 'lodash';
import { Firework } from "./JMGE/effects/Firework";
import { GameEvents } from "./services/GameEvents";
import { Debug } from "./services/_Debug";
import { GameCanvas } from "./engine/Objects/GameCanvas";
import { FontLoader } from "./services/FontLoader";
import { Fonts } from "./data/Fonts";
import { GameControl } from "./engine/Mechanics/GameControl";
import { KeyboardControl } from "./services/KeyboardControl";

export let interactionMode: 'desktop' | 'mobile' = 'desktop';

export const Facade = new class {
  public app: PIXI.Application;
  public canvas: GameCanvas;
  public control: GameControl;
  public keyboard: KeyboardControl;

  //public saveManager

  constructor() {
        try {
      document.createEvent('TouchEvent');
      interactionMode = 'mobile';
    } catch (e) {}

    this.initializeApplication();
  }

  async initializeApplication() {
    this.app = new PIXI.Application();

    await this.app.init({
      width: 1900/4,
      height: 1200/4,
      backgroundColor: 0x1e1e1e
    });
    let holder = document.getElementById('canvas-holder');
    holder.appendChild(this.app.canvas as HTMLCanvasElement);
    
    let reporting = document.getElementById('debug-reporting') as HTMLDivElement;
    Debug.initialize(this.app, reporting);
    GameEvents.APP_LOG.publish({type: 'INITIALIZE', text: 'Primary Setup'})
    
    // await FontLoader.load(_.map(Fonts));

    this.init();
  }

  init() {
    this.keyboard = new KeyboardControl();
    this.canvas = new GameCanvas(1900, 1200, 1/4);
    this.control = new GameControl(this.canvas, this.keyboard);
    this.app.ticker.add(this.control.onTick);

    this.app.stage.addChild(this.canvas);
    GameEvents.APP_LOG.publish({type: 'INITIALIZE', text: 'Setup Complete'});
  }
}


// // test object
// const box = new PIXI.Graphics();
// box.rect(0, 0, 50, 50);
// box.fill(0xff3366);
// box.x = 100;
// box.y = 100;

// app.stage.addChild(box);

// // minimal loop
// app.ticker.add(() => {
//   box.x += 1;
// });
