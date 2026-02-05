import { Firework } from "../../JMGE/effects/Firework";
import { KeyboardControl } from "../../services/KeyboardControl";
import { GameCanvas } from "../Objects/GameCanvas";
import { GameEnvironment } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";
import { PlayerMovement } from "./PlayerMovement";

export class GameControl {
    private playerMovement = new PlayerMovement();
    private gameEnvironment = new GameEnvironment();
    player: PlayerSprite;

    constructor(private canvas: GameCanvas, private keyboard: KeyboardControl) {
        this.startSampleGame();
    }

    startSampleGame() {
        this.player = new PlayerSprite(30, 100);
        this.playerMovement.setPlayer(this.player);
        this.canvas.addChild(this.player);
        this.setupKeys();
        this.canvas.addEventListener('mousedown', e => {
            let position = e.getLocalPosition(this.canvas);
            Firework.makeExplosion(this.canvas, {x: position.x, y: position.y});
        });
    }

    setupKeys() {
        this.keyboard.addKey({key: 'w', onDown: () => this.player.keys.up = true, onUp: () => this.player.keys.up = false});
        this.keyboard.addKey({key: 'a', onDown: () => this.player.keys.left = true, onUp: () => this.player.keys.left = false});
        this.keyboard.addKey({key: 's', onDown: () => this.player.keys.down = true, onUp: () => this.player.keys.down = false});
        this.keyboard.addKey({key: 'd', onDown: () => this.player.keys.right = true, onUp: () => this.player.keys.right = false});
    }

    onTick = () => {
        let worldCollision = this.gameEnvironment.checkWorld(this.player);
        this.playerMovement.onTick(worldCollision);

        this.player.updateView();
    }
}
