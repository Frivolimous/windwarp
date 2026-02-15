import * as PIXI from 'pixi.js';
import _ from 'lodash';
import { Firework } from "../../JMGE/effects/Firework";
import { Facade } from "../../main";
import { GameEvents } from "../../services/GameEvents";
import { KeyboardControl } from "../../services/KeyboardControl";
import { ILevelData, LevelLoader } from "../../services/LevelLoader";
import { IGameBlock } from "../Objects/GameBlock";
import { GameCamera } from "../Objects/GameCamera";
import { GameCanvas } from "../Objects/GameCanvas";
import { GameEnvironment } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";
import { PlayerMovement } from "./PlayerMovement";
import { GameTimer } from '../Objects/GameTimer';
import { InputStream } from '../../services/InputStream';

export class GameControl {
  GHOST_MODE: 'off' | 'live' | 'replay' = 'off';
  TWO_PLAYER = false;
  public currentLevelIndex: number = 4;
  s
  public player: PlayerSprite;
  public player2: PlayerSprite;
  public ghostPlayer: PlayerSprite;

  private playerMovement: PlayerMovement;
  private gameEnvironment: GameEnvironment;
  private camera: GameCamera;
  private running = true;
  private timer = new GameTimer();
  private levelCompleteText = new PIXI.Text({ text: 'Level Complete!', style: { fontSize: 40, fill: 0xffffff, dropShadow: { color: 0, blur: 4, distance: 6 } } });
  private gameStartText = new PIXI.Text({ text: 'Press any key to start', style: { fontSize: 40, fill: 0xffffff, dropShadow: { color: 0, blur: 4, distance: 6 } } });

  private recordingStream: InputStream;
  private replayingStream: InputStream;

  constructor(private canvas: GameCanvas, private keyboard: KeyboardControl) {
    this.gameEnvironment = new GameEnvironment(canvas);
    this.playerMovement = new PlayerMovement(this.gameEnvironment);
    this.camera = new GameCamera(this.canvas);
    this.timer.position.set(Facade.worldBounds.width - 80, 20);

    this.levelCompleteText.anchor.set(0.5);
    this.levelCompleteText.position.set(this.camera.viewWidth / 2, this.camera.viewHeight / 2);

    this.gameStartText.anchor.set(0.5);
    this.gameStartText.position.set(this.camera.viewWidth / 2, this.camera.viewHeight / 2);

    this.player = new PlayerSprite();
    this.player.nextSkin(0);
    this.canvas.addPlayer(this.player);

    this.player2 = new PlayerSprite();
    this.player2.nextSkin(3);
    
    GameEvents.SWITCH_ACTIVATED.addListener((block: IGameBlock) => {
      let subtype = block.subtype;
      this.canvas.blocks.forEach(obj => {
        if (obj.config.type === 'door' && obj.config.subtype === subtype) {
          obj.shrinkAway();
        }
      });
    });

    GameEvents.LEVEL_COMPLETE.addListener(() => {
      this.running = false;
      this.loopingFireworks();
      this.levelCompleteText.text = `Level Complete!\n  Time: ${(this.timer.getTime() / 1000).toFixed(2)}s`;
      this.canvas.layers[GameCanvas.UI].addChild(this.levelCompleteText);
    });
    this.canvas.addEventListener('mousedown', e => {
      let position = e.getLocalPosition(this.canvas);
      Firework.makeExplosion(this.canvas.layers[GameCanvas.UI], { x: position.x, y: position.y });
    });
  }

  togglePlayerCount = () => {
    this.TWO_PLAYER = !this.TWO_PLAYER;
  }

  loopingFireworks() {
    setTimeout(() => {
      Firework.makeExplosion(this.canvas.layers[GameCanvas.UI], { x: Math.random() * this.camera.viewWidth, y: Math.random() * this.camera.viewHeight, tint: Math.random() * 0xffffff });
      if (!this.running) this.loopingFireworks();
    }, 50);
  }

  loadLevel(i: number) {
    this.currentLevelIndex = i;
    this.running = true;
    LevelLoader.makeLevelDataFromUrl(LevelLoader.levelSources[i]).then(data => this.loadLevelFromData(data))
  }

  loadLevelFromData(data: ILevelData) {
    Facade.gamePage.addChild(this.timer);
    this.timer.reset();
    this.timer.pause();
    this.canvas.layers[GameCanvas.UI].removeChild(this.levelCompleteText);

    this.gameEnvironment.setupLevel(data);
    this.canvas.addConfig(data);

    this.player.position.set(data.startingPosition.x, data.startingPosition.y);
    this.player.reset();
    
    if (this.TWO_PLAYER) {
      this.player2.position.set(data.startingPosition.x, data.startingPosition.y);
      this.player2.reset();
      this.canvas.addPlayer(this.player2);
    } else {
      this.canvas.removePlayer(this.player2);
    }

    this.setupKeys();
    this.setupGhost(data);

    this.camera.update(this.player, true);

    this.running = false;
    window.requestAnimationFrame(() => {
      this.canvas.layers[GameCanvas.UI].addChild(this.gameStartText);
      this.keyboard.onAnyKey(() => {
        this.running = true;
        this.gameStartText.parent.removeChild(this.gameStartText);
        this.timer.start();
      });
    });
  }

  addGhostPlayer() {
    if (!this.ghostPlayer) {
        this.ghostPlayer = new PlayerSprite();
        this.ghostPlayer.nextSkin(0);
        this.ghostPlayer.makeGhost();
        this.canvas.layers[GameCanvas.PLAYER].addChildAt(this.ghostPlayer, 0);
    }
  }

  setupGhost(data: ILevelData) {
    if (this.GHOST_MODE === 'replay') {
      if (this.recordingStream && this.recordingStream.mapId === this.currentLevelIndex) {
        this.replayingStream = this.recordingStream;
        this.replayingStream.resetPlayback();

        this.addGhostPlayer();

        this.ghostPlayer.position.set(data.startingPosition.x, data.startingPosition.y);
        this.ghostPlayer.reset();
      }

      this.recordingStream = new InputStream(this.currentLevelIndex);
    } else if (this.GHOST_MODE === 'live') {
      let stream = new InputStream(this.currentLevelIndex);
      this.recordingStream = stream;
      this.replayingStream = stream;
      stream.resetPlayback();
      stream.replayingStep = -50;

      this.addGhostPlayer();

      this.ghostPlayer.position.set(data.startingPosition.x, data.startingPosition.y);
      this.ghostPlayer.reset();
    } else {
      if (this.ghostPlayer) {
        this.canvas.removePlayer(this.ghostPlayer);
        this.ghostPlayer = null;
      }
    }
  }

  setupKeys() {
    this.keyboard.clear();

    if (this.TWO_PLAYER) {
      this.keyboard.addKey({ keys: ['w'], onDown: () => this.player.keys.up = true, onUp: () => this.player.keys.up = false });
      this.keyboard.addKey({ keys: ['a'], onDown: () => this.player.keys.left = true, onUp: () => this.player.keys.left = false });
      this.keyboard.addKey({ keys: ['s'], onDown: () => this.player.keys.down = true, onUp: () => this.player.keys.down = false });
      this.keyboard.addKey({ keys: ['d'], onDown: () => this.player.keys.right = true, onUp: () => this.player.keys.right = false });
      this.keyboard.addKey({ keys: ['x'], onDown: () => this.player.keys.jetpack = true, onUp: () => this.player.keys.jetpack = false });
      this.keyboard.addKey({ keys: ['q'], onDown: () => this.player.nextSkin(1) });
      this.keyboard.addKey({ keys: ['e'], onDown: () => this.player.nextSkin(-1) });

      this.keyboard.addKey({ keys: ['arrowup', ' '], onDown: () => this.player2.keys.up = true, onUp: () => this.player2.keys.up = false });
      this.keyboard.addKey({ keys: ['arrowleft'], onDown: () => this.player2.keys.left = true, onUp: () => this.player2.keys.left = false });
      this.keyboard.addKey({ keys: ['arrowdown'], onDown: () => this.player2.keys.down = true, onUp: () => this.player2.keys.down = false });
      this.keyboard.addKey({ keys: ['arrowright'], onDown: () => this.player2.keys.right = true, onUp: () => this.player2.keys.right = false });
      this.keyboard.addKey({ keys: ['/', 'v'], onDown: () => this.player2.keys.jetpack = true, onUp: () => this.player2.keys.jetpack = false });
      this.keyboard.addKey({ keys: ['.'], onDown: () => this.player2.nextSkin(1) });
      this.keyboard.addKey({ keys: [','], onDown: () => this.player2.nextSkin(-1) });
    } else {
      this.keyboard.addKey({ keys: ['w', ' ', 'arrowup'], onDown: () => this.player.keys.up = true, onUp: () => this.player.keys.up = false });
      this.keyboard.addKey({ keys: ['a', 'arrowleft'], onDown: () => this.player.keys.left = true, onUp: () => this.player.keys.left = false });
      this.keyboard.addKey({ keys: ['s', 'arrowdown', 'control'], onDown: () => this.player.keys.down = true, onUp: () => this.player.keys.down = false });
      this.keyboard.addKey({ keys: ['d', 'arrowright'], onDown: () => this.player.keys.right = true, onUp: () => this.player.keys.right = false });
      this.keyboard.addKey({ keys: ['v'], onDown: () => this.player.keys.jetpack = true, onUp: () => this.player.keys.jetpack = false });
      this.keyboard.addKey({ keys: ['.'], onDown: () => this.player.nextSkin(1) });
      this.keyboard.addKey({ keys: [','], onDown: () => this.player.nextSkin(-1) });
    }

    this.keyboard.addKey({ keys: ['escape'], onDown: () => Facade.setPage(Facade.mainPage) });
    this.keyboard.addKey({ keys: ['enter'], onDown: () => this.loadLevel(this.currentLevelIndex) });
    this.keyboard.addKey({ keys: ['p'], onDown: () => this.running = !this.running });

    for (let i = 0; i <= 9; i++) {
      let level = i;
      this.keyboard.addKey({ keys: [(level + 1).toString()], onDown: () => this.loadLevel(level) });
    }
  }

  onTick = (e: PIXI.Ticker) => {
    if (!this.running) {
      this.player.updateView();
      this.player2 && this.player2.updateView();
      return;
    }
    this.timer.update(e.deltaMS);

    if (this.ghostPlayer && this.replayingStream) {
      this.replayingStream.playStep(this.ghostPlayer);
      
      this.playerMovement.playerTick(this.ghostPlayer);
      this.ghostPlayer.updateView();
    }
    if (this.recordingStream) {
      this.recordingStream.recordStep(this.player);
    }
    this.playerMovement.playerTick(this.player);
    this.player.updateView();
    
    if (this.TWO_PLAYER) {
      this.playerMovement.playerTick(this.player2);
      this.player2.updateView();
      this.camera.updateTwo(this.player, this.player2);
    } else {
      this.camera.update(this.player);
    }

    for (let i = this.canvas.blocks.length - 1; i >= 0; i--) {
      if (this.canvas.blocks[i].destroyed) {
        this.gameEnvironment.removeObject(this.canvas.blocks[i].config);
      }
    }
  }
}
