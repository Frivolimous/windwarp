import { Firework } from "../../JMGE/effects/Firework";
import { Facade } from "../../main";
import { GameEvents } from "../../services/GameEvents";
import { KeyboardControl } from "../../services/KeyboardControl";
import { LevelLoader } from "../../services/LevelLoader";
import { IGameBlock } from "../Objects/GameBlock";
import { GameCamera } from "../Objects/GameCamera";
import { GameCanvas } from "../Objects/GameCanvas";
import { GameEnvironment } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";
import { PlayerMovement } from "./PlayerMovement";

export class GameControl {
    private playerMovement: PlayerMovement;
    private gameEnvironment: GameEnvironment;
    private camera: GameCamera;
    private running = true;
    player: PlayerSprite;

    constructor(private canvas: GameCanvas, private keyboard: KeyboardControl) {
        this.gameEnvironment = new GameEnvironment(canvas);
        this.playerMovement = new PlayerMovement(this.gameEnvironment);
        this.camera = new GameCamera(this.canvas, Facade.worldBounds.width * Facade.scale, Facade.worldBounds.height * Facade.scale);
        this.player = new PlayerSprite(15, 60);
        this.playerMovement.setPlayer(this.player);
        this.canvas.addPlayer(this.player);

        this.setupKeys();

        GameEvents.SWITCH_ACTIVATED.addListener((block: IGameBlock) => {
            let subtype = block.subtype;
            this.canvas.blocks.forEach(obj => {
                if (obj.config.type === 'door' && obj.config.subtype === subtype) {
                    obj.shrinkAway();
                }
            });
        });

        this.canvas.addEventListener('mousedown', e => {
            let position = e.getLocalPosition(this.canvas);
            Firework.makeExplosion(this.canvas, {x: position.x, y: position.y});
        });

        this.loadLevel(2);
    }

    loadLevel(i: number) {
        let data = LevelLoader.levelData[i];

        this.gameEnvironment.setupLevel(data.width, data.height, data.blocks);
        this.canvas.resetBounds(data.width, data.height, data.height);
        this.player.position.set(data.startingPosition.x, data.startingPosition.y);

        this.canvas.addObjects(data.blocks);
    }

    setupKeys() {
        this.keyboard.addKey({keys: ['w', ' ', 'arrowup'], onDown: () => this.player.keys.up = true, onUp: () => this.player.keys.up = false});
        this.keyboard.addKey({keys: ['a', 'arrowleft'], onDown: () => this.player.keys.left = true, onUp: () => this.player.keys.left = false});
        this.keyboard.addKey({keys: ['s', 'arrowdown'], onDown: () => this.player.keys.down = true, onUp: () => this.player.keys.down = false});
        this.keyboard.addKey({keys: ['d', 'arrowright'], onDown: () => this.player.keys.right = true, onUp: () => this.player.keys.right = false});
        this.keyboard.addKey({keys: ['p'], onDown: () => this.running = !this.running });
    }

    onTick = () => {
        if (!this.running) return;
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
