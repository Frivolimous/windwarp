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

export class GameControl {
    private playerMovement: PlayerMovement;
    private gameEnvironment: GameEnvironment;
    private camera: GameCamera;
    private running = true;
    private timer = new GameTimer();
    private levelCompleteText = new PIXI.Text({text:'Level Complete!', style:{fontSize: 64, fill: 0xffffff}});
    private gameStartText = new PIXI.Text({text:'Press any key to start', style:{fontSize: 64, fill: 0xffffff}}); 
    player: PlayerSprite;

    constructor(private canvas: GameCanvas, private keyboard: KeyboardControl) {
        this.gameEnvironment = new GameEnvironment(canvas);
        this.playerMovement = new PlayerMovement(this.gameEnvironment);
        this.camera = new GameCamera(this.canvas, Facade.worldBounds.width, Facade.worldBounds.height);
        this.player = new PlayerSprite(15, 60);
        this.playerMovement.setPlayer(this.player);
        this.canvas.addPlayer(this.player);
        this.canvas.layers[GameCanvas.UI].addChild(this.timer);
        this.timer.position.set(Facade.worldBounds.width - 100, 20);

        this.levelCompleteText.anchor.set(0.5);
        this.levelCompleteText.position.set(this.camera.viewWidth / 2, this.camera.viewHeight / 2);

        this.gameStartText.anchor.set(0.5);
        this.gameStartText.position.set(this.camera.viewWidth / 2, this.camera.viewHeight / 2);

        this.setupKeys();

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
            Firework.makeExplosion(this.canvas.layers[GameCanvas.UI], {x: position.x, y: position.y});
        });

        this.loadLevel(4);
    }

    loopingFireworks() {
        setTimeout(() => {
            Firework.makeExplosion(this.canvas.layers[GameCanvas.UI], {x: Math.random() * this.camera.viewWidth, y: Math.random() * this.camera.viewHeight, tint: Math.random() * 0xffffff});
            if (!this.running) this.loopingFireworks();
        }, 50);
    }

    loadLevel(i: number) {
        this.running = true;
        let data = _.cloneDeep(LevelLoader.levelData[i]);
        this.loadLevelFromData(data);
    }

    loadLevelFromData(data: ILevelData) {
        this.timer.reset();
        this.timer.pause();
        this.canvas.layers[GameCanvas.UI].removeChild(this.levelCompleteText);

        this.gameEnvironment.setupLevel(data);
        this.canvas.resetBounds(data.width, data.height, data.height);
        this.player.position.set(data.startingPosition.x, data.startingPosition.y);

        this.canvas.clearObjects();
        this.canvas.addObjects(data.blocks);

        this.camera.update(this.player, true);

        window.requestAnimationFrame(() => {
            this.canvas.layers[GameCanvas.UI].addChild(this.gameStartText);
            this.keyboard.onAnyKey(() => {
                this.gameStartText.parent.removeChild(this.gameStartText);
                this.timer.start();
            });
        });
    }

    setupKeys() {
        this.keyboard.addKey({keys: ['w', ' ', 'arrowup'], onDown: () => this.player.keys.up = true, onUp: () => this.player.keys.up = false});
        this.keyboard.addKey({keys: ['a', 'arrowleft'], onDown: () => this.player.keys.left = true, onUp: () => this.player.keys.left = false});
        this.keyboard.addKey({keys: ['s', 'arrowdown', 'control'], onDown: () => this.player.keys.down = true, onUp: () => this.player.keys.down = false});
        this.keyboard.addKey({keys: ['d', 'arrowright'], onDown: () => this.player.keys.right = true, onUp: () => this.player.keys.right = false});
        this.keyboard.addKey({keys: ['v'], onDown: () => this.player.keys.jetpack = true, onUp: () => this.player.keys.jetpack = false});
        this.keyboard.addKey({keys: ['p'], onDown: () => this.running = !this.running });
        this.keyboard.addKey({keys: ['r'], onDown: () => this.canvas.blocks.forEach(b => b.randomTint()) });
        for (let i = 0; i < LevelLoader.levelData.length; i++) {
            let level = i;
            this.keyboard.addKey({keys: [(level + 1).toString()], onDown: () => this.loadLevel(level)});
        }
    }

    onTick = (e: PIXI.Ticker) => {
        if (!this.running) return;
        this.timer.update(e.deltaMS);
        this.playerMovement.playerTick(this.player);

        this.player.updateView();
        this.camera.update(this.player);

        for (let i = this.canvas.blocks.length - 1; i >= 0; i--) {
            if (this.canvas.blocks[i].destroyed) {
                this.gameEnvironment.removeObject(this.canvas.blocks[i].config);
            }
        }
    }
}
