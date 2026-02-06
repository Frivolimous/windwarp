import { Firework } from "../../JMGE/effects/Firework";
import { Facade } from "../../main";
import { KeyboardControl } from "../../services/KeyboardControl";
import { GameCamera } from "../Objects/GameCamera";
import { GameCanvas } from "../Objects/GameCanvas";
import { GameEnvironment } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";
import { PlayerMovement } from "./PlayerMovement";

export class GameControl {
    private playerMovement: PlayerMovement;
    private gameEnvironment = new GameEnvironment();
    private camera: GameCamera;
    private running = true;
    player: PlayerSprite;

    constructor(private canvas: GameCanvas, private keyboard: KeyboardControl) {
        this.playerMovement = new PlayerMovement(this.gameEnvironment);
        this.camera = new GameCamera(this.canvas, Facade.worldBounds.width * Facade.scale, Facade.worldBounds.height * Facade.scale);
        
        this.startSampleGame();
    }

    startSampleGame() {
        let objects: {x: number, y: number, width: number, height: number, spring?: boolean}[] = [
            {x: 560, y: 840, width: 80, height: 40},
            {x: 640, y: 800, width: 80, height: 80},
            {x: 800, y: 720, width: 80, height: 80},
            {x: 80, y: 800, width: 80, height: 80},
            {x: 960, y: 640, width: 160, height: 80},
            {x: 1200, y: 640, width: 160, height: 80},
            {x: 1360, y: 480, width: 80, height: 80},
            {x: 1040, y: 400, width: 240, height: 80},
            {x: 640, y: 400, width: 240, height: 80},
            {x: 240, y: 240, width: 160, height: 80},
            {x: 1600, y: 240, width: 80, height: 560},
            {x: 1840, y: 240, width: 80, height: 640},
            {x: 1760, y: 860, width: 80, height: 20, spring: true},
            {x: 0, y: 860, width: 80, height: 20, spring: true},
        ];

        objects.forEach(obj => {
            obj.y += 100;
        });

        //   public worldBounds = new PIXI.Rectangle(0, 0, 1900, 1200);
        this.gameEnvironment.setupLevel(3000, 980, objects);
        this.canvas.resetBounds(3000, 1300, this.gameEnvironment.floorHeight);
        this.player = new PlayerSprite(15, 60);
        this.player.x = 100;
        this.player.y = 800;
        this.playerMovement.setPlayer(this.player);
        this.canvas.addPlayer(this.player);
        this.canvas.addObjects(objects);
        this.setupKeys();
        this.canvas.addEventListener('mousedown', e => {
            let position = e.getLocalPosition(this.canvas);
            Firework.makeExplosion(this.canvas, {x: position.x, y: position.y});
        });
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
    }
}
