import _ from 'lodash';
import { GameEvents } from "../../services/GameEvents";
import { GameEnvironment, CollisionResponse } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";
import { IGameBlock } from '../Objects/GameBlock';

export class PlayerMovement {
  private moveSpeed = 1.2;
  private maxSpeed = 12;
  private minSpeed = 0.12;
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
  private mudCollisionX = -3;

  private mudXExtraFrictionBase = 0.3;
  private mudXExtraFrictionMult = -0.1;
  private crouchSpeedMult = 0.5;
  private rollSpeedMult = 1.5;
  private friction = 0.8;
  private extraLandFriction = 0.8;
  private airFriction = 0.95;
  private bounce = -0.7;
  
  private bounceTime = 5;
  private airBounceTime = 1;
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

  public setPlayer(player: PlayerSprite) {
    player.maxRollTime = this.rollTime;
    player.maxGrabTime = this.grabTime;
  }

  public respawn(player: PlayerSprite) {
    let lastCheckpoint = this.world.objects.filter(obj => obj.type === 'checkpoint' && obj.x < player.x).sort((a, b) => b.x - a.x)[0];
    if (lastCheckpoint) {
      player.x = lastCheckpoint.x + lastCheckpoint.width / 2;
      player.y = lastCheckpoint.y;
      player.setMovementState('idle');
    } else {
      player.x = this.world.data.startingPosition.x;
      player.y = this.world.data.startingPosition.y;
    }
  }

  public playerTick = (player: PlayerSprite) => {
    if (!player) return;

    player.landTime > 0 && player.landTime--;
    player.bounceTime > 0 && player.bounceTime--;
    player.grabTime > 0 && player.grabTime--;
    player.rollTime > 0 && player.rollTime--;

    if ((player.movementState === 'wall-grab-left' || player.movementState === 'wall-grab-right')  && player.grabTime <= 0) {
      player.setMovementState('falling');
    }

    if (player.movementState === 'rolling' && player.rollTime <= 0) {
      player.bounceTime = this.rollAfterTime;
      player.setMovementState('crawling');
    }

    this.updatePlayerActions(player);
    this.moveAndCollide(player);

    GameEvents.ACTIVITY_LOG.publish({slug: 'VELOCITY', text: `${player.vX.toFixed(2)}, ${player.vY.toFixed(2)}`});
  }

  public updatePlayerActions(player: PlayerSprite) {
    if (player.keys.jetpack) {
      player.setMovementState('jetpacking');
    } else if (player.movementState === 'jetpacking') {
        player.setMovementState('ascending');
    }

    if (player.keys.up) {
      if (this.canJump(player)) {
        if (this.isAirborn(player)) player.doubleJumpsRemaining--;
        if (player.movementState === 'wall-grab-left') {
          player.vX = this.kickVX;
          player.bounceTime = this.kickTime;
        } else if (player.movementState === 'wall-grab-right') {
          player.vX = -this.kickVX;
          player.bounceTime = this.kickTime;
        }
        
        let tvc = this.world.checkVertical(player.getCollider(), player.isGhost);
        if (tvc.down < this.minMudJumpStop && tvc.downBlock && tvc.downBlock.type === 'mud') {
          let percent = tvc.down / this.mudMaxSink;
          player.vY = this.mudJumpSpeedMin + percent * this.mudJumpSpeedMult;
        } else {
          player.vY = Math.max(this.jumpSpeed, player.vY + this.jumpSpeed);
        }

        player.setMovementState('ascending');
        player.stepBlock = null;
        player.holdUp = true;
      } else {
        if (player.movementState === 'ascending') player.holdUp = true;
      }
    } else {
      player.holdUp = false;
    }

    if (player.keys.down) {
      if (player.movementState === 'idle') player.setMovementState('crouching');
      if (player.movementState === 'walking') {
        if (Math.abs(player.vX) > this.rollSpeedNeeded) {
          player.setMovementState('rolling');
          player.landTime = 0;
          player.vX = _.clamp(player.vX * this.rollSpeedMult, -this.maxRollSpeed, this.maxRollSpeed);
          player.rollTime = this.rollTime;
        } else {
          player.setMovementState('crawling');
        }
      } else if (player.movementState === 'ascending' || player.movementState === 'falling') {
        player.setMovementState('diving');
        player.vY = Math.max(this.divingSpeed, player.vY);
      } else if (player.movementState === 'wall-grab-left' || player.movementState === 'wall-grab-right') {
        player.setMovementState('falling');
      }
    } else {
      if (player.movementState === 'crouching' && this.world.checkVertical(player.getCollider('idle'), player.isGhost).up >= 0) {
        player.setMovementState('idle');
      } else if (player.movementState === 'crawling' && this.world.checkVertical(player.getCollider('walking'), player.isGhost).up >= 0) {
        player.setMovementState('walking');
      }
    }

    if (this.isAirborn(player)) {
      player.vY = Math.min(player.vY + this.gravity, this.terminalVelocity);
    } else if (player.movementState === 'jetpacking') {
      player.vY = Math.max(player.vY + this.jetpackYSpeed, this.jetpackMaxSpeed);
    }

    let friction = 1;
    let speed = 0;

    if (player.movementState === 'idle' || player.movementState === 'walking') {
      speed = this.moveSpeed;
      friction = this.friction;
      player.setMovementState('walking');
    } else if (player.movementState === 'crouching' || player.movementState === 'crawling') {
      speed = this.moveSpeed * this.crouchSpeedMult;
      friction = this.friction;
      player.setMovementState('crawling');
    } else if (this.isAirborn(player)) {
      speed = this.airMoveSpeed;
      friction = this.airFriction;
    } else if (player.movementState === 'jetpacking') {
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
      if (player.movementState === 'walking') player.movementState = 'idle';
      if (player.movementState === 'crawling') player.movementState = 'crouching';
    }
  }

  public canJump(player: PlayerSprite) {
    if (player.landTime > 0) return false;
    if (player.holdUp) return false;
    if (player.movementState === 'idle' || player.movementState === 'walking') return true;
    if (player.movementState === 'wall-grab-left' || player.movementState === 'wall-grab-right') return true;
    if (this.isAirborn(player) && player.doubleJumpsRemaining > 0) return true;

    return false;
  }

  public isGrounded(player: PlayerSprite) {
    switch(player.movementState) {
      case 'idle': case 'walking': case 'crouching': case 'crawling': case 'rolling':
        return true;
    }

    return false;
  }

  public isAirborn(player: PlayerSprite) {
    switch(player.movementState) {
      case 'ascending': case 'falling': case 'diving':
        return true;
    }

    return false;
  }

  public moveAndCollide(player: PlayerSprite) {
    // VERTICAL

    // UPDATE
    player.y += player.vY;
    if (player.movementState === 'wall-grab-left' || player.movementState === 'wall-grab-right') {
      player.y += this.grabSlideSpeed;
    } else if (player.movementState === 'climbing-left' || player.movementState === 'climbing-right') {
      player.y -= this.climbSpeed;
    } else if (player.movementState === 'ascending' && player.vY > 0) {
      player.setMovementState('falling');
    }

    // COLLIDE
    let vCollision = this.world.checkVertical(player.getCollider(), player.isGhost);
    
    // COLLIDE UP
    if (vCollision.up < 0) {
      if (player.movementState === 'idle') player.setMovementState('crouching');
      else if (player.movementState === 'walking') player.setMovementState('crawling');
      else if (this.isAirborn(player) || player.movementState === 'jetpacking') {
        if (player.vY < 0) {
          player.y -= vCollision.up;
          if (player.movementState !== 'jetpacking') player.setMovementState('falling');
          if(this.specialBlockCheck(player, vCollision.upBlock, -1, 0)) {

          } else {
            if (player.movementState === 'jetpacking') {
              player.vY = this.bounce * player.vY;
              player.bounceTime = this.bounceTime;
            } else {
              player.vY = 0;
            }
          }
        }
      } else if (player.movementState === 'climbing-left' || player.movementState === 'climbing-right') {
        player.y += vCollision.up;
        player.setMovementState('falling');
        return;
      }
    }

    // COLLIDE DOWN
    if (vCollision.down < 0) {
      if (this.isAirborn(player)) {
        if (player.vY > 0) {
          if (vCollision.downBlock) {
            player.stepBlock = vCollision.downBlock;
  
            player.landTime = this.landTimeBase + Math.abs(player.vY) * this.landTimeVMult;
  
            player.y += vCollision.down;
            player.vY = 0;
      
            if (player.movementState === 'diving') player.setMovementState('crawling');
            else player.setMovementState('walking');
            
            player.doubleJumpsRemaining = this.maxDoubleJumps;
            player.wallGrabsRemaining = this.maxWallGrabs;
            return;
          } else {
            if (vCollision.down < -player.height) {
              this.respawn(player);
              return;
            }
          }
        }
      } else if (player.movementState === 'wall-grab-left' || player.movementState === 'wall-grab-right') {
        player.y += vCollision.down;
        player.setMovementState('idle');
        return;
      } else if (player.movementState === 'jetpacking') {
        if (player.vY >= 0) {
          player.y += vCollision.down - player.vY;
          player.vY = this.bounce * player.vY;
          player.bounceTime = this.bounceTime;
        }
      }
    } else {
      if (this.isGrounded(player)) {
        if (this.checkIfFall(player, vCollision)) return;
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
  
          if (topDepth > 0 && (player.vX === 0 || Math.sign(player.vX) === direction)) {
            player.vX = 0;
            player.vY = 0;
            player.setMovementState(direction < 0 ? 'climbing-left' : 'climbing-right');
            return;
          } else if (this.isAirborn(player) && player.wallGrabsRemaining > 0) {
            let key = direction < 0 ? player.keys.left : player.keys.right;
            let oKey = direction < 0 ? player.keys.right : player.keys.left;

            if ((!oKey && Math.sign(player.vX) === direction && Math.abs(player.vX) > this.minGrabSpeedX) ||
                (key && player.vY < 0 && player.vY > this.maxGrabSpeedY)) {
              player.vX = 0;
              player.vY = 0;
              player.wallGrabsRemaining--;
              player.grabTime = this.grabTime;
              player.setMovementState(direction < 0 ? 'wall-grab-left' : 'wall-grab-right');
              return;
            }
          }
          if (Math.sign(player.vX) === direction) {
            player.vX = this.bounce * player.vX;
            player.bounceTime = this.bounceTime;
            if (player.movementState === 'walking' && Math.abs(player.vX) < this.maxSpeed / 2) {
              player.setMovementState('idle');
              player.vX = 0;
            }  else if (player.movementState === 'crawling' && Math.abs(player.vX) < this.maxSpeed / 2) {
              player.setMovementState('crouching');
              player.vX = 0;
            }
          }
        }
      }
    }
    if (player.movementState === 'wall-grab-left' || player.movementState === 'wall-grab-right') {
      if (hCollision.left > 0 && hCollision.right > 0) {
        player.setMovementState('falling');
        return;
      }
    } else if (player.movementState === 'climbing-left') {
      if (hCollision.left > 0) {
        player.setMovementState('crouching');
        player.x -= this.climbInset;
        vCollision = this.world.checkVertical(player.getCollider(), player.isGhost);
        if (vCollision.down < 0) {
          player.y += vCollision.down;
        }
      } else if (hCollision.left === 0 && hCollision.leftBlock) {
        let blockHeight = hCollision.leftBlock.y;
        player.climbHeight = blockHeight - player.y;
      }
    } else if (player.movementState === 'climbing-right') {
      if (hCollision.right > 0) {
        player.setMovementState('crouching');
        player.x += this.climbInset;
        vCollision = this.world.checkVertical(player.getCollider(), player.isGhost);
        if (vCollision.down < 0) {
          player.y += vCollision.down;
        }
      } else if (hCollision.right === 0 && hCollision.rightBlock) {
        let blockHeight = hCollision.rightBlock.y;
        player.climbHeight = blockHeight - player.y;
      }
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
      if (vd === 1) player.setMovementState('ascending');
      return true;
    } else if (block.type === 'goal') {
      if (vd === 1) {
        player.setMovementState('victory');
        if (!player.isGhost) GameEvents.LEVEL_COMPLETE.publish();
        return true;
      }
    }

    return false;
  }

  public checkIfFall(player: PlayerSprite, vCollision: CollisionResponse): Boolean {
    if (vCollision.down > 0) {
      player.stepBlock = null;
      if (player.movementState === 'crouching' || player.movementState === 'crawling' || player.movementState === 'rolling') {
        player.setMovementState('falling');
        vCollision = this.world.checkVertical(player.getCollider(), player.isGhost);
        if (vCollision.up < 0) player.y -= vCollision.up;
      } else {
        player.setMovementState('falling');
      }
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
}
