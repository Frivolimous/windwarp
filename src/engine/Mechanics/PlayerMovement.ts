import _ from 'lodash';
import { GameEvents } from "../../services/GameEvents";
import { GameEnvironment, WorldResponse } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";

export class PlayerMovement {
  private moveSpeed = 1;
  private maxSpeed = 7.5;
  private minSpeed = 0.25;
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
  private rollSpeedNeeded = 2;
  private jetpackSpeed = -0.25;
  private jetpackMaxSpeed = -5;

  private crouchSpeedMult = 0.5;
  private rollSpeedMult = 1.5;
  private friction = 0.8;
  private airFriction = 0.9;
  private bounce = -0.5;
  private bounceTime = 5;
  private kickTime = 15;
  private grabTime = 50;
  private landTimeVMult = 1;

  private rollTime = 20;
  private rollAfterTime = 5;
  private landTimeBase = 10;


  private maxDoubleJumps = 1;
  private maxWallGrabs = Infinity;

  private player: PlayerSprite;
  constructor(private world: GameEnvironment) {

  }

  public setPlayer(player: PlayerSprite) {
    this.player = player;
    this.player.maxRollTime = this.rollTime;
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
      player.bounceTime -= 1;
    }

    switch(this.player.movementState) {
      case 'idle': case 'crouching': this.tickIdle(player); break;
      case 'walking': case 'crawling': this.tickWalk(player); break;
      case 'ascending': case 'falling': case 'diving': this.tickAirborn(player); break;
      case 'wall-grab-left': case 'wall-grab-right': this.tickGrab(player); break;
      case 'climbing-left': case 'climbing-right': this.tickClimbing(player); break;
      case 'rolling': this.tickRolling(player); break;
      case 'jetpacking': this.tickJetpacking(player); break;
    }

    if (this.player.keys.holdUp) {
      if (!this.player.keys.up) this.player.keys.holdUp = false;
    }

    GameEvents.ACTIVITY_LOG.publish({slug: 'VELOCITY', text: `${player.vX.toFixed(2)}, ${player.vY.toFixed(2)}`});
  }

  // if player is IDLE or CROUCHING
  public tickIdle(player: PlayerSprite) {
    // 1. Get collider
    let worldCollision = this.world.checkWorld(player.getCollider());

    // 2. determine player actions
    if (player.keys.up && player.movementState === 'idle' && player.landTime <= 0) {
      if (this.startJump(player)) {
        this.tickAirborn(player);
        return;
      }
    }

    if (player.keys.down && player.movementState !== 'crouching') {
      player.setMovementState('crouching');
    } else if (!player.keys.down && player.movementState === 'crouching' && this.world.checkWorld(player.getTopCollider()).up >= 0) {
      player.setMovementState('idle');
    }

    if ((player.keys.right && worldCollision.right > this.moveSpeed) ||
        (player.keys.left && worldCollision.left > this.moveSpeed)) {
      player.setMovementState(player.movementState === 'idle' ? 'walking' : 'crawling');
      this.tickWalk(player);
      return;
    }

    // 3. environmental reactions
    player.vX = 0;
    player.vY = 0;

    // 4. determine if current or future collision

    if (worldCollision.left < 0) player.x -= worldCollision.left;
    if (worldCollision.right < 0) player.x += worldCollision.right;
    if (worldCollision.up < 0 && player.movementState === 'idle') player.setMovementState('crouching');

    this.checkIfFall(player, worldCollision);

    // 5. adjust player location
    player.x = player.x;
    player.y = player.y;
  }

  // if player is WALKING or CRAWLING
  public tickWalk(player: PlayerSprite) {
    // 1. Get collider
    let worldCollision = this.world.checkWorld(player.getCollider());

    // 2. determine player actions
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
    } else if (!player.keys.down && player.movementState === 'crawling' && this.world.checkWorld(player.getTopCollider()).up >= 0) {
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

    // 3. environmental reactions
    player.vX *= this.friction;
    player.vX = _.clamp(player.vX, -this.maxSpeed, this.maxSpeed);
    player.vY = 0;

    if (Math.abs(player.vX) < this.minSpeed) {
      player.vX = 0;
      player.setMovementState(player.movementState === 'walking' ? 'idle' : 'crouching');
      return;
    }
    
    // 4. determine if current or future collision
    if (worldCollision.left < 0) {
      player.x -= worldCollision.left;

      if (worldCollision.leftBlock && (worldCollision.leftBlock.type === 'spring' || worldCollision.leftBlock.type === 'exploding')) {
          if (worldCollision.leftBlock.type === 'exploding') this.world.getObject(worldCollision.leftBlock).explode();
          player.vX = -this.springSpeed;
          player.bounceTime = this.bounceTime;
      } else {
        let topCollision = this.world.checkWorld(player.getTopCollider());
        if (topCollision.left > 0 && player.vX <= 0) {
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

    if (worldCollision.right < 0) {
      player.x += worldCollision.right;

      if (worldCollision.rightBlock && (worldCollision.rightBlock.type === 'spring' || worldCollision.rightBlock.type === 'exploding')) {
        if (worldCollision.rightBlock.type === 'exploding') this.world.getObject(worldCollision.rightBlock).explode();
        player.vX = this.springSpeed;
        player.bounceTime = this.bounceTime;
      } else {
        let topCollision = this.world.checkWorld(player.getTopCollider());
        if (topCollision.right > 0 && player.vX >= 0) {
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
    
    this.checkIfFall(player, worldCollision);

    // 5. adjust player location
    player.x += player.vX;
  }

  // if player is ASCENDING, FALLING or DIVING
  public tickAirborn(player: PlayerSprite) {
    // 1. Get collider
    let worldCollision = this.world.checkWorld(player.getCollider());
    let topCollision = this.world.checkWorld(player.getTopCollider());

    // 2. determine player actions
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

    // 3. environmental reactions
    player.vX *= this.airFriction;
    player.vY += this.gravity;
    player.vY = _.clamp(player.vY, -this.terminalVelocity, this.terminalVelocity);
    player.vX = _.clamp(player.vX, -this.maxSpeed, this.maxSpeed);
    
    // 4. determine if current or future collision

    if (worldCollision.down <= 0 && (player.movementState === 'falling' || player.movementState === 'diving')) {
      if (worldCollision.downBlock) {
        player.y += worldCollision.down;
        player.vY = 0;
  
        player.setMovementState('crawling');
        player.doubleJumpsRemaining = this.maxDoubleJumps;
        player.wallGrabsRemaining = this.maxWallGrabs;
        player.landTime = this.landTimeBase + Math.abs(player.vY) * this.landTimeVMult;
        return;
      } else {
        if (worldCollision.down < -player.height) {
          this.respawn(player);
          return;
        }
      }
    }

    if (worldCollision.left < 0) {
      player.x -= worldCollision.left;
      if (worldCollision.leftBlock && (worldCollision.leftBlock.type === 'spring' || worldCollision.leftBlock.type === 'exploding')) {
        if (worldCollision.leftBlock.type === 'exploding') this.world.getObject(worldCollision.leftBlock).explode();
        player.vX = -this.springSpeed;
        return;
      }
      if (topCollision.left > 0 && player.vX <= 0) {
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

    if (worldCollision.right < 0) {
      player.x += worldCollision.right;
      if (worldCollision.rightBlock && (worldCollision.rightBlock.type === 'spring' || worldCollision.rightBlock.type === 'exploding')) {
        if (worldCollision.rightBlock.type === 'exploding') this.world.getObject(worldCollision.rightBlock).explode();
        player.vX = this.springSpeed;
        return;
      }
      if (topCollision.right > 0 && player.vX >= 0) {
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

    if (worldCollision.up < 0) {
      if (player.movementState === 'ascending') {
        player.y -= worldCollision.up;
        player.setMovementState('falling');
        if (worldCollision.upBlock && (worldCollision.upBlock.type === 'spring' || worldCollision.upBlock.type === 'exploding')) {
          if (worldCollision.upBlock.type === 'exploding') this.world.getObject(worldCollision.upBlock).explode();
          player.vY = -this.springSpeed;
          return;
        } else {
          player.vY = 0;
          return;
        }
      }
    }

    if (player.movementState === 'ascending' && player.vY > 0) {
      player.setMovementState('falling');
    }

    // 5. adjust player location
    player.x += player.vX;
    player.y += player.vY;
  }

  public tickGrab(player: PlayerSprite) {
    // 1. Get collider
    let worldCollision = this.world.checkWorld(player.getCollider());

    player.grabTime--;

    if (player.grabTime <= 0) {
      player.setMovementState('falling');
    }

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

    if (player.movementState === 'wall-grab-left' && worldCollision.left > 0) {
      player.setMovementState('falling');
      return;
    }
    if (player.movementState === 'wall-grab-right' && worldCollision.right > 0) {
      player.setMovementState('falling');
      return;
    }
    if (worldCollision.down < 0) {
      player.y += worldCollision.down;
      player.setMovementState('idle');
      return;
    }

    this.player.y += this.grabSlideSpeed;
  }

  public tickClimbing(player: PlayerSprite) { 
    // 1. Get collider
    let worldCollision = this.world.checkWorld(player.getCollider());

    if (player.movementState === 'climbing-left' && worldCollision.left > 0) {
      player.setMovementState('crouching');
      if (worldCollision.down < 0) {
        player.y += worldCollision.down;
      }
      return;
    }
    if (player.movementState === 'climbing-right' && worldCollision.right > 0) {
      player.setMovementState('crouching');
      if (worldCollision.down < 0) {
        player.y += worldCollision.down;
      }
      return;
    }

    if (worldCollision.up < 0) {
      player.y += worldCollision.up;
      player.setMovementState('falling');
      return;
    }

    player.y-= this.climbSpeed;
  }

  public tickRolling(player: PlayerSprite) {
    // 1. Get collider
    let worldCollision = this.world.checkWorld(player.getCollider());
    
    player.rollTime--;
    if (player.rollTime <= 0) {
      player.bounceTime = this.rollAfterTime;
      player.setMovementState('crawling');
      return;
    }

    player.x += player.vX;
    if (worldCollision.left < 0) {
      player.x -= worldCollision.left;
      if (player.vX < 0) {
        if (worldCollision.leftBlock && (worldCollision.leftBlock.type === 'spring' || worldCollision.leftBlock.type === 'exploding')) {
          if (worldCollision.leftBlock.type === 'exploding') this.world.getObject(worldCollision.leftBlock).explode();
          player.vX = -this.springSpeed;
        } else {
          player.vX = this.bounce * player.vX;
          player.bounceTime = this.bounceTime;
        }
      }
    }
    
    if (worldCollision.right < 0) {
      player.x += worldCollision.right;
      if (player.vX > 0) {
        if (worldCollision.rightBlock && (worldCollision.rightBlock.type === 'spring' || worldCollision.rightBlock.type === 'exploding')) {
          if (worldCollision.rightBlock.type === 'exploding') this.world.getObject(worldCollision.rightBlock).explode();
          player.vX = this.springSpeed;
        } else {
          player.vX = this.bounce * player.vX;
          player.bounceTime = this.bounceTime;
        }
      }
    }
    
    this.checkIfFall(player, worldCollision);
  }

  public tickJetpacking(player: PlayerSprite) {
    // 1. Get collider
    let worldCollision = this.world.checkWorld(player.getCollider());

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

    player.vX *= this.airFriction;
    player.vY += this.jetpackSpeed;
    player.vY = Math.min(player.vY, this.terminalVelocity);
    player.vY = Math.max(player.vY, this.jetpackMaxSpeed);

    player.x += player.vX;
    player.y += player.vY;

    if (worldCollision.down <= 0 && player.vY >= 0) {
      player.y += worldCollision.down - player.vY;
      player.vY = this.bounce * player.vY;
      player.bounceTime = this.bounceTime;
    }

    if (worldCollision.left < 0 && player.vX <= 0) {
      if (worldCollision.leftBlock && (worldCollision.leftBlock.type === 'spring' || worldCollision.leftBlock.type === 'exploding')) {
        if (worldCollision.leftBlock.type === 'exploding') this.world.getObject(worldCollision.leftBlock).explode();
        player.vX = -this.springSpeed;
      } else {
        player.x -= worldCollision.left;
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }

    if (worldCollision.right < 0 && player.vX >= 0) {
      if (worldCollision.rightBlock && (worldCollision.rightBlock.type === 'spring' || worldCollision.rightBlock.type === 'exploding')) {
      if (worldCollision.rightBlock.type === 'exploding') this.world.getObject(worldCollision.rightBlock).explode();
        player.vX = this.springSpeed;
      } else {  
        player.x += worldCollision.right;
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }

    if (worldCollision.up < 0 && player.vY <= 0) {
      if (worldCollision.upBlock && (worldCollision.upBlock.type === 'spring' || worldCollision.upBlock.type === 'exploding')) {
        if (worldCollision.upBlock.type === 'exploding') this.world.getObject(worldCollision.upBlock).explode();
        player.y -= worldCollision.up + player.vY;
        player.vY = -this.springSpeed;
      } else {
        player.y -= worldCollision.up + player.vY;
        player.vY = this.bounce * player.vY;
        player.bounceTime = this.bounceTime;
      }
    }
  }

  public checkIfFall(player: PlayerSprite, worldCollision: WorldResponse) {
    if (worldCollision.down > 0) {
      player.setMovementState('falling');
    } else {
      if (worldCollision.down === 0 && worldCollision.downBlock) {
        if (worldCollision.downBlock.type === 'switch') {          
          this.world.getObject(worldCollision.downBlock).shrinkAway(() => {
            GameEvents.SWITCH_ACTIVATED.publish(worldCollision.downBlock);
          });
        } else if (worldCollision.downBlock && (worldCollision.downBlock.type === 'spring' || worldCollision.downBlock.type === 'exploding')) {
          if (worldCollision.downBlock.type === 'exploding') this.world.getObject(worldCollision.downBlock).explode();
          player.vY = this.springSpeed;
          player.bounceTime = this.bounceTime;
          player.setMovementState('ascending');
        } else if (worldCollision.downBlock.type === 'goal') {
          GameEvents.LEVEL_COMPLETE.publish();
        }
      }
    }
  }

  public startJump(player: PlayerSprite, doublejump?: boolean) {
    if (player.keys.holdUp) return false;

    player.setMovementState('ascending');
    player.vY = Math.max(this.jumpSpeed, player.vY + this.jumpSpeed);
    player.keys.holdUp = true;

    return true;
  }
}
