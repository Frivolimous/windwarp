import _ from 'lodash';
import { GameEvents } from "../../services/GameEvents";
import { GameEnvironment, WorldResponse } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";

export class PlayerMovement {
  private moveSpeed = 1;
  private maxSpeed = 7.5;
  private minSpeed = 0.1;
  private jumpSpeed = -7.5;
  private springSpeed = -15;
  private gravity = 0.45;
  private airMoveSpeed = 0.5;
  private terminalVelocity = 15;
  private kickVX = 10;
  private climbSpeed = 1;
  private minGrabSpeed = 2;
  private divingSpeed = 10;
  private grabSlideSpeed = 0.5;
  private maxRollSpeed = 7.5;
  private rollSpeedNeeded = 2.04;
  private jetpackSpeed = -0.25;
  private jetpackMaxSpeed = -5;
  private climbInset = 3;

  private crouchSpeedMult = 0.5;
  private rollSpeedMult = 1.5;
  private friction = 0.8;
  private airFriction = 0.9;
  private bounce = -0.5;
  
  private bounceTime = 5;
  private kickTime = 15;
  private grabTime = 50;
  private rollTime = 20;
  private rollAfterTime = 5;
  private landTimeBase = 5;
  private landTimeVMult = 1;


  private maxDoubleJumps = 1;
  private maxWallGrabs = Infinity;

  private player: PlayerSprite;
  constructor(private world: GameEnvironment) {

  }

  public setPlayer(player: PlayerSprite) {
    this.player = player;
    this.player.maxRollTime = this.rollTime;
    this.player.maxGrabTime = this.grabTime;
  }

  public respawn(player: PlayerSprite) {
    let lastCheckpoint = this.world.objects.filter(obj => obj.type === 'checkpoint' && obj.x < player.x).sort((a, b) => b.x - a.x)[0];
    if (lastCheckpoint) {
      player.x = lastCheckpoint.x + lastCheckpoint.width / 2 - player.collider.width / 2;
      player.y = lastCheckpoint.y - player.collider.height;
      player.setMovementState('idle');
    } else {
      player.x = this.world.data.startingPosition.x;
      player.y = this.world.data.startingPosition.y;
    }
  }

  public playerTick = (player: PlayerSprite) => {
    if (!player) return;

    if (player.keys.jetpack) {
      player.setMovementState('jetpacking');
    }

    if (player.landTime >= 0) {
      player.landTime--;
    }

    if (player.bounceTime > 0) {
      player.bounceTime--;
    }

    if (player.grabTime > 0) {
      player.grabTime--;
    }

    if (player.rollTime > 0) {
      player.rollTime--;
    }

    switch(this.player.movementState) {
      case 'idle': case 'crouching': this.tickIdle(player); break;
      case 'walking': case 'crawling': this.tickWalk(player); break;
      case 'ascending': case 'falling': case 'diving': this.tickAirborn(player); break;
      case 'wall-grab-left': case 'wall-grab-right': this.tickGrab(player); break;
      case 'climbing-left': case 'climbing-right': this.tickClimbing(player); break;
      case 'rolling': this.tickRolling(player); break;
      case 'jetpacking': this.tickJetpacking(player); break;
      case 'victory': break;
    }

    if (this.player.keys.holdUp) {
      if (!this.player.keys.up) this.player.keys.holdUp = false;
    }

    GameEvents.ACTIVITY_LOG.publish({slug: 'VELOCITY', text: `${player.vX.toFixed(2)}, ${player.vY.toFixed(2)}`});
  }

  // if player is IDLE or CROUCHING
  public tickIdle(player: PlayerSprite) {
    let objectDistance = this.world.checkWorld(player.getCollider());

    // 1. determine player actions
    if (player.keys.up && player.movementState === 'idle' && player.landTime <= 0) {
      if (this.startJump(player)) {
        this.tickAirborn(player);
        return;
      }
    }

    if (player.keys.down && player.movementState !== 'crouching') {
      player.setMovementState('crouching');
    } else if (!player.keys.down && player.movementState === 'crouching' && this.world.checkVertical(player.getCollider('idle')).up >= 0) {
      player.setMovementState('idle');
    }

    if ((player.keys.right && objectDistance.right > this.moveSpeed) ||
        (player.keys.left && objectDistance.left > this.moveSpeed)) {
      player.setMovementState(player.movementState === 'idle' ? 'walking' : 'crawling');
      this.tickWalk(player);
      return;
    }

    // VERTICAL
    player.vY = 0;
    player.y = player.y;

    let vCollision = this.world.checkVertical(player.getCollider());

    if (vCollision.up < 0 && player.movementState === 'idle') player.setMovementState('crouching');
    if (this.checkIfFall(player, vCollision)) return;

    // HORIZONTAL

    player.vX = 0;
    player.x = player.x;

    let hCollision = this.world.checkHorizontal(player.getCollider());


    if (hCollision.left < 0) player.x -= hCollision.left;
    if (hCollision.right < 0) player.x += hCollision.right;
  }

  // if player is WALKING or CRAWLING
  public tickWalk(player: PlayerSprite) {
    // 1. determine player actions
    if (player.keys.up && player.movementState === 'walking' && player.landTime <= 0) {
      if (this.startJump(player)) return;
    }

    if (player.keys.down && player.movementState === 'walking') {
      if(Math.abs(player.vX) > this.rollSpeedNeeded) {
        player.setMovementState('rolling');
        player.vX = _.clamp(player.vX * this.rollSpeedMult, -this.maxRollSpeed, this.maxRollSpeed);
        player.rollTime = this.rollTime;
        this.tickRolling(player);
        return;
      } else {
        player.setMovementState('crawling');
      }
    } else if (!player.keys.down && player.movementState === 'crawling' &&  this.world.checkVertical(player.getCollider('walking')).up >= 0) {
      player.setMovementState('walking');
    }

    if (player.bounceTime <= 0 && player.landTime <= 0) {
      if (player.keys.right) {
        player.vX += this.moveSpeed * (player.movementState === 'crawling' ? this.crouchSpeedMult : 1);
      }
      if (player.keys.left) {
        player.vX -= this.moveSpeed * (player.movementState === 'crawling' ? this.crouchSpeedMult : 1)
      }
    }

    // VERTICAL
    player.vY = 0;

    let vCollision = this.world.checkVertical(player.getCollider());
    if (this.checkIfFall(player, vCollision)) return;


    // HORIZONTAL
    player.vX *= this.friction;
    player.vX = _.clamp(player.vX, -this.maxSpeed, this.maxSpeed);

    if (Math.abs(player.vX) < this.minSpeed) {
      player.vX = 0;
      player.setMovementState(player.movementState === 'walking' ? 'idle' : 'crouching');
      return;
    }

    player.x += player.vX;

    // HORIZONTAL COLLISIONS
    let hCollision = this.world.checkHorizontal(player.getCollider());
    let hTopCollision = this.world.checkHorizontal(player.getTopCollider());
    
    if (hCollision.left < 0) {
      player.x -= hCollision.left;

      if (hCollision.leftBlock && (hCollision.leftBlock.type === 'spring' || hCollision.leftBlock.type === 'exploding')) {
          if (hCollision.leftBlock.type === 'exploding') this.world.getObject(hCollision.leftBlock).explode();
          player.vX = -this.springSpeed;
          player.bounceTime = this.bounceTime;
      } else {
        if (hTopCollision.left > 0 && player.vX <= 0) {
          player.vX = 0;
          player.vY = 0;
          player.setMovementState('climbing-left');
          return;
        } else if (player.vX < 0) {
          if (player.vX < -this.maxSpeed / 2) {
            player.vX = this.bounce * player.vX;
            player.bounceTime = this.bounceTime;
          } else {
            player.setMovementState(player.movementState === 'walking' ? 'idle' : 'crouching');
            player.vX = 0;
          }
        }
      }
    }

    if (hCollision.right < 0) {
      player.x += hCollision.right;

      if (hCollision.rightBlock && (hCollision.rightBlock.type === 'spring' || hCollision.rightBlock.type === 'exploding')) {
        if (hCollision.rightBlock.type === 'exploding') this.world.getObject(hCollision.rightBlock).explode();
        player.vX = this.springSpeed;
        player.bounceTime = this.bounceTime;
      } else {
        if (hTopCollision.right > 0 && player.vX >= 0) {
          player.vX = 0;
          player.vY = 0;
          player.setMovementState('climbing-right');
          return;
        } else if (player.vX > 0) {
          if (player.vX > this.maxSpeed / 2) {
            player.vX = this.bounce * player.vX;
            player.bounceTime = this.bounceTime;
          } else {
            player.setMovementState('idle');
            player.vX = 0;
          }
        }
      }
    }
  }

  // if player is ASCENDING, FALLING or DIVING
  public tickAirborn(player: PlayerSprite) {
    // 1. determine player actions
    if (player.keys.up) {
      if (!player.keys.holdUp) {
        if (player.doubleJumpsRemaining > 0) {
          player.doubleJumpsRemaining -= 1;
          if (this.startJump(player, true)) return;
        } else {
          if (player.movementState === 'ascending') {
            player.keys.holdUp = true;
          }
        }
      }
    }

    if (player.keys.down && player.movementState !== 'diving') {
      player.setMovementState('diving');
      player.vY = Math.max(this.divingSpeed, player.vY);
    }

    if (player.bounceTime <= 0) {
      if (player.keys.right) {
        player.vX += this.airMoveSpeed;
      }
      if (player.keys.left) {
        player.vX -= this.airMoveSpeed;
      }
    }

    // Y AXIS
    // 2. movement
    player.vY += this.gravity;
    player.vY = _.clamp(player.vY, -this.terminalVelocity, this.terminalVelocity);
    player.y += player.vY;
    
    // 3. Collision
    let vCollision = this.world.checkVertical(player.getCollider());

    if (vCollision.down <= 0 && (player.movementState === 'falling' || player.movementState === 'diving')) {
      if (vCollision.downBlock) {
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

    if (vCollision.up < 0) {
      if (player.movementState === 'ascending') {
        player.y -= vCollision.up;
        player.setMovementState('falling');
        if (vCollision.upBlock && (vCollision.upBlock.type === 'spring' || vCollision.upBlock.type === 'exploding')) {
          if (vCollision.upBlock.type === 'exploding') this.world.getObject(vCollision.upBlock).explode();
          player.vY = -this.springSpeed;
          return;
        } else {
          player.vY = 0;
          return;
        }
      }
    }

    // X AXIS
    // 2. movement
    player.vX *= this.airFriction;
    player.vX = _.clamp(player.vX, -this.maxSpeed, this.maxSpeed);
    player.x += player.vX;

    // 3. Collision
    let hCollision = this.world.checkHorizontal(player.getCollider());
    let hTopCollision = this.world.checkHorizontal(player.getTopCollider());

    if (hCollision.left < 0) {
      player.x -= hCollision.left;
      if (hCollision.leftBlock && (hCollision.leftBlock.type === 'spring' || hCollision.leftBlock.type === 'exploding')) {
        if (hCollision.leftBlock.type === 'exploding') this.world.getObject(hCollision.leftBlock).explode();
        player.vX = -this.springSpeed;
        return;
      }
      if (hTopCollision.left > 0 && player.vX <= 0) {
        player.vX = 0;
        player.vY = 0;
        player.setMovementState('climbing-left');
      } else if (player.wallGrabsRemaining > 0 && !player.keys.right && player.vX < -this.minGrabSpeed) {
        player.vX = 0;
        player.vY = 0;
        player.wallGrabsRemaining--;
        player.grabTime = this.grabTime;
        player.setMovementState('wall-grab-left');
      } else if (player.vX < 0) {
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }

    if (hCollision.right < 0) {
      player.x += hCollision.right;
      if (hCollision.rightBlock && (hCollision.rightBlock.type === 'spring' || hCollision.rightBlock.type === 'exploding')) {
        if (hCollision.rightBlock.type === 'exploding') this.world.getObject(hCollision.rightBlock).explode();
        player.vX = this.springSpeed;
        return;
      }
      if (hTopCollision.right > 0 && player.vX >= 0) {
        player.vX = 0;
        player.vY = 0;
        player.setMovementState('climbing-right');
      } else if (player.wallGrabsRemaining > 0 && !player.keys.left && player.vX > this.minGrabSpeed) {
        player.vX = 0;
        player.vY = 0;
        player.wallGrabsRemaining--;
        player.grabTime = this.grabTime;
        player.setMovementState('wall-grab-right');
      } else if (player.vX > 0) {
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }

    if (player.movementState === 'ascending' && player.vY > 0) {
      player.setMovementState('falling');
    }
  }

  public tickGrab(player: PlayerSprite) {
    // PLAYER MOVEMENT
    if (player.keys.up) {
      let c = player.movementState === 'wall-grab-left' ? 1 : -1;
      if (this.startJump(player)) {
        player.vX = this.kickVX * c;
        player.bounceTime = this.kickTime;
        this.tickAirborn(player);
        return;
      }
    } else if (player.keys.down || (player.keys.right && player.movementState === 'wall-grab-left') || (player.keys.left && player.movementState === 'wall-grab-right')) {
      player.setMovementState('falling');
      return;
    }

    if (player.grabTime <= 0) {
      player.setMovementState('falling');
    }

    // VERTICAL
    this.player.y += this.grabSlideSpeed;

    let vCollision = this.world.checkVertical(player.getCollider());

    if (vCollision.down < 0) {
      player.y += vCollision.down;
      player.setMovementState('idle');
      return;
    }

    //HORIZONTAL
    let hCollision = this.world.checkHorizontal(player.getCollider());
    if (hCollision.left > 0 && hCollision.right > 0) {
      player.setMovementState('falling');
      return;
    }
  }

  public tickClimbing(player: PlayerSprite) { 
    // let worldCollision = this.world.checkWorld(player.getCollider());
    
    // 1. Player Action
    // no actions

    // VERTICAL
    player.y-= this.climbSpeed;
    let vCollision = this.world.checkVertical(player.getCollider());

    if (vCollision.up < 0) {
      player.y += vCollision.up;
      player.setMovementState('falling');
      return;
    }

    // HORIZONTAL
    let hCollision = this.world.checkHorizontal(player.getCollider());

    if (player.movementState === 'climbing-left' && hCollision.left > 0) {
      player.setMovementState('crouching');
      player.x -= this.climbInset;
      vCollision = this.world.checkVertical(player.getCollider());
      if (vCollision.down < 0) {
        player.y += vCollision.down;
      }
      return;
    } else if (hCollision.left === 0 && hCollision.leftBlock){
      let blockHeight = hCollision.leftBlock.y;
      player.climbHeight = blockHeight - player.y;
    }
    
    if (player.movementState === 'climbing-right' && hCollision.right > 0) {
      player.setMovementState('crouching');
      player.x += this.climbInset;
      vCollision = this.world.checkVertical(player.getCollider());
      if (vCollision.down < 0) {
        player.y += vCollision.down;
      }
      return;
    } else if (hCollision.right === 0 && hCollision.rightBlock){
      let blockHeight = hCollision.rightBlock.y;
      player.climbHeight = blockHeight - player.y;
    }
  }

  public tickRolling(player: PlayerSprite) {
    // 1. playerAction

    // NONE

    if (player.rollTime <= 0) {
      player.bounceTime = this.rollAfterTime;
      player.setMovementState('crawling');
      this.tickWalk(player);
      return;
    }

    // VERTICAL
    let vCollision = this.world.checkVertical(player.getCollider());
    if (this.checkIfFall(player, vCollision)) return;

    // HORIZONTAL
    player.x += player.vX;

    let hCollision = this.world.checkHorizontal(player.getCollider());

    if (hCollision.left < 0) {
      player.x -= hCollision.left;
      if (player.vX < 0) {
        if (hCollision.leftBlock && (hCollision.leftBlock.type === 'spring' || hCollision.leftBlock.type === 'exploding')) {
          if (hCollision.leftBlock.type === 'exploding') this.world.getObject(hCollision.leftBlock).explode();
          player.vX = -this.springSpeed;
        } else {
          player.vX = this.bounce * player.vX;
          player.bounceTime = this.bounceTime;
        }
      }
    }
    
    if (hCollision.right < 0) {
      player.x += hCollision.right;
      if (player.vX > 0) {
        if (hCollision.rightBlock && (hCollision.rightBlock.type === 'spring' || hCollision.rightBlock.type === 'exploding')) {
          if (hCollision.rightBlock.type === 'exploding') this.world.getObject(hCollision.rightBlock).explode();
          player.vX = this.springSpeed;
        } else {
          player.vX = this.bounce * player.vX;
          player.bounceTime = this.bounceTime;
        }
      }
    }
  }

  public tickJetpacking(player: PlayerSprite) {
    // 1. player controls
    if (player.keys.jetpack === false) {
      if (player.movementState === 'jetpacking') {
        player.setMovementState('ascending');
        this.tickAirborn(player);
        return;
      }
    }

    if (player.bounceTime <= 0) {
      if (player.keys.right) {
        player.vX += this.airMoveSpeed;
        player.vX = Math.min(player.vX, this.maxSpeed);
      }
      if (player.keys.left) {
        player.vX -= this.airMoveSpeed;
        player.vX = Math.max(player.vX, -this.maxSpeed);
      }
    }

    // VERTICAL

    player.vY += this.jetpackSpeed;
    player.vY = Math.min(player.vY, this.terminalVelocity);
    player.vY = Math.max(player.vY, this.jetpackMaxSpeed);
    player.y += player.vY;

    let vCollision = this.world.checkVertical(player.getCollider());

    if (vCollision.down <= 0 && player.vY >= 0) {
      player.y += vCollision.down - player.vY;
      player.vY = this.bounce * player.vY;
      player.bounceTime = this.bounceTime;
    }

    if (vCollision.up < 0 && player.vY <= 0) {
      if (vCollision.upBlock && (vCollision.upBlock.type === 'spring' || vCollision.upBlock.type === 'exploding')) {
        if (vCollision.upBlock.type === 'exploding') this.world.getObject(vCollision.upBlock).explode();
        player.y -= vCollision.up + player.vY;
        player.vY = -this.springSpeed;
      } else {
        player.y -= vCollision.up + player.vY;
        player.vY = this.bounce * player.vY;
        player.bounceTime = this.bounceTime;
      }
    }

    // HORIZONTAL

    player.vX *= this.airFriction;
    player.x += player.vX;

    let hCollision = this.world.checkHorizontal(player.getCollider());

    if (hCollision.left < 0 && player.vX <= 0) {
      if (hCollision.leftBlock && (hCollision.leftBlock.type === 'spring' || hCollision.leftBlock.type === 'exploding')) {
        if (hCollision.leftBlock.type === 'exploding') this.world.getObject(hCollision.leftBlock).explode();
        player.vX = -this.springSpeed;
      } else {
        player.x -= hCollision.left;
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }

    if (hCollision.right < 0 && player.vX >= 0) {
      if (hCollision.rightBlock && (hCollision.rightBlock.type === 'spring' || hCollision.rightBlock.type === 'exploding')) {
      if (hCollision.rightBlock.type === 'exploding') this.world.getObject(hCollision.rightBlock).explode();
        player.vX = this.springSpeed;
      } else {  
        player.x += hCollision.right;
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }
  }

  public checkIfFall(player: PlayerSprite, vCollision: WorldResponse): Boolean {
    if (vCollision.down > 0) {
      if (player.movementState === 'crouching' || player.movementState === 'crawling' || player.movementState === 'rolling') {
        player.setMovementState('falling');
        vCollision = this.world.checkVertical(player.getCollider());
        if (vCollision.up < 0) player.y -= vCollision.up;
      } else {
        player.setMovementState('falling');
      }
      return true;
    } else {
      if (vCollision.down === 0 && vCollision.downBlock) {
        if (vCollision.downBlock.type === 'switch') {          
          this.world.getObject(vCollision.downBlock).shrinkAway(() => {
            GameEvents.SWITCH_ACTIVATED.publish(vCollision.downBlock);
          });
        } else if (vCollision.downBlock && (vCollision.downBlock.type === 'spring' || vCollision.downBlock.type === 'exploding')) {
          if (vCollision.downBlock.type === 'exploding') this.world.getObject(vCollision.downBlock).explode();
          player.vY = this.springSpeed;
          player.bounceTime = this.bounceTime;
          player.setMovementState('ascending');
          return true;
        } else if (vCollision.downBlock.type === 'goal') {
          player.setMovementState('victory');
          GameEvents.LEVEL_COMPLETE.publish();
          return true;
        }
      }
    }

    return false;
  }

  public startJump(player: PlayerSprite, doublejump?: boolean) {
    if (player.keys.holdUp) return false;

    player.setMovementState('ascending');
    player.vY = Math.max(this.jumpSpeed, player.vY + this.jumpSpeed);
    player.keys.holdUp = true;

    return true;
  }
}
