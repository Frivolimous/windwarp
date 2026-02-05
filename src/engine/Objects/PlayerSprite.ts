import * as PIXI from "pixi.js";
import { GameEvents } from "../../services/GameEvents";

export class PlayerSprite extends PIXI.Graphics {
    public keys = {
        down: false,
        up: false,
        left: false,
        right: false,
        holdUp: false,
    };

    public doubleJumpsRemaining = 1;
    public maxDoubleJumps = 1;

    public groundState: GroundState = 'idle';

    public vX = 0;
    public vY = 0;

    private view = new PIXI.Graphics();

    constructor(public boundWidth: number, public boundHeight: number) {
        super();

        this.addChild(this.view);

        this.view.ellipse(boundWidth/2, boundHeight/2, boundWidth/2, boundHeight/2);
        this.view.fill(0xff3366);
    }

    setGroundState(state: GroundState) {
        this.groundState = state;
        GameEvents.ACTIVITY_LOG.publish({slug: 'PLAYER_STATE', text: state});
    }

    updateView() {
        this.view.skew.set(this.vX / -100, 0);
        this.view.x = this.vX / 100;
    }
}

export type GroundState = 'idle' | 'walking' | 'ascending' | 'falling' | 'crouching';