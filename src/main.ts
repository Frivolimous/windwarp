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
import { TextureCache } from "./services/TextureCache";

export let interactionMode: 'desktop' | 'mobile' = 'desktop';

export const Facade = new class {
  public app: PIXI.Application;
  public canvas: GameCanvas;
  public control: GameControl;
  public keyboard: KeyboardControl;

  public worldBounds = new PIXI.Rectangle(0, 0, 1900, 1200);
  public scale = 0.5;

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
      width: this.worldBounds.width * this.scale,
      height: this.worldBounds.height * this.scale,
      backgroundColor: 0x1e1e1e
    });
    let holder = document.getElementById('canvas-holder');
    holder.appendChild(this.app.canvas as HTMLCanvasElement);
    
    let reporting = document.getElementById('debug-reporting') as HTMLDivElement;
    Debug.initialize(this.app, reporting);
    GameEvents.APP_LOG.publish({type: 'INITIALIZE', text: 'Primary Setup'});

    TextureCache.initialize(this.app);
    
    // await FontLoader.load(_.map(Fonts));

    this.init();
  }

  init() {
    this.keyboard = new KeyboardControl();
    this.canvas = new GameCanvas(this.worldBounds.width, this.worldBounds.height, this.scale);
    this.control = new GameControl(this.canvas, this.keyboard);
    this.app.ticker.add(this.control.onTick);

    this.app.stage.addChild(this.canvas);
    GameEvents.APP_LOG.publish({type: 'INITIALIZE', text: 'Setup Complete'});
  }
}
