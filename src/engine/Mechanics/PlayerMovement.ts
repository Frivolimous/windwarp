import _ from 'lodash';
import { GameEvents } from "../../services/GameEvents";
import { GameEnvironment, ColliionResponse } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";
import { LevelLoader } from '../../services/LevelLoader';

export class PlayerMovement {
  private moveSpeed = 1.2;
  private maxSpeed = 12;
  private minSpeed = 0.12;
  private minBounceSpeed = 3;
  private jumpSpeed = -9;
  private mudJumpSpeedMin = -3;
  private mudJumpSpeedMult = 2.5;
  private airMoveSpeed = 0.4;
  private jetpackXSpeed = 0.2;
  private jetpackYSpeed = -0.3;
  private springSpeed = -18;
  private climbGravity = 0.54;
  private fallGravity = 0.4;
  private parachuteGravity = 0.3;
  private terminalVelocity = 12;
  private parachuteTerminal = 10;
  private kickVX = 8;
  private climbSpeed = 1.2;
  private minGrabSpeedX = 2.4;
  private maxGrabSpeedY = -1.2;
  private divingSpeed = 12;
  private grabSlideSpeed = 0.6;
  private maxRollSpeed = 9;
  private rollSpeedNeeded = 2.448;
  private jetpackMaxSpeed = -6;
  private climbInset = 3.6;
  private mudFall = 0.1;
  private minMudJumpStop = 0;
  private wallCoyoteVY = -0.1;
  private vaultSpeed = 4;

  private mudXExtraFrictionBase = 0.3;
  private mudXExtraFrictionMult = -0.1;
  private crouchSpeedMult = 0.5;
  private rollSpeedMult = 1.5;
  private friction = 0.8;
  private extraLandFriction = 0.8;
  private airFriction = 0.93;
  private bounce = -0.7;
  
  private bounceTime = 5;
  private kickTime = 15;
  private grabTime = 50;
  private rollTime = 20;
  private coyoteWallTime = 20;
  private rollAfterTime = 5;
  private landTimeBase = 5;
  private landTimeVMult = 1;
  private mudMaxSink = -10;

  private maxDoubleJumps = 1;
  private maxWallGrabs = Infinity;

  constructor(private world: GameEnvironment) {

  }

  public respawn(player: PlayerSprite) {
    let lastCheckpoint = this.world.getRightmostTile(player.x, 'checkpoint');
    if (lastCheckpoint) {
      player.x = lastCheckpoint.x + LevelLoader.TILE_SIZE / 2;
      player.y = lastCheckpoint.y;
      player.actionState = null;
      player.vX = 0;
      player.vY = 0;
      player.isGrounded = true;
      player.isCrouching = false;
    } else {
      player.x = this.world.data.startingPosition.x;
      player.y = this.world.data.startingPosition.y;
    }
  }

  public playerTick = (player: PlayerSprite) => {
    if (!player) return;

    player.landTime > 0 && player.landTime--;
    player.bounceTime > 0 && player.bounceTime--;

    if (player.actionState) {
      player.actionState.timeRemaining--;
      if (player.actionState.timeRemaining <= 0) {
        player.actionState?.onExpire();
        player.actionState = null;
      }
    }

    this.updatePlayerActions(player);
    this.moveAndCollide(player);

    GameEvents.ACTIVITY_LOG.publish({slug: 'VELOCITY', text: `${player.vX.toFixed(2)}, ${player.vY.toFixed(2)}`});
  }

  public updatePlayerActions(player: PlayerSprite) {
    if (player.keys.jetpack) {
      if (player.actionState === null) {
        this.startJetpacking(player, 0);
      }
    } else if (player.actionState && player.actionState.type === 'jetpacking') {
      player.actionState = null;
    }

    if (player.keys.up) {
      if (this.canJump(player)) {
        if (!player.isGrounded && !player.actionState) player.doubleJumpsRemaining--;

        // let tdc = this.world.checkBottom(player.getCollider(), player.isGhost);
        // if (tdc < this.minMudJumpStop && tvc.downBlock && tvc.downBlock.type === 'mud') {
        //   let percent = tvc.down / this.mudMaxSink;
        //   player.vY = this.mudJumpSpeedMin + percent * this.mudJumpSpeedMult;
        // } else {
        player.vY = Math.max(this.jumpSpeed, player.vY + this.jumpSpeed);
        // }

        player.takeoff();
        player.isGrounded = false;
        player.isCrouching = false;
        player.landTime = 0;
        player.stepBlock = null;
        player.holdUp = true;
        player?.actionState?.onJump?.();
      } else {
        if (!player.isGrounded && player.vY < 0) player.holdUp = true;
      }
    } else {
      player.holdUp = false;
    }

    if (player.keys.down) {
      if (player.actionState) {
        player.actionState?.onDown?.();
      } else if (player.isGrounded) {
        if (!player.isCrouching && Math.abs(player.vX) > this.rollSpeedNeeded) {
          this.startRoll(player, Math.sign(player.vX));
        } else {
          player.isCrouching = true;
        }
      } else {
        player.vY = Math.max(this.divingSpeed, player.vY);
      }
    } else {
      if (player.actionState) {}
      else if (player.isGrounded && player.isCrouching && !this.world.checkTop(player.getCollider(true), player.isGhost)) {
        player.isCrouching = false;
      }
    }

    if (!player.isGrounded && (!player.actionState || player.actionState.hasPhysics)) {
      if (player.vY < 0) player.vY = Math.min(player.vY + this.climbGravity, this.terminalVelocity);
      else if (player.holdUp && player.vY <= this.parachuteTerminal) player.vY = Math.min(player.vY + this.parachuteGravity, this.parachuteTerminal);
      else player.vY = Math.min(player.vY + this.fallGravity, this.terminalVelocity);
    }

    let friction = 1;
    let speed = 0;
    
    if (player.actionState) {
      if (player.actionState.type === 'jetpacking') {
        speed = this.jetpackXSpeed;
        friction = this.airFriction;
      } else if (player.actionState.type === 'wall-grab') {
        if (player.actionState.hasPhysics) {
          speed = this.airMoveSpeed;
          friction = this.airFriction;
        }
      }
    } else if (player.isGrounded) {
      speed = this.moveSpeed;
      friction = this.friction;
      if (player.isCrouching) {
        speed *= this.crouchSpeedMult;
      }
    } else if (!player.isGrounded) {
      speed = this.airMoveSpeed;
      friction = this.airFriction;
    }
    if (player.landTime > 0) friction *= this.extraLandFriction;

    if (player.bounceTime <= 0) {
      if (player.keys.left && !player.holdLeft) {
        player.actionState?.onLR?.(-1);
        player.vX += -speed;
      }
      if (player.keys.right && !player.holdRight) {
        player.actionState?.onLR?.(1);
        player.vX += speed;
      }
    }

    if (!player.keys.left) player.holdLeft = false;
    if (!player.keys.right) player.holdRight = false;

    player.vX *= friction;
    player.vX = _.clamp(player.vX, -this.maxSpeed, this.maxSpeed);
    if (Math.abs(player.vX) < this.minSpeed) {
      player.vX = 0;
    }
  }

  public canJump(player: PlayerSprite) {
    if (player.holdUp) return false;
    if (player.actionState) return player.actionState.canJump;
    if (player.isCrouching) return false;
    if (player.landTime > 0) return false;
    if (player.isGrounded) return true;
    if (!player.isGrounded && player.doubleJumpsRemaining > 0) return true;

    return false;
  }

  public moveAndCollide(player: PlayerSprite) {
    // VERTICAL

    // UPDATE
    player.actionState?.updateY?.();
    player.y += player.vY;

    // COLLIDE
    if (player.vY < 0) {
      // COLLIDE UP
      let upCollision = this.world.checkTop(player.getCollider(), player.isGhost);
      
      if (upCollision) {
        if (player.isGrounded) player.isCrouching = true;
        else{
          if (player.vY < 0) {
            player.y += upCollision.depth;
            if(this.specialBlockCheck(player, upCollision, 0, -1)) {
            } else {
              if (player.actionState && player.actionState.onCollisionUp) {
                player.actionState.onCollisionUp(upCollision);
              } else {
                player.vY = 0;
              }
            }
          }
        }
      }
    } else {
      // COLLIDE DOWN
      let downCollision = this.world.checkBottom(player.getCollider(), player.isGhost);
      
      if (downCollision) {
        player.holdLeft = false;
        player.holdRight = false;
        if (player.actionState && player.actionState.onCollisionDown) {
          player.actionState.onCollisionDown(downCollision);
        } else if (!player.isGrounded) {
          if (player.vY > 0) {
            if (downCollision.type) {
              player.isGrounded = true;
              player.landTime = this.landTimeBase + Math.abs(player.vY) * this.landTimeVMult;
              player.doubleJumpsRemaining = this.maxDoubleJumps;
              player.wallGrabsRemaining = this.maxWallGrabs;
  
              player.stepBlock = downCollision.type;
    
              player.y -= downCollision.depth;
              player.vY = 0;
              player.landing();
            } else {
              if (downCollision.depth < -player.height) {
                this.respawn(player);
                return;
              }
            }
          }
        }
      }

      if (player.isGrounded && (!player.actionState || player.actionState.hasPhysics)) {
        this.checkIfFall(player, downCollision);
      }
    }

    // HORIZONTAL
    // UPDATE
    player.x += player.vX;
    
    // COLLIDE
    if (player.actionState && player.actionState.onCollisionLR) {
      player.actionState.onCollisionLR();
    } else {
      let direction = Math.sign(player.vX);
      let lrCollision = this.world.checkLR(player.getCollider(), player.isGhost, direction);
      
      if (lrCollision && lrCollision.depth > 0) {
        player.x -= lrCollision.depth * direction;

        if(this.specialBlockCheck(player, lrCollision, direction, 0)) return;

        if (!player.actionState) {
          let hlrCollision = this.world.checkLR(player.getTopCollider(), player.isGhost, direction);
          if (!player.isCrouching && !hlrCollision && (player.vX === 0 || Math.sign(player.vX) === direction)) {
            this.startClimbing(player, direction);
            return;
          } else if (!player.isGrounded && player.wallGrabsRemaining > 0) {
            let key = direction < 0 ? player.keys.left : player.keys.right;
            let oKey = direction < 0 ? player.keys.right : player.keys.left;
            let oHeld = direction < 0 ? player.holdRight : player.holdLeft;

            if (((!oKey || oHeld) && Math.sign(player.vX) === direction && Math.abs(player.vX) > this.minGrabSpeedX) ||
                (key && player.vY < 0 && player.vY > this.maxGrabSpeedY)) {
              this.startWallGrab(player, direction);
              return;
            }
          }
        }

        if (Math.sign(player.vX) === direction) {

          if (Math.abs(player.vX) < this.minBounceSpeed) {
            player.vX = 0;
          } else {
            player.vX = this.bounce * player.vX;
            player.bounceTime = this.bounceTime;
          }
        }
      }
    }
  }

  public specialBlockCheck(player: PlayerSprite, c: ColliionResponse, hd: number, vd: number) {
    if (!c.type) return false;
    if (c.type === 'spring' || c.type === 'exploding') {
      if (c.type === 'exploding' && c.block) {
        
        if (player.isGhost) {
          c.block.usedByGhost = true;
        } else { 
          c.block.usedByPlayer = true;
          c.block.explode();
        }
      }
      if (vd !== 0) player.vY = this.springSpeed * vd;
      if (hd !== 0) player.vX = this.springSpeed * hd;
      player.bounceTime = 0;
      player.landTime = 0;
      if (vd === 1) player.isGrounded = false;
      return true;
    } else if (c.type === 'goal') {
      if (vd === 1) {
        this.startVictory(player, Math.sign(player.vX));
        return true;
      }
    }
    // if (type === 'switch') {
    //   if (vd === 1) {
    //     this.world.getObject(block).shrinkAway(() => {
    //       GameEvents.SWITCH_ACTIVATED.publish(block);
    //     });
    //   }
    //   return false;
    // }

    return false;
  }

  public checkIfFall(player: PlayerSprite, dCollision: ColliionResponse): Boolean {
    if (!dCollision || dCollision.depth < 0) {
      if (player.isCrouching) {
        let uCollision = this.world.checkTop(player.getCollider(true), player.isGhost);
        if (uCollision) player.y += uCollision.depth;
      }
      player.stepBlock = null;
      player.isGrounded = false;
      player.isCrouching = false;

      return true;
    } else {
      if (dCollision.type) player.stepBlock = dCollision.type;

      // if (dCollision.depth <= 0 && vCollision.downBlock && vCollision.downBlock.type === 'mud') {
      //   player.vX *= (this.mudXExtraFrictionBase + vCollision.down / this.mudMaxSink * this.mudXExtraFrictionMult);
      //   if (vCollision.down > this.mudMaxSink) {
      //     player.y += this.mudFall;
      //   } else {
      //     player.y += (vCollision.down - this.mudMaxSink);
      //   }
      if (dCollision.depth === 0) {
        return this.specialBlockCheck(player, dCollision, 0, 1);
      }
    }

    return false;
  }

  startVictory(player: PlayerSprite, direction: number) {
    player.actionState = {
      type: 'victory',
      direction,
      maxTime: Infinity,
      timeRemaining: Infinity,
    };

    if (!player.isGhost) GameEvents.LEVEL_COMPLETE.publish();
  }

  startRoll(player: PlayerSprite, direction: number) {
    player.actionState = {
      type: 'rolling',
      direction,
      maxTime: this.rollTime,
      timeRemaining: this.rollTime - 1,
      onExpire: () => {
        player.bounceTime = this.rollAfterTime;
        player.isCrouching = true;
      },
      hasPhysics: true,
    };

    player.isCrouching = true;
    player.landTime = 0;

    player.vX = _.clamp(player.vX * this.rollSpeedMult, -this.maxRollSpeed, this.maxRollSpeed);
  }

  startWallGrab(player: PlayerSprite, direction: number) {
    let coyote = -1;
    player.actionState = {
      type: 'wall-grab',
      direction,
      maxTime: this.grabTime,
      timeRemaining: this.grabTime,
      onExpire: () => {
          player.isGrounded = false;
      },
      canJump: true,
      onDown: () => {
        player.actionState = null;
        player.isGrounded = false;
        player.isCrouching = true;
      },
      onJump: () => {
        player.vY = this.jumpSpeed;
        player.vX = -this.kickVX * player.actionState.direction;
        player.bounceTime = this.kickTime;
        player.actionState = null;

        return true;
      },
      onLR: (pressed: number) => {
        if (coyote < 0 && pressed !== direction) {
          coyote = this.coyoteWallTime;
          player.actionState.hasPhysics = true;
          player.isGrounded = false;
        }
      },
      updateY: () => {
        if (coyote > 0) {
          player.vY += this.wallCoyoteVY;
          coyote--;
          if (coyote === 0) {
            player.actionState = null;
          }
        } else {
          player.y += this.grabSlideSpeed;
        }
      },
      onCollisionDown: (vCollision: ColliionResponse) => {
        player.y -= vCollision.depth;
        player.actionState = null;
      },
      onCollisionLR: () => {
        let collision = this.world.checkLR(player.getCollider(), player.isGhost, direction);
        if (!collision && coyote <= 0) {
          player.actionState = null;
          return;
        }
      },
    };

    player.vX = 0;
    player.vY = 0;
    player.wallGrabsRemaining--;
    player.isGrounded = true;
    direction === 1 ? (player.holdRight = true) : (player.holdLeft = true);
  }

  startJetpacking(player: PlayerSprite, direction: number) {
    player.actionState = {
      type: 'jetpacking',
      direction,
      maxTime: Infinity,
      timeRemaining: Infinity,
      hasPhysics: false,
      canJump: false,
      updateY: () => {
        player.vY = Math.max(player.vY + this.jetpackYSpeed, this.jetpackMaxSpeed);
      },
      onCollisionUp: (vCollision: ColliionResponse) => {
        player.vY = this.bounce * player.vY;
        player.bounceTime = this.bounceTime;
      },
      onCollisionDown: (vCollision: ColliionResponse) => {
        if (player.vY >= 0) {
          player.y -= vCollision.depth;
          player.vY = this.bounce * player.vY;
          player.bounceTime = this.bounceTime;
        }
      }
    }

    player.isCrouching = false;
    player.isGrounded = false;
  }

  startClimbing(player: PlayerSprite, direction: number) {
    player.actionState = {
      type: 'climbing',
      direction,
      maxTime: Infinity,
      canJump: true,
      timeRemaining: Infinity,
      updateY: () => player.y -= this.climbSpeed,
      onJump: () => {
        player.actionState = null;
        player.isGrounded = false;
        player.isCrouching = true;
        player.holdLeft = player.holdRight = false;
      },
      onCollisionLR: () => {
        let collision = this.world.checkLR(player.getCollider(), player.isGhost, direction);

        if (!collision) {
          player.isCrouching = true;
          player.isGrounded = true;
          player.x += this.climbInset * player.actionState.direction;
          player.y += 10;
          let vCollision = this.world.checkBottom(player.getCollider(), player.isGhost);
          if (vCollision) {
            if (vCollision.depth > 0) {
              player.y -= vCollision.depth;
            }
          }
          collision = this.world.checkLR(player.getCollider(), player.isGhost, direction);
          if (collision && collision.depth > 0) player.x -= collision.depth * direction;
          player.actionState = null;
        }
      },
      onDown: () => {
        player.actionState = null;
        player.isGrounded = false;
        player.isCrouching = true;
      },

      onLR: (d: number) => {
        if (d === direction && (direction === 1 && !player.holdRight) || (direction === -1 && !player.holdLeft)) {
          player.actionState = null;
          let climbHeight = Math.round((player.y - player.height / 2) / LevelLoader.TILE_SIZE) * LevelLoader.TILE_SIZE;
          player.y = climbHeight;
          player.x += this.climbInset * direction;
          player.vX = this.vaultSpeed * direction;
          this.startRoll(player, direction);
        }
      }
    };

    direction === 1 ? (player.holdRight = true) : (player.holdLeft = true);

    player.isCrouching = true;
    player.isGrounded = true;

    player.vX = 0;
    player.vY = 0;
  }
}
