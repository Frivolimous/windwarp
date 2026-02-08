import { GameCanvas } from "./GameCanvas";
import { PlayerSprite } from "./PlayerSprite";

export class GameCamera {
  x = 0;
  y = 0;
  playerX = 0.5;
  playerY = 0.6;
  cameraSpeed = 0.2;
  dX = 0;
  dY = 0;

  constructor(private canvas: GameCanvas, public viewWidth: number, public viewHeight: number) {

  }

  update(player: PlayerSprite, instant = false) {
    this.dX = player.x - this.viewWidth * this.playerX;
    this.dY = player.y - this.viewHeight * this.playerY;
    if (instant) {
      this.x = this.dX;
      this.y = this.dY;
    } else {
      this.x = this.x + (this.dX - this.x) * this.cameraSpeed;
      this.y = this.y + (this.dY - this.y) * this.cameraSpeed;
    }
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