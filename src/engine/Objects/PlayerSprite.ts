import * as PIXI from "pixi.js";
import { GameEvents } from "../../services/GameEvents";
import { Firework, IExplosion } from "../../JMGE/effects/Firework";
import _ from "lodash";

export class PlayerSprite extends PIXI.Container {
    public keys = {
        down: false,
        up: false,
        left: false,
        right: false,
        holdUp: false,
        jetpack: false,
    };

    public doubleJumpsRemaining = 1;

    public wallGrabsRemaining = 1;

    public groundState: GroundState = 'idle';
    public standState: 'standing' | 'crouching' = 'standing';

    public vX = 0;
    public vY = 0;

    public bounceTime = 0;
    public rollTime = 0;
    public maxRollTime = 100;
    public grabTime = 0;
    public landTime = 0;

    public desiredSkew = 0;
    public desiredVStretch = 0;
    private skewMult = -0.02;
    private vStretchMult = 0.05;
    private maxVStretch = 0.2;
    private animationSpeed = 0.2;

    private maxStepDelay = 10;
    private stepDelay = 0;

    private view = new PIXI.Graphics();
    public collider = new PIXI.Rectangle();

    constructor(width: number, height: number) {
        super();

        this.collider.set(0, 0, width, height);

        this.addChild(this.view);

        this.drawPlayer();
    }

    getMidPoint() {
        return new PIXI.Point(this.x + this.collider.width / 2, this.y + this.collider.height / 2);
    }

    getFootPoint() {
        return new PIXI.Point(this.x + this.collider.width / 2, this.y + this.collider.height);
    }

    drawPlayer() {
        this.view.ellipse(this.collider.width/2, this.collider.height/2, this.collider.width/2, this.collider.height/2);
        this.view.fill(0xff6633);
        this.view.circle(this.collider.width / 2, this.collider.width * 0.8, this.collider.width * 0.8);
        this.view.fill(0xee1144);
    }

    setGroundState(state: GroundState) {
        if (state === 'ascending') {
            Firework.makeExplosion(this.parent, _.defaults(this.getFootPoint(), STEP_PARTICLE));
        } else if ((this.groundState === 'falling' || this.groundState === 'diving') && state === 'walking') {
            Firework.makeExplosion(this.parent, _.defaults(this.getFootPoint(), STEP_PARTICLE));
        }
        this.groundState = state;
        GameEvents.ACTIVITY_LOG.publish({slug: 'PLAYER_STATE', text: state});
    }

    public getCollider() {
        if (this.standState === 'crouching') {
            return new PIXI.Rectangle(this.x, this.y + this.collider.height / 2, this.collider.width, this.collider.height / 2);
        }
        return new PIXI.Rectangle(this.x, this.y, this.collider.width, this.collider.height);
    }

    public getTopCollider() {
        return new PIXI.Rectangle(this.x, this.y, this.collider.width, this.collider.height / 4);
    }

    updateView() {
        this.stepDelay--;
        if (this.stepDelay <= 0) {
            this.stepDelay = this.maxStepDelay;
            if (this.groundState === 'walking' || this.groundState === 'rolling') {
                // {x: this.x + this.collider.width / 2, y: this.y + this.collider.height}
                STEP_PARTICLE.x = this.x + this.collider.width / 2;
                STEP_PARTICLE.y = this.y + this.collider.height;

                Firework.makeExplosion(this.parent, _.defaults(this.getFootPoint(), STEP_PARTICLE));
            }
        }

        if (this.groundState === 'jetpacking') {
            Firework.makeExplosion(this.parent, _.defaults(this.getMidPoint(), {count: 1, tint: 0xffcc66, mag_min: 1, mag_max: 2}));
        }
        
        if (this.groundState === 'wall-grab-left' || this.groundState === 'wall-grab-right') {
            this.view.skew.x = 0;
            this.view.x = 0;
            this.view.scale.y = 0.7;
            this.view.scale.x = 1.5;
            return;
        }

        if (this.groundState === 'rolling') {
            let scale = this.view.scale.y;
            let dScale = 0.5 - scale;
            scale = scale + dScale * this.animationSpeed;
            this.view.scale.y = scale;

            let angle = (this.rollTime / this.maxRollTime) * Math.PI * 2 * Math.sign(-this.vX);
            this.view.rotation = angle;

            let pivot = new PIXI.Point(this.collider.width / 2, this.collider.height * scale / 2);
            let offY = this.collider.height * (1 - scale);
            let dpX = Math.cos(angle) * pivot.x - Math.sin(angle) * pivot.y - pivot.x;
            let dpY = Math.sin(angle) * pivot.x + Math.cos(angle) * pivot.y - pivot.y;
            this.view.x = -dpX;
            this.view.y = -dpY + offY;

            return;
        }

        this.view.rotation = 0;
        this.view.scale.x = 1;

        this.desiredSkew = this.vX * this.skewMult;
        this.desiredVStretch = 1 + Math.min(Math.abs(this.vY) * this.vStretchMult, this.maxVStretch);
        if (this.standState === 'crouching') {
            this.desiredVStretch *= 0.5;
        }
        if (this.landTime > 0) {
            this.desiredVStretch *= 0.8;
        }

        let skew = this.view.skew.x;
        let dSkew = this.desiredSkew - skew;
        this.view.skew.x = skew + dSkew * this.animationSpeed;
        this.view.x = this.view.skew.x;

        let stretch = this.view.scale.y;
        let dStretch = this.desiredVStretch - stretch;
        this.view.scale.y = stretch + dStretch * this.animationSpeed;
        this.view.y = this.collider.height - this.view.scale.y * this.collider.height;
    }
}

const STEP_PARTICLE: IExplosion = {
    x: 0, y: 0, count: 3, tint: 0x11cc33,
//     const DExplosion: IExplosion = {
//   x: 0, y: 0, count: 20,
//   offRadius: 0,
//   angle_min: 0, angle_max: Math.PI * 2,
//   mag_min: 1, mag_max: 3,
//   fade: 0.06,
//   size_min: 5, size_max: 9,
//   tint: 0xcccccc,
// };
}

export type GroundState = 'idle' | 'walking' | 'ascending' | 'falling' | 'diving' | 'crouching' | 'rolling' |
    'wall-grab-left' | 'wall-grab-right' | 'climbing-left' | 'climbing-right' | 'jetpacking';