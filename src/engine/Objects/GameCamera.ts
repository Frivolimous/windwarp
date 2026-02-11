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

  viewWidth: number;
  viewHeight: number;

  constructor(private canvas: GameCanvas) {
    this.viewWidth = canvas.boundWidth;
    this.viewHeight = canvas.boundHeight;
  }

  update(player: PlayerSprite, instant = false) {
    this.canvas.scale.set(1);

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
    this.canvas.parallaxBackground();
  }

  updateTwo(player: PlayerSprite, player2: PlayerSprite) {
    let aX = (player.x + player2.x) / 2;
    let aY = (player.y + player2.y) / 2;

    let dX = Math.abs(player.x - player2.x);
    let dY = Math.abs(player.y - player2.y);

    let pX = this.viewWidth / dX;
    let pY = this.viewHeight / dY;

    let p = Math.min(pX, pY)*0.8;

    this.canvas.scale.set(Math.min(1, p));

    this.x = aX - this.viewWidth * 0.5 / this.canvas.scale.x;
    this.y = aY - this.viewHeight * 0.5 / this.canvas.scale.y;

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
    this.canvas.parallaxBackground();
  }
}