import * as PIXI from 'pixi.js';

export abstract class BaseUI extends PIXI.Container {
  navIn: () => void;
  navOut: () => void;
}
