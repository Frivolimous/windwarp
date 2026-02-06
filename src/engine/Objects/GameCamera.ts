import { GameCanvas } from "./GameCanvas";
import { PlayerSprite } from "./PlayerSprite";

export class GameCamera {
  x: number;
  y: number;
  playerX = 0.5;
  playerY = 0.6;

  constructor(private canvas: GameCanvas, private viewWidth: number, private viewHeight: number) {

  }

  update(player: PlayerSprite) {
    this.x = player.x - this.viewWidth * this.playerX / this.canvas.scale.x;
    this.y = player.y - this.viewHeight * this.playerY / this.canvas.scale.y;
    if (this.x < 0) {
      this.x = 0;
    }
    if (this.y < 0) {
      this.y = 0;
    }
    if (this.x > this.canvas.boundWidth - this.viewWidth / this.canvas.scale.x) {
      this.x = this.canvas.boundWidth - this.viewWidth / this.canvas.scale.x;
    }
    if (this.y > this.canvas.boundHeight - this.viewHeight / this.canvas.scale.y) {
      this.y = this.canvas.boundHeight - this.viewHeight / this.canvas.scale.y;
    }
    this.canvas.x = -this.x * this.canvas.scale.x;
    this.canvas.y = -this.y * this.canvas.scale.y;
  }
}