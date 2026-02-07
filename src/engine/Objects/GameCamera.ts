import { GameCanvas } from "./GameCanvas";
import { PlayerSprite } from "./PlayerSprite";

export class GameCamera {
  x: number;
  y: number;
  playerX = 0.5;
  playerY = 0.6;

  constructor(private canvas: GameCanvas, public viewWidth: number, public viewHeight: number) {

  }

  update(player: PlayerSprite) {
    this.x = player.x - this.viewWidth * this.playerX;
    this.y = player.y - this.viewHeight * this.playerY;
    if (this.x < 0) {
      this.x = 0;
    }
    if (this.y < 0) {
      this.y = 0;
    }
    if (this.x > this.canvas.boundWidth - this.viewWidth) {
      this.x = this.canvas.boundWidth - this.viewWidth;
    }
    if (this.y > this.canvas.boundHeight - this.viewHeight) {
      this.y = this.canvas.boundHeight - this.viewHeight;
    }
    this.canvas.movingLayer.x = -this.x;
    this.canvas.movingLayer.y = -this.y;
  }
}