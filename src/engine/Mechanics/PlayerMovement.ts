import { GameEvents } from "../../services/GameEvents";
import { GameEnvironment, WorldResponse } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";

export class PlayerMovement {
  private moveSpeed = 2;
  private crouchSpeedMult = 0.5;
  private airMoveSpeed = 1;
  private maxSpeed = 15;
  private minSpeed = 0.5;
  private jumpSpeed = -15;
  private gravity = 0.9;
  private terminalVelocity = 30;
  private kickVX = 10;
  private climbSpeed = 2;
  private minGrabSpeed = 5;
  private divingSpeed = 20;
  private grabSlideSpeed = 1;


  private friction = 0.8;
  private airFriction = 0.9;
  private bounce = -0.5;
  private bounceTime = 5;
  private grabTime = 50;

  private rollSpeedMult = 1.5;
  private maxRollSpeed = 15;
  private rollSpeedNeeded = 5;
  private rollTime = 20;
  private rollAfterTime = 5;
  private landTimeBase = 10;
  private landTimeVMult = 1;

  private maxDoubleJumps = Infinity;
  // private maxDoubleJumps = 1;
  private maxWallGrabs = Infinity;

  private player: PlayerSprite;
  constructor(private world: GameEnvironment) {

  }

  public setPlayer(player: PlayerSprite) {
    this.player = player;
    this.player.maxRollTime = this.rollTime;
  }

  public playerTick = (player: PlayerSprite) => {
    if (!player) return;

    let worldCollision = this.world.checkWorld(player.getCollider());

    switch(this.player.groundState) {
      case 'idle': this.tickIdle(player, worldCollision); break;
      case 'walking': this.tickWalk(player, worldCollision); break;
      case 'ascending': case 'falling': case 'diving': this.tickAirborn(player, worldCollision); break;
      case 'wall-grab-left': case 'wall-grab-right': this.tickGrab(player, worldCollision); break;
      case 'climbing-left': case 'climbing-right': this.tickClimbing(player, worldCollision); break;
      case 'rolling': this.tickRolling(player, worldCollision); break;
    }

    if (this.player.keys.holdUp) {
      if (!this.player.keys.up) this.player.keys.holdUp = false;
    }

    GameEvents.ACTIVITY_LOG.publish({slug: 'VELOCITY', text: `${player.vX}, ${player.vY}`});
  }

  public tickIdle(player: PlayerSprite, worldCollision: WorldResponse) {
    if (player.landTime >= 0) {
      player.landTime--;
    }

    if (player.keys.up && player.landTime <= 0) {
      if (this.startJump(player)) {
        this.tickAirborn(player, worldCollision);
        return;
      }
    }

    if (player.keys.down && player.standState !== 'crouching') {
      player.standState = 'crouching';
      GameEvents.ACTIVITY_LOG.publish({slug: 'STAND_STATE', text: 'crouching'})
    } else if (!player.keys.down && player.standState === 'crouching') {
      player.standState = 'standing';
      GameEvents.ACTIVITY_LOG.publish({slug: 'STAND_STATE', text: 'standing'})
    }

    if ((player.keys.right && worldCollision.right > this.moveSpeed * 10) ||
        (player.keys.left && worldCollision.left > this.moveSpeed * 10)) {
      player.setGroundState('walking');
      this.tickWalk(player, worldCollision);
      return;
    }

    this.checkIfFall(player, worldCollision);
  }

  public tickWalk(player: PlayerSprite, worldCollision: WorldResponse) {
    if (player.landTime >= 0) {
      player.landTime--;
    }
    
    if (player.keys.up && player.landTime <= 0) {
      if (this.startJump(player)) return;
    }

    if (player.keys.down && player.standState !== 'crouching') {
      if(Math.abs(player.vX) > this.rollSpeedNeeded) {
        player.setGroundState('rolling');
        player.vX = player.vX > 0 ? Math.min(this.maxRollSpeed, player.vX * this.rollSpeedMult) : Math.max(-this.maxRollSpeed, player.vX * this.rollSpeedMult);
        player.rollTime = this.rollTime;
        this.tickRolling(player, worldCollision);
        return;
      } else {
        player.standState = 'crouching';
        GameEvents.ACTIVITY_LOG.publish({slug: 'STAND_STATE', text: 'crouching'})
      }
    } else if (!player.keys.down && player.standState === 'crouching') {
      player.standState = 'standing';
      GameEvents.ACTIVITY_LOG.publish({slug: 'STAND_STATE', text: 'standing'})
    }

    if (player.bounceTime > 0) {
      player.bounceTime -= 1;
    } else if (player.landTime <= 0) {
      if (player.keys.right) {
        player.vX += this.moveSpeed * (player.standState === 'crouching' ? this.crouchSpeedMult : 1);
        player.vX = Math.min(player.vX, this.maxSpeed);
      }
      if (player.keys.left) {
        player.vX -= this.moveSpeed * (player.standState === 'crouching' ? this.crouchSpeedMult : 1)
        player.vX = Math.max(player.vX, -this.maxSpeed);
      }
    }

    player.vX *= this.friction;
    if (Math.abs(player.vX) < this.minSpeed) {
      player.setGroundState('idle');
      player.vX = 0;
      return;
    }
    
    player.x += player.vX;
    if (worldCollision.left < 0) {
      let topCollision = this.world.checkWorld(player.getTopCollider());
      if (topCollision.left > 0 && player.vX <= 0) {
        player.vX = 0;
        player.vY = 0;
        player.setGroundState('climbing-left');
      } else if (player.vX < 0) {
        player.x -= worldCollision.left;
        if (player.vX < -this.maxSpeed / 2) {
          player.vX = this.bounce * player.vX;
          player.bounceTime = this.bounceTime;
        } else {
          player.setGroundState('idle');
          player.vX = 0;
        }
      }
    }

    if (worldCollision.right < 0) {
      let topCollision = this.world.checkWorld(player.getTopCollider());
      if (topCollision.right > 0 && player.vX >= 0) {
        player.vX = 0;
        player.vY = 0;
        player.setGroundState('climbing-right');
      } else if (player.vX > 0) {
        player.x += worldCollision.right;
        if (player.vX > this.maxSpeed / 2) {
          player.vX = this.bounce * player.vX;
          player.bounceTime = this.bounceTime;
        } else {
          player.setGroundState('idle');
          player.vX = 0;
        }
      }
    }
    
    this.checkIfFall(player, worldCollision);
  }

  public tickAirborn(player: PlayerSprite, worldCollision: WorldResponse) {
    if (player.keys.up) {
      if (!player.keys.holdUp) {
        if (player.doubleJumpsRemaining > 0) {
          player.doubleJumpsRemaining -= 1;
          this.startJump(player, true);
        } else {
          if (player.groundState === 'ascending') {
            player.keys.holdUp = true;
          }
        }
      }
    }

    if (player.keys.down && player.groundState !== 'diving') {
      player.setGroundState('diving');
      player.vY = Math.max(this.divingSpeed, player.vY);
    }

    if (player.bounceTime > 0) {
      player.bounceTime -= 1;
    } else {
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
    player.vY += this.gravity;
    player.vY = Math.min(player.vY, this.terminalVelocity);

    player.x += player.vX;
    player.y += player.vY;

    if (player.standState === 'crouching') {
      player.standState = 'standing';
      GameEvents.ACTIVITY_LOG.publish({slug: 'STAND_STATE', text: 'standing'})
    }

    if (worldCollision.left < 0) {
      let topCollision = this.world.checkWorld(player.getTopCollider());
      if (topCollision.left > 0 && player.vX <= 0) {
        player.vX = 0;
        player.vY = 0;
        player.setGroundState('climbing-left');
      } else if (player.wallGrabsRemaining > 0 && player.keys.left && player.vX < -this.minGrabSpeed) {
        player.x -= worldCollision.left;
        player.vX = 0;
        player.vY = 0;
        player.setGroundState('wall-grab-left');
        player.wallGrabsRemaining--;
        player.grabTime = this.grabTime;
      } else if (player.vX < 0) {
        player.x -= worldCollision.left;
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }

    if (worldCollision.right < 0) {
      let topCollision = this.world.checkWorld(player.getTopCollider());
      if (topCollision.right > 0 && player.vX >= 0) {
        player.vX = 0;
        player.vY = 0;
        player.setGroundState('climbing-right');
      } else if (player.wallGrabsRemaining > 0 && player.keys.right && player.vX > this.minGrabSpeed) {
        player.x += worldCollision.right;
        player.vX = 0;
        player.vY = 0;
        player.setGroundState('wall-grab-right');
        player.wallGrabsRemaining--;
        player.grabTime = this.grabTime;
      } else if (player.vX > 0) {
        player.x += worldCollision.right;
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }

    if (worldCollision.up < 0) {
      if (player.groundState === 'ascending') {
        player.setGroundState('falling');
        player.vY = 0;
        player.y -= worldCollision.up;
      }
    }

    if (player.groundState === 'ascending' && player.vY > 0) {
      player.setGroundState('falling');
    }

    if (worldCollision.down <= 0 && (player.groundState === 'falling' || player.groundState === 'diving')) {
      player.y += worldCollision.down - player.vY;
      player.vY = 0;
      if (player.groundState === 'diving') {
        player.standState = 'crouching';
        GameEvents.ACTIVITY_LOG.publish({slug: 'STAND_STATE', text: 'crouching'});
      }

      player.setGroundState('walking');
      player.doubleJumpsRemaining = this.maxDoubleJumps;
      player.wallGrabsRemaining = this.maxWallGrabs;
      player.landTime = this.landTimeBase + Math.abs(player.vY) * this.landTimeVMult;
      
      return;
    }
  }

  public tickGrab(player: PlayerSprite, worldCollision: WorldResponse) {
    player.grabTime--;

    if (player.grabTime <= 0) {
      player.setGroundState('falling');
    }

    if (player.keys.up) {
      let c = player.groundState === 'wall-grab-left' ? 1 : -1;
      if (this.startJump(player)) {
        player.vX = this.kickVX * c;
        player.bounceTime = this.bounceTime * 2;
        this.tickAirborn(player, worldCollision);
        return;
      }
    } else if (player.keys.down || (player.keys.right && player.groundState === 'wall-grab-left') || (player.keys.left && player.groundState === 'wall-grab-right')) {
      player.setGroundState('falling');
      return;
    }

    if (player.groundState === 'wall-grab-left' && worldCollision.left > 0) {
      player.setGroundState('falling');
      return;
    }
    if (player.groundState === 'wall-grab-right' && worldCollision.right > 0) {
      player.setGroundState('falling');
      return;
    }
    if (worldCollision.down < 0) {
      player.y += worldCollision.down;
      player.setGroundState('idle');
      return;
    }

    this.player.y += this.grabSlideSpeed;

    // // this.player.grabTime -= 1;
    // let grabSide; 
    // if (player.keys.up) {
    //   if (this.startJump(player)) {
    //     this.tickAirborn(player, worldCollision);
    //   }
    // }
  }

  public tickClimbing(player: PlayerSprite, worldCollision: WorldResponse) {
    this.player.standState = 'crouching';
    
    if (player.groundState === 'climbing-left' && worldCollision.left > 0) {
      player.setGroundState('idle');
      if (worldCollision.down < 0) {
        player.y += worldCollision.down;
      }
      return;
    }
    if (player.groundState === 'climbing-right' && worldCollision.right > 0) {
      player.setGroundState('idle');
      if (worldCollision.down < 0) {
        player.y += worldCollision.down;
      }
      return;
    }

    player.y-= this.climbSpeed;
  }

  public tickRolling(player: PlayerSprite, worldCollision: WorldResponse) {
    player.rollTime--;
    if (player.rollTime <= 0) {
      player.standState = 'crouching';
      player.bounceTime = this.rollAfterTime;
      player.setGroundState('walking');
      return;
    }

    player.x += player.vX;
    if (worldCollision.left < 0) {
      player.x -= worldCollision.left;
      if (player.vX < 0) {
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }

    if (worldCollision.right < 0) {
      if (player.vX > 0) {
        player.vX = this.bounce * player.vX;
        player.bounceTime = this.bounceTime;
      }
    }
    
    this.checkIfFall(player, worldCollision);
  }

  public checkIfFall(player: PlayerSprite, worldCollision: WorldResponse) {
    if (worldCollision.down > 0) {
      player.setGroundState('falling');
    } else {
      if (worldCollision.down === 0 && worldCollision.downBlock) {
        if (worldCollision.downBlock.type === 'switch') {
          let block = this.world.canvas.blocks.find(obj => obj.config === worldCollision.downBlock);
          if (block.destroyed || block.animating) return;
          
          block.shrinkAway(() => {
            GameEvents.SWITCH_ACTIVATED.publish(worldCollision.downBlock);
          });
        } else if (worldCollision.downBlock.type === 'spring') {
          player.vY = this.jumpSpeed * 2;
          player.bounceTime = this.bounceTime;
          player.setGroundState('ascending');
        }
      }
    }
  }

  public startJump(player: PlayerSprite, doublejump?: boolean) {
    if (player.keys.holdUp) return false;

    player.setGroundState('ascending');
    player.vY = Math.max(this.jumpSpeed, player.vY + this.jumpSpeed);
    player.keys.holdUp = true;

    return true;
  }
}
