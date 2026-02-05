import { WorldResponse } from "../Objects/GameEnvironment";
import { PlayerSprite } from "../Objects/PlayerSprite";

export class PlayerMovement {
  private moveSpeed = 5;
  private airMoveSpeed = 1;
  private maxSpeed = 30;
  private minSpeed = 1;
  private friction = 0.9;
  private bounce = 0;
  private jumpSpeed = -20;
  private gravity = 0.9;

  private player: PlayerSprite;
  constructor() {

  }

  public setPlayer(player: PlayerSprite) {
    this.player = player;
  }

  public startJump(player: PlayerSprite, doublejump?: boolean) {
    if (player.keys.holdUp) return false;

    player.setGroundState('ascending');
    player.vY = Math.max(this.jumpSpeed, player.vY + this.jumpSpeed);
    player.keys.holdUp = true;

    return true;
  }

  public playerIdle(worldCollision: WorldResponse) {
    if (worldCollision.down > 0) {
      this.player.setGroundState('falling');
      this.playerAirborn(worldCollision);
    } 

    if (this.player.keys.up) {
      if (this.startJump(this.player)) return;
    }
    
    if (this.player.keys.right || this.player.keys.left) {
      this.player.setGroundState('walking');
      this.playerWalk(worldCollision);
    // } else if (this.player.keys.down) {
    //   this.player.setGroundState('crouching');
    }
  }

  public playerWalk(worldCollision: WorldResponse) {
    if (worldCollision.down > 0) {
      this.player.setGroundState('falling');
      this.playerAirborn(worldCollision);
    }

    if (this.player.keys.up) {
      if (this.startJump(this.player)) return;
    }

    if (this.player.keys.right) {
        this.player.vX += this.moveSpeed;
        this.player.vX = Math.min(this.player.vX, this.maxSpeed);
    }
    if (this.player.keys.left) {
        this.player.vX -= this.moveSpeed;
        this.player.vX = Math.max(this.player.vX, -this.maxSpeed);
    }

    this.player.x += this.player.vX;
    this.player.vX *= this.friction;

    if (Math.abs(this.player.vX) < this.minSpeed) {
      this.player.setGroundState('idle');
      this.player.vX = 0;
    }

    if (worldCollision.left < 0) {
      this.player.x -= worldCollision.left;
      if (this.player.vX < 0) this.player.vX = this.bounce * this.player.vX;
    }

    if (worldCollision.right < 0) {
      this.player.x += worldCollision.right;
      if (this.player.vX > 0) this.player.vX = this.bounce * this.player.vX;
    }

  }

  public playerAirborn(worldCollision: WorldResponse) {
    this.player.vY += this.gravity;

    if (this.player.keys.right) {
      this.player.vX += this.airMoveSpeed;
      this.player.vX = Math.min(this.player.vX, this.maxSpeed);
    }
    if (this.player.keys.left) {
      this.player.vX -= this.airMoveSpeed;
      this.player.vX = Math.max(this.player.vX, -this.maxSpeed);
    }

    if (this.player.keys.up) {
      if (!this.player.keys.holdUp) {
        if (this.player.doubleJumpsRemaining > 0) {
          this.player.doubleJumpsRemaining -= 1;
          this.startJump(this.player, true);
        } else {
          if (this.player.groundState === 'ascending') {
            this.player.keys.holdUp = true;
          }
        }
      }
    // else if (this.player.groundState === 'ascending' && this.player.keys.up) {
    //       this.player.keys.holdUp = true;
    //     }
    }

    this.player.x += this.player.vX;
    this.player.y += this.player.vY;

    if (worldCollision.left < 0) {
      this.player.x -= worldCollision.left;
      if (this.player.vX < 0) this.player.vX = this.bounce * this.player.vX;
    }

    if (worldCollision.right < 0) {
      this.player.x += worldCollision.right;
      if (this.player.vX > 0) this.player.vX = this.bounce * this.player.vX;
    }

    if (this.player.groundState === 'ascending' && this.player.vY > 0) {
      this.player.setGroundState('falling');
    }

    if (worldCollision.down <= 0 && this.player.groundState === 'falling') {
      this.player.y += worldCollision.down - this.player.vY;
      this.player.vY = 0;
      this.player.setGroundState('walking');
      this.player.doubleJumpsRemaining = this.player.maxDoubleJumps;
      return;
    }
  }

  public onTick = (worldCollision: WorldResponse) => {
    if (!this.player) return;

    switch (this.player.groundState) {
      case 'idle': this.playerIdle(worldCollision); break;
      case 'walking': this.playerWalk(worldCollision); break;
      case 'ascending': this.playerAirborn(worldCollision); break;
      case 'falling': this.playerAirborn(worldCollision); break;
      // case 'crouching': this.playerWalk(worldCollision); break;
    }

    if (this.player.keys.holdUp) {
      if (!this.player.keys.up) this.player.keys.holdUp = false;
    }
  }
}
