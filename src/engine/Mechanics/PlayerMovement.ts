import _ from 'lodash';
import { GameEvents } from "../../services/GameEvents";
import { GameEnvironment, CollisionResponse } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";
import { IGameBlock } from '../Objects/GameBlock';

export class PlayerMovement {
  private moveSpeed = 1.2;
  private maxSpeed = 12;
  private minSpeed = 0.12;
  private minBounceSpeed = 3;
  private jumpSpeed = -9;
  private mudJumpSpeedMin = -3;
  private mudJumpSpeedMult = 2.5;
  private airMoveSpeed = 0.28;
  private jetpackXSpeed = 0.2;
  private jetpackYSpeed = -0.3;
  private springSpeed = -18;
  private gravity = 0.54;
  private terminalVelocity = 12;
  private kickVX = 6;
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

  private mudXExtraFrictionBase = 0.3;
  private mudXExtraFrictionMult = -0.1;
  private crouchSpeedMult = 0.5;
  private rollSpeedMult = 1.5;
  private friction = 0.8;
  private extraLandFriction = 0.8;
  private airFriction = 0.95;
  private bounce = -0.7;
  
  private bounceTime = 5;
  private kickTime = 15;
  private grabTime = 50;
  private rollTime = 20;
  private rollAfterTime = 5;
  private landTimeBase = 5;
  private landTimeVMult = 1;
  private mudMaxSink = -10;

  private maxDoubleJumps = 1;
  private maxWallGrabs = Infinity;

  constructor(private world: GameEnvironment) {

  }

  public respawn(player: PlayerSprite) {
    let lastCheckpoint = this.world.objects.filter(obj => obj.type === 'checkpoint' && obj.x < player.x).sort((a, b) => b.x - a.x)[0];
    if (lastCheckpoint) {
      player.x = lastCheckpoint.x + lastCheckpoint.width / 2;
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
      player.isJetpacking = true;
      player.isCrouching = false;
      player.actionState = null;
    } else if (player.isJetpacking) {
      player.isJetpacking = false;
    }

    if (player.keys.up) {
      if (this.canJump(player)) {
        if (!player.isGrounded && !player.actionState) player.doubleJumpsRemaining--;
        player?.actionState?.onJump?.();

        let tvc = this.world.checkVertical(player.getCollider(), player.isGhost);
        if (tvc.down < this.minMudJumpStop && tvc.downBlock && tvc.downBlock.type === 'mud') {
          let percent = tvc.down / this.mudMaxSink;
          player.vY = this.mudJumpSpeedMin + percent * this.mudJumpSpeedMult;
        } else {
          player.vY = Math.max(this.jumpSpeed, player.vY + this.jumpSpeed);
        }

        player.isGrounded = false;
        player.isCrouching = false;
        player.landTime = 0;
        player.stepBlock = null;
        player.holdUp = true;
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
        player.isCrouching = true;
      }
    } else {
      if (player.isCrouching && this.world.checkVertical(player.getCollider(true), player.isGhost).up >= 0) {
        player.isCrouching = false;
      }
    }

    if (player.isJetpacking) {
      player.vY = Math.max(player.vY + this.jetpackYSpeed, this.jetpackMaxSpeed);
    } else if (!player.isGrounded && (!player.actionState || player.actionState.hasPhysics)) {
      player.vY = Math.min(player.vY + this.gravity, this.terminalVelocity);
    }

    let friction = 1;
    let speed = 0;
    
    if (player.actionState) {

    } else if (player.isGrounded) {
      speed = this.moveSpeed;
      friction = this.friction;
      if (player.isCrouching) {
        speed *= this.crouchSpeedMult;
      }
    } else if (!player.isGrounded) {
      speed = this.airMoveSpeed;
      friction = this.airFriction;
    } else if (player.isJetpacking) {
      speed = this.jetpackXSpeed;
      friction = this.airFriction;
    }
    if (player.landTime > 0) friction *= this.extraLandFriction;

    if (player.keys.left || player.keys.right) {
      if (player.bounceTime <= 0) {
        let direction = 0;
  
        if (player.keys.left) direction--;
        if (player.keys.right) direction++;

        player.vX += speed * direction;
      }
    }

    player.vX *= friction;
    player.vX = _.clamp(player.vX, -this.maxSpeed, this.maxSpeed);
    if (Math.abs(player.vX) < this.minSpeed) {
      player.vX = 0;
    }
  }

  public canJump(player: PlayerSprite) {
    if (player.isJetpacking) return false;
    if (player.isCrouching) return false;
    if (player.landTime > 0) return false;
    if (player.holdUp) return false;
    if (player.actionState) return player.actionState.canJump;
    if (player.isGrounded) return true;
    if (!player.isGrounded && player.doubleJumpsRemaining > 0) return true;

    return false;
  }

  public moveAndCollide(player: PlayerSprite) {
    // VERTICAL

    // UPDATE
    player.y += player.vY;
    player.actionState?.updateY?.();

    // COLLIDE
    let vCollision = this.world.checkVertical(player.getCollider(), player.isGhost);
    
    // COLLIDE UP
    if (vCollision.up < 0) {
      if (player.isGrounded) player.isCrouching = true;
      else if (!player.isGrounded || player.isJetpacking) {
        if (player.vY < 0) {
          player.y -= vCollision.up;
          if(this.specialBlockCheck(player, vCollision.upBlock, -1, 0)) {

          } else {
            if (player.isJetpacking) {
              player.vY = this.bounce * player.vY;
              player.bounceTime = this.bounceTime;
            } else {
              player.vY = 0;
            }
          }
        }
      }
    }

    // COLLIDE DOWN
    if (vCollision.down < 0) {
      if (player.actionState && player.actionState.onCollisionDown) {
        player.actionState.onCollisionDown(vCollision);
      } else if (player.isJetpacking) {
        if (player.vY >= 0) {
          player.y += vCollision.down - player.vY;
          player.vY = this.bounce * player.vY;
          player.bounceTime = this.bounceTime;
        }
      } else if (!player.isGrounded) {
        if (player.vY > 0) {
          if (vCollision.downBlock) {
            player.isGrounded = true;
            player.landTime = this.landTimeBase + Math.abs(player.vY) * this.landTimeVMult;
            player.doubleJumpsRemaining = this.maxDoubleJumps;
            player.wallGrabsRemaining = this.maxWallGrabs;

            player.stepBlock = vCollision.downBlock;
  
            player.y += vCollision.down;
            player.vY = 0;
          } else {
            if (vCollision.down < -player.height) {
              this.respawn(player);
              return;
            }
          }
        }
      }
    } else {
      if (player.isGrounded) {
        this.checkIfFall(player, vCollision)
      }
    }

    // HORIZONTAL

    // UPDATE
    player.x += player.vX;
    
    // COLLIDE
    let hCollision = this.world.checkHorizontal(player.getCollider(), player.isGhost);
    let hTopCollision = this.world.checkHorizontal(player.getTopCollider(), player.isGhost);

    const collideHorizontal = (direction: number, depth: number, block: IGameBlock, topDepth: number, topBlock: IGameBlock) => {
      if (depth < 0) {
        if (!block || block.type !== 'mud' || block != vCollision.downBlock) {
          player.x += depth * direction;
  
          if(this.specialBlockCheck(player, block, 0, direction)) return;
  
          if (!player.actionState && topDepth > 0 && (player.vX === 0 || Math.sign(player.vX) === direction)) {
            this.startClimbing(player, direction);
            return;
          } else if (!player.isGrounded && player.wallGrabsRemaining > 0) {
            let key = direction < 0 ? player.keys.left : player.keys.right;
            let oKey = direction < 0 ? player.keys.right : player.keys.left;

            if ((!oKey && Math.sign(player.vX) === direction && Math.abs(player.vX) > this.minGrabSpeedX) ||
                (key && player.vY < 0 && player.vY > this.maxGrabSpeedY)) {
              this.startWallGrab(player, direction);
              return;
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

    if (player.actionState && player.actionState.onCollisionLR) {
      player.actionState.onCollisionLR(hCollision);
    } else {
      collideHorizontal(-1, hCollision.left, hCollision.leftBlock, hTopCollision.left, hTopCollision.leftBlock);
      collideHorizontal(1, hCollision.right, hCollision.rightBlock, hTopCollision.right, hTopCollision.rightBlock);
    }
  }

  public specialBlockCheck(player: PlayerSprite, block: IGameBlock, vd: number, hd: number) {
    if (!block) return false;
    if (block.type === 'switch') {
      if (vd === 1) {
        this.world.getObject(block).shrinkAway(() => {
          GameEvents.SWITCH_ACTIVATED.publish(block);
        });
      }
      return false;
    } else if (block.type === 'spring' || block.type === 'exploding') {
      if (block.type === 'exploding') {
        this.world.getObject(block).explode();
        if (!player.isGhost) block.usedByPlayer = true;
        if (player.isGhost) block.usedbyGhost = true;
      }
      if (vd !== 0) player.vY = this.springSpeed * vd;
      if (hd !== 0) player.vX = this.springSpeed * hd;
      player.bounceTime = this.bounceTime;
      player.landTime = 0;
      if (vd === 1) player.isGrounded = false;
      return true;
    } else if (block.type === 'goal') {
      if (vd === 1) {
        this.startVictory(player, Math.sign(player.vX));
        return true;
      }
    }

    return false;
  }

  public checkIfFall(player: PlayerSprite, vCollision: CollisionResponse): Boolean {
    if (vCollision.down > 0) {
      if (player.isCrouching) {
        vCollision = this.world.checkVertical(player.getCollider(true), player.isGhost);
        if (vCollision.up < 0) player.y -= vCollision.up;
      }
      player.stepBlock = null;
      player.isGrounded = false;
      player.isCrouching = false;
      return true;
    } else {
      if (vCollision.downBlock) player.stepBlock = vCollision.downBlock;

      if (vCollision.down <= 0 && vCollision.downBlock && vCollision.downBlock.type === 'mud') {
        player.vX *= (this.mudXExtraFrictionBase + vCollision.down / this.mudMaxSink * this.mudXExtraFrictionMult);
        if (vCollision.down > this.mudMaxSink) {
          player.y += this.mudFall;
        } else {
          player.y += (vCollision.down - this.mudMaxSink);
        }
      } else if (vCollision.down === 0) {
        return this.specialBlockCheck(player, vCollision.downBlock, 1, 0);
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
    player.actionState = {
      type: 'wall-grab',
      direction,
      maxTime: this.grabTime,
      timeRemaining: this.grabTime,
      onExpire: () => {
          player.isGrounded = false;
      },
      canJump: true,
      onDown: () => player.actionState = null,
      onJump: () => {
        player.vX = -this.kickVX * player.actionState.direction;
        player.bounceTime = this.kickTime;
        player.actionState = null;

        return true;
      },
      updateY: () => player.y += this.grabSlideSpeed,
      onCollisionDown: (vCollision: CollisionResponse) => {
        player.y += vCollision.down;
        player.actionState = null;
      },
      onCollisionLR: (hCollision: CollisionResponse) => {
        if (hCollision.left > 0 && hCollision.right > 0) {
          player.actionState = null;
          return;
        }
      },
    };

    player.vX = 0;
    player.vY = 0;
    player.wallGrabsRemaining--;
    player.isGrounded = true;
  }

  startClimbing(player: PlayerSprite, direction: number) {
    player.actionState = {
      type: 'climbing',
      direction,
      maxTime: Infinity,
      timeRemaining: Infinity,
      updateY: () => player.y -= this.climbSpeed,
      onCollisionLR: (hCollision: CollisionResponse) => {
        if ((player.actionState.direction === -1 && hCollision.left > 0) || (player.actionState.direction === 1 && hCollision.right > 0)) {
          player.isCrouching = true;
          player.x += this.climbInset * player.actionState.direction;
          let vCollision = this.world.checkVertical(player.getCollider(), player.isGhost);
          if (vCollision.down < 0) {
            player.y += vCollision.down;
          }
          hCollision = this.world.checkHorizontal(player.getCollider(), player.isGhost);
          if (hCollision.left < 0) player.x -= hCollision.left;
          if (hCollision.right < 0) player.x += hCollision.right;
          player.actionState = null;
        } else {
          if (player.actionState.direction === -1) {
            if (hCollision.left === 0 && hCollision.leftBlock) {
              let blockHeight = hCollision.leftBlock.y;
              player.climbHeight = blockHeight - player.y;
            }
          } else {
            if (hCollision.right === 0 && hCollision.rightBlock) {
              let blockHeight = hCollision.rightBlock.y;
              player.climbHeight = blockHeight - player.y;
            }
          }
        }
      },
    };

    player.isCrouching = true;
    player.isGrounded = true;

    player.vX = 0;
    player.vY = 0;
  }
}
