import { GameCanvas } from "./GameCanvas";
import { PlayerSprite } from "./PlayerSprite";

export class GameCamera {
  x = 0;
  y = 0;
  playerX = 0.5;
  playerY = 0.6;
  cameraSpeed = 0.2;

  viewWidth: number;
  viewHeight: number;

  constructor(private canvas: GameCanvas) {
    this.viewWidth = canvas.boundWidth;
    this.viewHeight = canvas.boundHeight;
  }

  update(player: PlayerSprite, instant = false) {
    this.canvas.scale.set(this.canvas.baseScale);

    let dX = player.x - this.viewWidth * this.playerX / this.canvas.scale.x;
    let dY = player.y - this.viewHeight * this.playerY / this.canvas.scale.y;
    if (instant) {
      this.x = dX;
      this.y = dY;
    } else {
      this.x = this.x + (dX - this.x) * this.cameraSpeed;
      this.y = this.y + (dY - this.y) * this.cameraSpeed;
    }
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
    this.canvas.movingLayer.x = -this.x;
    this.canvas.movingLayer.y = -this.y;
    this.canvas.parallaxBackground();
  }

  updateTwo(player: PlayerSprite, player2: PlayerSprite) {
    // set up the scale
    let fX = Math.abs(player.x - player2.x);
    let fY = Math.abs(Math.max(player.y, 0) - Math.max(player2.y, 0));

    let pX = this.viewWidth / fX;
    let pY = this.viewHeight / fY;

    let p = Math.min(pX, pY) * 0.8;
    let dS = Math.min(1, p) * this.canvas.baseScale;

    this.canvas.scale.set(this.canvas.scale.x + (dS - this.canvas.scale.x) * this.cameraSpeed);

    // position the canvas WIDTH
    let aX = (player.x + player2.x) / 2;
    let aY = (player.y + player2.y) / 2;
    let dX = aX - this.viewWidth * this.playerX / this.canvas.scale.x;
    let dY = aY - this.viewHeight * this.playerY / this.canvas.scale.y;
    this.x = this.x + (dX - this.x) * this.cameraSpeed;
    this.y = this.y + (dY - this.y) * this.cameraSpeed;
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
    this.canvas.movingLayer.x = -this.x;
    this.canvas.movingLayer.y = -this.y;
    this.canvas.parallaxBackground();
    // console.log(this.y);
  }
}
