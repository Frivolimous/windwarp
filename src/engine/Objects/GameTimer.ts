import * as PIXI from 'pixi.js';

export class GameTimer extends PIXI.Container {
  private time = 0;
  private recording = true;
  private text: PIXI.Text;

  constructor() {
    super();
    this.text = new PIXI.Text({text:'0.00', style:{fontSize: 32, fill: 0xffffff}});
    this.addChild(this.text);
  }

  public update(delta: number) {
    if (!this.recording) return;
    this.time += delta;
    this.text.text = (this.time / 1000).toFixed(2);
  }

  public reset() {
    this.time = 0;
    this.text.text = '0.00';
  }

  public getTime() {
    return this.time;
  }

  public pause() {
    this.recording = false;
  }

  public start() {
    this.recording = true;
  }
}