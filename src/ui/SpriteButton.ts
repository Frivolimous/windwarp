import * as PIXI from 'pixi.js';
import _ from 'lodash';
import { Fonts } from '../data/Fonts';
import { JMTween } from '../JMGE/JMTween';
import { colorLuminance } from '../JMGE/others/Colors';

const defaultConfig: Partial<ISpriteButton> = { width: 200, height: 50, rounding: 8, color: 0x77ccff, hoverScale: 0.1, spriteScale: 0.8 };

const defaultLabelStyle: Partial<PIXI.TextStyle> = { fill: 0, fontFamily: Fonts.UI };

export interface ISpriteButton {
  texture: PIXI.Texture;
  color?: number;
  width?: number;
  height?: number;
  rounding?: number;
  onClick: () => void;
  hoverScale?: number;
  spriteScale?: number;
}

export class SpriteButton extends PIXI.Container {
  protected background: PIXI.Graphics;

  private sprite: PIXI.Sprite;
  private inner: PIXI.Container;
  private color: number;

  private defaultColor: number;
  private disabledColor = 0x999999;
  private selectedColor = 0xddcc33;

  private _Disabled: boolean;
  private _Selected: boolean;

  private _Highlight: PIXI.Graphics;
  private _HighlightTween: JMTween;

  constructor(protected config: ISpriteButton) {
    super();
    this.config = config = _.defaults(config, defaultConfig);
    this.color = config.color;
    this.defaultColor = config.color;

    this.hitArea = new PIXI.Rectangle(0, 0, config.width, config.height);

    this.inner = new PIXI.Container();
    this.inner.pivot.set(config.width / 2, config.height / 2);
    this.inner.position.set(config.width / 2, config.height / 2);
    this.addChild(this.inner);
    this.background = new PIXI.Graphics();
    this.background.roundRect(0, 0, config.width, config.height, config.rounding).fill(0xffffff).stroke({width: 2, color: 0});
    this.background.tint = config.color;

    this.inner.addChild(this.background);
    this.sprite = new PIXI.Sprite(config.texture);
    this.inner.addChild(this.sprite);
    this.sprite.width = this.width * config.spriteScale;
    this.sprite.scale.y = this.sprite.scale.x;
    this.sprite.position.set((-this.sprite.width + config.width) / 2, (-this.sprite.height + config.height) / 2)

    this.eventMode = 'static';
    this.cursor = 'pointer';

    this.addListener('mouseover', () => {
      if (this._Disabled) return;
      this.background.tint = colorLuminance(this.color, 0.8);
      // this.inner.scale.set(1 + this.config.hoverScale);
    });
    this.addListener('mouseout', () => {
      if (this._Disabled) return;
      this.background.tint = this.color;
      // this.inner.scale.set(1);
    });
    this.addListener('mouseup', (e) => {
      if (this._Disabled) return;
      this.background.tint = colorLuminance(this.color, 0.8);
      this.inner.scale.set(1);
      if (e.target === this) {
        config.onClick();
      }
    });

    this.addListener('touchend', (e) => {
      if (this._Disabled) return;
      this.background.tint = this.color;
      this.inner.scale.set(1);
      if (e.target === this) {
        config.onClick();
      }
    });

    this.addListener('pointerdown', () => {
      if (this._Disabled) return;
      this.background.tint = colorLuminance(this.color, 0.8);
      this.inner.scale.set(1 - this.config.hoverScale);
      // SoundData.playSound(SoundIndex.CLICK);
    });
  }

  public set disabled(b: boolean) {
    this._Disabled = b;
    this.cursor = b ? 'auto' : 'pointer';
    if (b) {
      this.color = this.disabledColor;
    } else {
      this.color = this.defaultColor;
    }
    this.background.tint = this.color;
  }

  public get disabled() {
    return this._Disabled;
  }

  public set selected(b: boolean) {
    this._Selected = b;
    // this.interactive = !b;
    if (b) {
      this.color = this.selectedColor;
    } else {
      this.color = this.defaultColor;
    }
    this.background.tint = this.color;
  }

  public get selected(): boolean {
    return this._Selected;
  }

  public startCustomDraw(clear: boolean = true) {
    if (clear) {
      this.background.clear();
    }
    this.background.beginFill(0xffffff);
    return this.background;
  }

  public setColor(color: number) {
    this.color = color;
    this.background.tint = color;
  }

  public addTexture(s?: PIXI.Texture) {
    if (s) {
      this.sprite.texture = s;
    }
  }

  public getWidth(withScale = true) {
    return this.config.width * (withScale ? this.scale.x : 1);
  }

  public getHeight(withScale = true) {
    return this.config.height * (withScale ? this.scale.y : 1);
  }

  public highlight(b: boolean, repeat: number = Infinity) {
    if (b) {
      if (this._Highlight) return;
      this._Highlight = new PIXI.Graphics();
      this._Highlight.roundRect(0, 0, this.getWidth(), this.getHeight(), this.config.rounding).stroke({width: 3, color: 0xffff00});
      this._HighlightTween = new JMTween(this._Highlight, 500).to({alpha: 0}).yoyo(true, repeat).start().onComplete(() => this.highlight(false));
      this.inner.addChild(this._Highlight);
    } else {
      if (this._HighlightTween) {
        this._HighlightTween.stop();
        this._HighlightTween = null;
      }
      if (this._Highlight) {
        this._Highlight.destroy();
        this._Highlight = null;
      }
    }
  }
}
