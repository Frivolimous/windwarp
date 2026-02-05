import { PlayerSprite } from "./PlayerSprite";

export class GameEnvironment {
  floorHeight = 700;
  wallLeft = 0;
  wallRight = 1900;
  constructor() {

  }

  public checkWorld(player: PlayerSprite): WorldResponse {
    let response = {
      up: Infinity,
      down: Infinity,
      left: Infinity,
      right: Infinity,
    }
    response.down = this.floorHeight - player.y + player.boundHeight;
    response.left = player.x - this.wallLeft;
    response.right = this.wallRight - player.x - player.boundWidth;

    return response;
  }
}

export interface WorldResponse {
  down: number;
  up: number;
  left: number;
  right: number;
}