import * as PIXI from "pixi.js";
import { GameEvents } from "../../services/GameEvents";
import { Firework, IExplosion } from "../../JMGE/effects/Firework";
import _ from "lodash";
import { Facade } from "../../main";
import { GameCanvas } from "./GameCanvas";
import { JMEasing } from "../../JMGE/JMTween";

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

  public movementState: MovementState = 'idle';

  public vX = 0;
  public vY = 0;

  public bounceTime = 0;
  public rollTime = 0;
  public maxRollTime = 100;
  public grabTime = 0;
  public maxGrabTime = 10;
  public landTime = 0;

  public desiredSkew = 0;
  public desiredVStretch = 0;
  private skewMult = -0.04;
  private vStretchMult = 0.1;
  private maxVStretch = 0.2;
  private animationSpeed = 0.2;
  private handAnimationSpeed = 0.2;

  private maxStepDelay = 10;
  private stepDelay = 0;

  private handsTick = 0;
  private handsTime = 40;
  public climbHeight = 0;

  private view = new PIXI.Graphics();
  private leftHand = new PIXI.Graphics();
  private rightHand = new PIXI.Graphics();
  public collider = new PIXI.Rectangle();

  constructor(width: number, height: number) {
    super();

    this.collider.set(0, 0, width, height);

    this.addChild(this.view);
    this.addChild(this.leftHand, this.rightHand);

    this.drawPlayer();
  }

  getMidPoint() {
    return new PIXI.Point(this.x + this.collider.width / 2, this.y + this.collider.height / 2);
  }

  getFootPoint() {
    return new PIXI.Point(this.x + this.collider.width / 2, this.y + this.collider.height);
  }

  drawPlayer() {
    this.view.ellipse(this.collider.width / 2, this.collider.height / 2, this.collider.width / 2, this.collider.height / 2);
    this.view.fill(0xff6633);
    this.view.stroke({ width: 2, color: 0 });
    this.view.circle(this.collider.width / 2, this.collider.width * 0.8, this.collider.width * 0.8);
    this.view.fill(0xee1144);
    this.view.stroke({ width: 2, color: 0 });
    this.leftHand.circle(0, 0, this.collider.width * 0.4).fill(0xff6633).stroke({ width: 2, color: 0 });
    this.rightHand.circle(0, 0, this.collider.width * 0.4).fill(0xff6633).stroke({ width: 2, color: 0 });
  }

  setMovementState(state: MovementState) {
    if (state === 'ascending') {
      Firework.makeExplosion(this.parent, _.defaults(this.getFootPoint(), STEP_PARTICLE));
    } else if ((this.movementState === 'falling' || this.movementState === 'diving') && state === 'walking') {
      Firework.makeExplosion(this.parent, _.defaults(this.getFootPoint(), STEP_PARTICLE));
    }
    this.movementState = state;
    GameEvents.ACTIVITY_LOG.publish({ slug: 'PLAYER_STATE', text: state });
  }

  public getCollider(state?: MovementState) {
    state = state || this.movementState;
    if (state === 'crouching' || state === 'crawling' || state === 'rolling' || state === 'climbing-left' || state === 'climbing-right') {
      return new PIXI.Rectangle(this.x, this.y + this.collider.height / 2, this.collider.width, this.collider.height / 2);
    }
    return new PIXI.Rectangle(this.x, this.y, this.collider.width, this.collider.height);
  }

  public getTopCollider() {
    return new PIXI.Rectangle(this.x, this.y, this.collider.width, this.collider.height / 4);
  }

  updateView() {
    if (this.movementState === 'victory') {
      this.view.skew.x = 0;
      this.view.rotation = 0;

      this.stepDelay = (this.stepDelay + 1) % 60;
      // this.view.y = this.stepDelay * 0.1;
      if (this.stepDelay < 30) {
        let percent = this.stepDelay / 30;
        this.view.scale.y = 1 - (percent) * 0.3;
        this.view.y = this.view.scale.y
        this.view.y = this.collider.height - this.view.scale.y * this.collider.height;
        this.leftHand.x = 0;
        this.rightHand.x = this.collider.width;
        this.leftHand.y = this.rightHand.y = this.collider.height * (0.4 + percent * 0.3);
      } else if (this.stepDelay < 45) {
        let percent = (this.stepDelay - 30) / 15;
        let quad = JMEasing.Quadratic.Out(percent);
        this.view.scale.y = 1 - (1 - quad) * 0.3;
        this.view.y = this.collider.height - this.view.scale.y * this.collider.height - quad * 15;
        this.leftHand.y = this.rightHand.y = this.collider.height * (0.7 - quad * 1.3);
        this.leftHand.x = this.collider.width * (0 - quad * 0.5);
        this.rightHand.x = this.collider.width * (1 + quad * 0.5);
      } else {
        let percent = (this.stepDelay - 45) / 15;
        let quad = JMEasing.Quadratic.In(percent);

        this.view.scale.y = 1
        this.view.y = - (1 - quad) * 15;
        this.leftHand.y = this.rightHand.y = this.collider.height * (-0.5 + 1 * quad);
        this.leftHand.x = this.collider.width * (-0.5 + 0.5 * quad);
        this.rightHand.x = this.collider.width * (1.5 - quad * 0.5);
      }
      return;
    }
    this.stepDelay--;
    if (this.stepDelay <= 0) {
      this.stepDelay = this.maxStepDelay;
      if (this.movementState === 'walking' || this.movementState === 'rolling') {
        // {x: this.x + this.collider.width / 2, y: this.y + this.collider.height}
        STEP_PARTICLE.x = this.x + this.collider.width / 2;
        STEP_PARTICLE.y = this.y + this.collider.height;

        Firework.makeExplosion(this.parent, _.defaults(this.getFootPoint(), STEP_PARTICLE));
      }
    }

    this.updateHands();

    if (this.movementState === 'jetpacking') {
      Firework.makeExplosion(Facade.gamePage.canvas.layers[GameCanvas.OBJECTS], _.defaults(this.getMidPoint(), { count: 1, tint: 0xffcc66, mag_min: 1, mag_max: 2 }));
    }

    if (this.movementState === 'wall-grab-left' || this.movementState === 'wall-grab-right') {
      this.view.skew.x = 0;
      this.view.x = 0;
      this.view.scale.y = 0.8;
      this.view.scale.x = 1.1;
      return;
    }

    if (this.movementState === 'rolling') {
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
    if (this.movementState === 'crawling') this.desiredSkew *= 4;
    this.desiredVStretch = 1 + Math.min(Math.abs(this.vY) * this.vStretchMult, this.maxVStretch);
    if (this.movementState === 'crouching' || this.movementState === 'crawling' || this.movementState === 'climbing-left' || this.movementState === 'climbing-right') {
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

  updateHands() {
    this.handsTick = (this.handsTick + 1) % this.handsTime;
    let dlx = 0;
    let dly = 0;
    let drx = 0;
    let dry = 0;

    switch(this.movementState) {
      case 'idle': 
        this.handAnimationSpeed = 0.2;
        let a = this.handsTick / this.handsTime * Math.PI * 2;
        let m = this.collider.width * 0.2;
        dlx = this.collider.width * -0.1 + Math.cos(a) * m;
        dly = this.collider.height * 0.6 + Math.sin(a) * m;
        drx = this.collider.width * 1.1 - Math.cos(a + Math.PI) * m;
        dry = this.collider.height * 0.6 + Math.sin(a + Math.PI) * m;
        break;
      case 'walking':
        this.handAnimationSpeed = 1;
        if (Math.abs(this.vX) <= 4) {
          // SWING
          let percentW = this.handsTick / this.handsTime;

          let a1 = (Math.abs(percentW * 2 - 1));
          let a2 = 1 - (Math.abs(percentW * 2 - 1));

          let a3 = JMEasing.Sinusoidal.Out(a1);
          let a4 = JMEasing.Sinusoidal.Out(a2);

          a1 = (a1 * Math.PI * 1.2 - Math.PI * 0.5) * Math.sign(this.vX);
          a2 = (a2 * Math.PI * 1.2 - Math.PI * 0.5) * Math.sign(this.vX);
          let m1 = 8 - a3 * 3;
          let m2 = 8 - a4 * 3;
          dly = this.collider.height * 0.5 + Math.cos(a1) * m1;
          dlx = this.collider.width * 0.3 + Math.sin(a1) * m1;
          dry = this.collider.height * 0.5 + Math.cos(a2) * m2;
          drx = this.collider.width * 0.7 + Math.sin(a2) * m2;
        } else {
          // NARUTO
          if (this.vX < 0) {
            let amt = Math.max(this.vX, -2);
            dly = this.collider.height * (0.6 - amt * 0.008);
            dry = this.collider.height * (0.6 - amt * 0.02);
            dlx = this.collider.width * (-0.1 - amt * 1);
            drx = this.collider.width * (1.1 - amt * 0.6);
          } else {
            let amt = Math.min(this.vX, 2);
            dly = this.collider.height * (0.6 + amt * 0.02);
            dry = this.collider.height * (0.6 + amt * 0.008);
            dlx = this.collider.width * (-0.1 - amt * 0.6);
            drx = this.collider.width * (1.1 - amt * 1);
          }
        }
        break;
      case 'ascending': case 'falling':
        this.handAnimationSpeed = 0.05;
        dly = dry = this.collider.height * (0 - _.clamp(this.vY, -5, 10) * 0.1);
        dlx = this.collider.width * (-0.1 + this.vX * 0.2);
        drx = this.collider.width * (1.1 + this.vX * 0.2);
        break;
      case 'crouching':
        this.handAnimationSpeed = 0.2;
        dly = this.collider.height * (0.9);
        dry = this.collider.height * (0.9);
        dlx = this.collider.width * (-0.1);
        drx = this.collider.width * (1.1);
        break;
      case 'crawling':
        this.handAnimationSpeed = 0.2;
        let percent = this.handsTick / this.handsTime;
        let ll = 1 - Math.abs(Math.min(percent,0.5) * 4 - 1)
        let rr = 1 - Math.abs(Math.max(percent,0.5) * 4 - 3)
        dly = this.collider.height * (0.9 - (this.vX > 0 ? ll : rr) * 0.3);
        dry = this.collider.height * (0.9 - (this.vX > 0 ? rr : ll) * 0.3);
        dlx = this.collider.width * (0.5 + 1.5 * (1 - Math.abs(percent * 4 - 2)));
        drx = this.collider.width * (0.5 + 1.5 * (Math.abs(percent * 4 - 2) - 1));
        break;
      case 'rolling':
        this.handAnimationSpeed = 0.1;
        let percentR = 1 - this.rollTime / this.maxRollTime;
        dly = dry = this.collider.height * 0.9;
        dlx = drx = this.collider.width * (0.5 + Math.sign(this.vX) * (2 - percentR * 5));
        break;
      case 'climbing-left': case 'climbing-right':
        this.handAnimationSpeed = 0.2;
        dly = dry = this.climbHeight;
        dlx = drx = this.collider.width * (0.5 + (this.movementState === 'climbing-left' ? -1 : 1) * 1);
        break;
      case 'wall-grab-left':
        this.handAnimationSpeed = 0.5;
        dly = this.collider.height * (-0.1 + this.grabTime / this.maxGrabTime * 0.3);
        dry = this.collider.height * (0 + this.grabTime / this.maxGrabTime * 0.3);
        dlx = drx = this.collider.width * -0.5;
        break;
      case 'wall-grab-right':
        this.handAnimationSpeed = 0.5;
        dly = this.collider.height * (0 + this.grabTime / this.maxGrabTime * 0.3);
        dry = this.collider.height * (-0.1 + this.grabTime / this.maxGrabTime * 0.3);
        dlx = drx = this.collider.width * 1.5;
        break;
      case 'jetpacking': case 'diving':
      default:
        this.handAnimationSpeed = 0.1;
        dly = this.collider.height * (0.6);
        dry = this.collider.height * (0.6);
        dlx = this.collider.width * (-0.1);
        drx = this.collider.width * (1.1);
        break;
    }

    this.setChildIndex(this.rightHand, this.vX <= 0 ? 2 : 0);
    this.setChildIndex(this.leftHand, this.vX >= 0 ? 2 : 0);


    this.leftHand.x += (dlx - this.leftHand.position.x) * this.handAnimationSpeed;
    this.leftHand.y += (dly - this.leftHand.position.y) * this.handAnimationSpeed;
    this.rightHand.x += (drx - this.rightHand.position.x) * this.handAnimationSpeed;
    this.rightHand.y += (dry - this.rightHand.position.y) * this.handAnimationSpeed;
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

export type MovementState = 'idle' | 'walking' | 'ascending' | 'falling' | 'diving' | 'crouching' | 'crawling' | 'rolling' |
  'wall-grab-left' | 'wall-grab-right' | 'climbing-left' | 'climbing-right' | 'jetpacking' | 'victory';