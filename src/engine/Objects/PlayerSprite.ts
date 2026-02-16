import * as PIXI from "pixi.js";
import { GameEvents } from "../../services/GameEvents";
import { Firework } from "../../JMGE/effects/Firework";
import _ from "lodash";
import { Facade } from "../../main";
import { GameCanvas } from "./GameCanvas";
import { JMEasing } from "../../JMGE/JMTween";
import { LevelLoader } from "../../services/LevelLoader";
import { BlockColors, GameBlockType } from "./GameBlock";
import { ColliionResponse } from "./GameEnvironment";

export class PlayerSprite extends PIXI.Container {
  public keys: Record<PlayerKeys, boolean> = {
    down: false,
    up: false,
    left: false,
    right: false,
    jetpack: false,
    dash: false,
  };

  public holdUp = false;

  public holdLeft = false;
  public holdRight = false;

  public isGhost = false;
  public skinIndex = 0;

  public doubleJumpsRemaining = 1;

  public wallGrabsRemaining = 1;

  public stepBlock: GameBlockType;

  public actionState: ActionState;
  public isGrounded = false;
  public isCrouching = false;
  public isInMud = false;

  public vX = 0;
  public vY = 0;

  public bounceTime = 0;
  public landTime = 0;

  private skewMult = -1.2 / LevelLoader.CHAR_SIZE;
  private vStretchMult = 0.1;
  private maxVStretch = 0.2;
  private animationSpeed = 0.2;
  private handAnimationSpeed = 0.2;

  private maxStepDelay = 10;
  private stepDelay = 0;

  private handsTick = 0;
  private handsTime = 40;

  public head: PIXI.Sprite;
  public body: PIXI.Sprite;
  public leftHand: PIXI.Sprite;
  public rightHand: PIXI.Sprite;
  public collider = new PIXI.Rectangle();

  constructor() {
    super();
    let width = Math.round(0.4*LevelLoader.CHAR_SIZE);
    let height = Math.round(1.5*LevelLoader.CHAR_SIZE);
    
    this.collider.set(-width / 2, -height, width, height);

    this.drawPlayer();
  }

  reset() {
    this.actionState = null;
    this.bounceTime = this.landTime = 0;
    this.vX = this.vY = 0;
    this.isGrounded = true;
    this.isCrouching = false;
  }

  makeGhost() {
    this.head.alpha = 0.4;
    this.body.alpha = 0.4;
    this.leftHand.alpha = 0.4;
    this.rightHand.alpha = 0.4;
    this.isGhost = true;
  }

  getMidPoint() {
    return new PIXI.Point(this.x, this.y - this.collider.height / 2);
  }

  getFootPoint() {
    return new PIXI.Point(this.x, this.y);
  }

  drawPlayer() {
    this.head = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this.body = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this.head.anchor.set(0.5, 1 + 14/20); //4/20
    this.body.anchor.set(0.5, 1); // -10/20 //6/20
    this.leftHand = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this.rightHand = new PIXI.Sprite(PIXI.Texture.EMPTY);
    this.rightHand.scale.x = -1;
    this.leftHand.anchor.set(0.5);
    this.rightHand.anchor.set(0.5);

    this.addChild(this.body, this.head, this.leftHand, this.rightHand);
    // this.leftHand.visible = false;
    // this.rightHand.visible = false;
  }

  nextSkin(i: number) {
    this.skinIndex = (this.skinIndex + i + LevelLoader.skins.length) % LevelLoader.skins.length;
    
    this.loadSkin(LevelLoader.skins[this.skinIndex]);
  }

  loadSkin(skin: PIXI.Texture[]) {
    this.head.texture = skin[2];
    this.body.texture = skin[1];
    this.leftHand.texture = skin[0];
    this.rightHand.texture = skin[0];
  }

  // setMovementState(state: MovementState) {
  //   if (state === this.movementState) return;

  //   let tint = 0x888888;
  //   if (this.stepBlock) {
  //     tint = BlockColors[this.stepBlock.type];
  //   }

  //   if (state === 'ascending') {
  //     if (!this.isJetpacking) {
  //       Firework.makeExplosion(this.parent, { x: this.x, y: this.y, count: 5, tint });
  //     }
  //   } else if (this.movementState === 'falling' && state === 'walking') {
  //     Firework.makeExplosion(this.parent, { x: this.x, y: this.y, count: 5, tint });
  //   }
  //   this.movementState = state;
  //   // this.movementStateData = MovementStateDataRecord[state];
  //   GameEvents.ACTIVITY_LOG.publish({ slug: 'PLAYER_STATE', text: state });
  // }

  public getCollider(forceFullSize = false): PlayerCollider {
    if (this.isCrouching && !forceFullSize) {
      return {
        left: this.x + this.collider.x,
        top: this.y + this.collider.y + this.collider.height / 2,
        right: this.x + this.collider.x + this.collider.width,
        bottom: this.y + this.collider.y + this.collider.height,
      };
    }
    return {
      left: this.x + this.collider.x,
      top: this.y + this.collider.y,
      right: this.x + this.collider.x + this.collider.width,
      bottom: this.y + this.collider.y + this.collider.height,
    };
  }

  public getTopCollider(): PlayerCollider {
    return {
      left: this.x + this.collider.x,
      top: this.y + this.collider.y,
      right: this.x + this.collider.x + this.collider.width,
      bottom: this.y + this.collider.y + this.collider.height / 4,
    };
  }

  updateView() {
    if (this.vX > 0) this.head.scale.x = Math.abs(this.head.scale.x);
    if (this.vX < 0) this.head.scale.x = -Math.abs(this.head.scale.x);
    if (this.actionState && this.actionState.type === 'victory') {
      this.updateVictoryAnimation();
      return;
    }

    this.stepDelay--;
    if (this.stepDelay <= 0) {
      this.stepDelay = this.maxStepDelay;
      if (this.isGrounded && this.vX != 0) {
        let tint = 0x888888;
        if (this.stepBlock) {
          tint = BlockColors[this.stepBlock];
        }
        
        Firework.makeExplosion(this.parent, { x: this.x, y: this.y, count: 2, tint, 
                              angle_min: Math.PI, angle_max: Math.PI * 2, 
                              mag_min: 0.3, mag_max: 0.8});
      }
    }

    this.updateHands();

    if (this.actionState && this.actionState.type === 'jetpacking') {
      Firework.makeExplosion(Facade.gamePage.canvas.layers[GameCanvas.OBJECTS], _.defaults(this.getMidPoint(), { count: 1, tint: 0xffcc66, mag_min: 1, mag_max: 2 }));
    }

    if (this.actionState) {
      if (this.actionState.type === 'wall-grab') {
        this.body.skew.x = 0;
        this.body.x = 0;
        this.body.scale.y = 0.8;
        this.head.y = 0;
        this.body.scale.x = 1.1;
        this.body.y = -this.body.height * 0.4;
        return;
      } else if (this.actionState.type === 'rolling') {
        this.body.skew.x = 0;
        let scale = this.body.scale.y;
        let dScale = 0.5 - scale;
        scale = scale + dScale * this.animationSpeed;
        this.body.scale.y = scale;

        let angle = (this.actionState.timeRemaining / this.actionState.maxTime) * Math.PI * 2 * Math.sign(-this.vX);
        this.body.rotation = angle;
        this.head.rotation = angle;

        let pivot = new PIXI.Point(0, -this.collider.height * (scale * 0.5 + 0.08));
        let pivotH = new PIXI.Point(0, -(this.collider.height * (0.6)));

        let offY = this.collider.height * (-0.05);
        let offYH = this.collider.height * (0.2 - 0.5 * (scale - 0.5));

        let dpX = Math.cos(angle) * pivot.x - Math.sin(angle) * pivot.y - pivot.x;
        let dpY = Math.sin(angle) * pivot.x + Math.cos(angle) * pivot.y - pivot.y;
        let dpXH = Math.cos(angle) * pivotH.x - Math.sin(angle) * pivotH.y - pivotH.x;
        let dpYH = Math.sin(angle) * pivotH.x + Math.cos(angle) * pivotH.y - pivotH.y;
        this.body.x = -dpX;
        this.body.y = -dpY + offY;
        this.head.x = -dpXH;
        this.head.y = -dpYH + offYH;

        return;
      }
    }

    this.body.rotation = 0;
    this.body.scale.x = 1;
    this.head.rotation = 0;
    this.head.scale.x = 1 * Math.sign(this.head.scale.x);
    this.head.scale.y = 1;
    this.head.x = 0;

    let desiredSkew = this.vX * this.skewMult;
    let desiredVStretch = 1;
    if (this.isCrouching && this.isGrounded) desiredSkew *= 4;

    desiredVStretch = 1 + Math.min(Math.abs(this.vY) * this.vStretchMult, this.maxVStretch);
    if ((this.isCrouching && this.isGrounded) || (this.actionState && this.actionState.type === 'climbing')) {
      desiredVStretch *= 0.5;
    }

    if (this.vX === 0) {
      let percent = this.handsTick / this.handsTime;
      percent = (Math.abs(percent * 2 - 1));
      desiredVStretch += -0.02 + percent * 0.04;
      // this.body.scale.y = 1 - percent * 0.1;
      // this.head.y = 0;
    }

    if (this.landTime > 0) {
      desiredVStretch *= 0.8;
    }

    let skew = this.body.skew.x;
    let dSkew = desiredSkew - skew;
    this.body.skew.x = skew + dSkew * this.animationSpeed;
    this.body.x = this.body.skew.x * (this.collider.height * 0.65 - (1 - this.body.scale.y) * 15);

    let stretch = this.body.scale.y;
    let dStretch = desiredVStretch - stretch;
    this.body.scale.y = stretch + dStretch * this.animationSpeed;
    this.body.y = 0;
    this.head.y = this.collider.height * (1 - this.body.scale.y) * 0.7;
  }

  updateVictoryAnimation() {
    this.body.skew.x = 0;
    this.body.rotation = 0;
    this.body.x = 0;
    this.head.x = 0;
    this.head.rotation = 0;

    this.stepDelay = (this.stepDelay + 1) % 60;
    if (this.stepDelay < 30) { //crouch
      let percent = this.stepDelay / 30;
      this.body.scale.y = 1 - (percent) * 0.3;
      this.body.y = 0;
      this.head.y = this.collider.height * (1 - this.body.scale.y) * 0.7;
      this.leftHand.x = -this.collider.width * 0.5;
      this.rightHand.x = this.collider.width * 0.5;
      this.leftHand.y = this.rightHand.y = this.collider.height * (-0.6 + percent * 0.3);
    } else if (this.stepDelay < 45) { //jump up
      let percent = (this.stepDelay - 30) / 15;
      let quad = JMEasing.Quadratic.Out(percent);
      this.body.scale.y = 1 - (1 - quad) * 0.3;
      this.body.y = - quad * 15;
      this.head.y = this.collider.height * (1 - this.body.scale.y) * 0.7 - quad * 15;
      this.leftHand.y = this.rightHand.y = this.collider.height * (-0.3 - quad * 1.3);
      this.leftHand.x = this.collider.width * (-0.5 - quad * 0.5);
      this.rightHand.x = this.collider.width * (0.5 + quad * 0.5);
    } else { // fall down
      let percent = (this.stepDelay - 45) / 15;
      let quad = JMEasing.Quadratic.In(percent);

      this.body.scale.y = 1
      this.body.y = - (1 - quad) * 15;
      this.head.y = - (1 - quad) * 15;
      this.leftHand.y = this.rightHand.y = this.collider.height * (-1.5 + 1 * quad);
      this.leftHand.x = this.collider.width * (-1 + 0.5 * quad);
      this.rightHand.x = this.collider.width * (1 - quad * 0.5);
    }
  }

  updateHands() {
    this.handsTick = (this.handsTick + 1) % this.handsTime;
    let dlx = 0;
    let dly = 0;
    let drx = 0;
    let dry = 0;

    if (this.actionState) {
      let percent = this.actionState.timeRemaining / this.actionState.maxTime;

      switch(this.actionState.type) {
        case 'rolling':
          this.handAnimationSpeed = 0.2;
          let percentR = 1 - percent;
          dly = dry = this.collider.height * -0.1;
          dlx = drx = this.collider.width * (Math.sign(this.vX) * (2 - percentR * 4));
          break;
        case 'wall-grab':          
          this.handAnimationSpeed = 0.5;
          dly = this.collider.height * (-1 + 0.1 * this.actionState.direction + percent * 0.3);
          dry = this.collider.height * (-1 - 0.1 * this.actionState.direction + percent * 0.3);
          dlx = drx = this.collider.width * this.actionState.direction;
          break;
        case 'climbing':
          this.handAnimationSpeed = 0.2;
          let climbHeight = Math.round((this.y - this.height / 2) / LevelLoader.TILE_SIZE) * LevelLoader.TILE_SIZE - this.y + 5;

          dly = dry = climbHeight;
          dlx = drx = this.collider.width * this.actionState.direction;
          break;
        case 'jetpacking':
          this.handAnimationSpeed = 0.1;
          dly = this.collider.height * (-0.4);
          dry = this.collider.height * (-0.4);
          dlx = this.collider.width * (-0.6);
          drx = this.collider.width * (0.6);
          break;
      }
    } else {
      if (this.isGrounded) {
        if (this.vX === 0) {
          if (this.isCrouching) {
            this.handAnimationSpeed = 0.2;
            dly = this.collider.height * (-0.1);
            dry = this.collider.height * (-0.1);
            dlx = this.collider.width * (-0.6);
            drx = this.collider.width * (0.6);
          } else {
            this.handAnimationSpeed = 0.2;
            //BREATHE
            let iPercent = this.handsTick / this.handsTime;
            let ia = (Math.abs(iPercent * 2 - 1));
  
            dly = this.collider.height * (-0.4 +0.02 - 0.04 * ia);
            dry = this.collider.height * (-0.4 +0.02 - 0.04 * ia);
            dlx = this.collider.width * (-0.7 - 0.03 * (1-ia));
            drx = this.collider.width * (0.7 + 0.03 * (1-ia));
  
            //DANCE
            // let a = this.handsTick / this.handsTime * Math.PI * 2;
            // let m = this.collider.width * 0.2;
            // dlx = -this.collider.width * 0.6 + Math.cos(a) * m;
            // dly = -this.collider.height * 0.4 + Math.sin(a) * m;
            // drx = this.collider.width * 0.6 - Math.cos(a + Math.PI) * m;
            // dry = -this.collider.height * 0.4 + Math.sin(a + Math.PI) * m;
          }
        } else {
          if (this.isCrouching) {
            this.handAnimationSpeed = 0.2;
            let percent = this.handsTick / this.handsTime;
            let ll = 1 - Math.abs(Math.min(percent,0.5) * 4 - 1)
            let rr = 1 - Math.abs(Math.max(percent,0.5) * 4 - 3)
            dly = this.collider.height * (-0.1 - (this.vX > 0 ? ll : rr) * 0.3);
            dry = this.collider.height * (-0.1 - (this.vX > 0 ? rr : ll) * 0.3);
            dlx = this.collider.width * (1.5 * (1 - Math.abs(percent * 4 - 2)));
            drx = this.collider.width * (1.5 * (Math.abs(percent * 4 - 2) - 1));
          } else {
            this.handAnimationSpeed = 1;
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
            dly = -this.collider.height * 0.5 + Math.cos(a1) * m1;
            dlx = -this.collider.width * 0.2 + Math.sin(a1) * m1;
            dry = -this.collider.height * 0.5 + Math.cos(a2) * m2;
            drx = this.collider.width * 0.2 + Math.sin(a2) * m2;
  
            // // NARUTO
            // if (this.vX < 0) {
            //   let amt = Math.max(this.vX, -2);
            //   dly = this.collider.height * (-0.4 - amt * 0.008);
            //   dry = this.collider.height * (-0.4 - amt * 0.02);
            //   dlx = this.collider.width * (-0.6 - amt * 1);
            //   drx = this.collider.width * (0.6 - amt * 0.6);
            // } else {
            //   let amt = Math.min(this.vX, 2);
            //   dly = this.collider.height * (-0.4 + amt * 0.02);
            //   dry = this.collider.height * (-0.4 + amt * 0.008);
            //   dlx = this.collider.width * (-0.6 - amt * 0.6);
            //   drx = this.collider.width * (0.6 - amt * 1);
            // }
          }
        }
      } else {
        this.handAnimationSpeed = 0.05;
        dly = dry = this.collider.height * (-1 - _.clamp(this.vY, -5, 5) * 0.1);
        dlx = this.collider.width * (-0.6 + this.vX * 0.12);
        drx = this.collider.width * (0.6 + this.vX / this.collider.width * 1.56);
      }
    }

    this.setChildIndex(this.rightHand, this.vX <= 0 ? 3 : 0);
    this.setChildIndex(this.leftHand, this.vX >= 0 ? 3 : 0);


    this.leftHand.x += (dlx - this.leftHand.position.x) * this.handAnimationSpeed;
    this.leftHand.y += (dly - this.leftHand.position.y) * this.handAnimationSpeed;
    this.rightHand.x += (drx - this.rightHand.position.x) * this.handAnimationSpeed;
    this.rightHand.y += (dry - this.rightHand.position.y) * this.handAnimationSpeed;
  }
}

export type PlayerKeys = 'down' | 'up' | 'left' | 'right' | 'jetpack' | 'dash';

export interface ActionState {
  type: 'rolling' | 'wall-grab' | 'climbing' | 'victory' | 'jetpacking';
  direction: number;
  timeRemaining: number;
  maxTime: number;
  onExpire?: () => void;
  onJump?: () => void;
  onDown?: () => void;
  onLR?: (direction: number) => void;
  canJump?: boolean;
  hasPhysics?: boolean;
  updateY?: () => void;
  onCollisionUp?: (upCollision: ColliionResponse) => void;
  onCollisionDown?: (downCollision: ColliionResponse) => void;
  onCollisionLR?: () => void;
}

 // isCrouching
 // isMoving
 // isGrounded

 export interface PlayerCollider {
  left: number;
  right: number;
  top: number;
  bottom: number;
 }