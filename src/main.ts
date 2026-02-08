import * as PIXI from "pixi.js";
import _ from 'lodash';
import { GameEvents } from "./services/GameEvents";
import { Debug } from "./services/_Debug";
import { GameCanvas } from "./engine/Objects/GameCanvas";
import { GameControl } from "./engine/Mechanics/GameControl";
import { KeyboardControl } from "./services/KeyboardControl";
import { TextureCache } from "./services/TextureCache";
import { LevelLoader } from "./services/LevelLoader";
import { MenuUI } from "./pages/MenuUI";
import { GameUI } from "./pages/GameUI";
import { BaseUI } from "./pages/_BaseUI";
import { JMTween } from "./JMGE/JMTween";

export let interactionMode: 'desktop' | 'mobile' = 'desktop';

export const Facade = new class {
  public app: PIXI.Application;

  public worldBounds = new PIXI.Rectangle(0, 0, 950, 600);

  public mainPage: MenuUI;
  public gamePage: GameUI;
  public blackScreen = new PIXI.Graphics();

  public currentPage: BaseUI;

  constructor() {
    try {
      document.createEvent('TouchEvent');
      interactionMode = 'mobile';
    } catch (e) {}

    this.initializeApplication();
    this.initializeBitmapSelect();
  }

  async initializeApplication() {
    this.app = new PIXI.Application();

    await this.app.init({
      width: this.worldBounds.width,
      height: this.worldBounds.height,
      backgroundColor: 0x1e1e1e
    });
    let holder = document.getElementById('canvas-holder');
    holder.appendChild(this.app.canvas as HTMLCanvasElement);
    
    let reporting = document.getElementById('debug-reporting') as HTMLDivElement;
    Debug.initialize(this.app, reporting);
    GameEvents.APP_LOG.publish({type: 'INITIALIZE', text: 'Primary Setup'});

    TextureCache.initialize(this.app);

    // await FontLoader.load(_.map(Fonts));

    LevelLoader.initialize(() => this.init());    
  }

  init() {
    this.mainPage = new MenuUI(this.worldBounds);
    this.gamePage = new GameUI(this.worldBounds, this.app.ticker);

    this.blackScreen.rect(0, 0, this.worldBounds.width, this.worldBounds.height).fill(0);

    this.setPage(this.mainPage);

    GameEvents.APP_LOG.publish({type: 'INITIALIZE', text: 'Setup Complete'});
  }

  transition = false;
  setPage(page: BaseUI) {
    if (this.transition) return;
    this.transition = true;

    this.app.stage.addChild(this.blackScreen);
    this.blackScreen.alpha = 0;
    new JMTween(this.blackScreen, 200).to({alpha: 1}).start().onComplete(() => {
      if (this.currentPage) {
        this.currentPage.navOut();
        this.app.stage.removeChild(this.currentPage);
      }

      this.currentPage = page;
      this.app.stage.addChildAt(page, 0);
      page.navIn();
      new JMTween(this.blackScreen, 200).to({alpha: 0}).start().onComplete(() => {
        this.app.stage.removeChild(this.blackScreen)
        this.transition = false;
      });
    });
  }

  initializeBitmapSelect() {
    let input = document.getElementById('level-select') as HTMLInputElement;
    input.addEventListener("input", (e: BlobEvent) => {
      let file = (e.target as HTMLInputElement).files[0];
      console.log(file);
      
      var reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = readerEvent => {
        var content = readerEvent.target.result;
        const img = new Image();
        img.src = content as string;
        img.onload = () => {
          createImageBitmap(img).then(bitmap => {
            let level = LevelLoader.makeLevelData(bitmap);
            Facade.gamePage.control.loadLevelFromData(level);
          });
        }
      }
    });
  }
}
