import * as PIXI from 'pixi.js';
import _ from 'lodash';
import { Fonts } from '../data/Fonts';
import { JMTween } from '../JMGE/JMTween';
import { colorLuminance } from '../JMGE/others/Colors';

const defaultConfig: Partial<IButton> = { width: 200, height: 50, rounding: 8, color: 0x77ccff, hoverScale: 0.1 };

const defaultLabelStyle: Partial<PIXI.TextStyle> = { fill: 0, fontFamily: Fonts.UI };

export interface IButton {
  color?: number;
  width?: number;
  height?: number;
  rounding?: number;
  buttonLabel?: string;
  labelStyle?: any;
  onClick: () => void;
  hoverScale?: number;
}

export class Button extends PIXI.Container {
  protected background: PIXI.Graphics;

  private buttonLabel: PIXI.Text;
  private inner: PIXI.Container;
  private color: number;

  private defaultColor: number;
  private disabledColor = 0x999999;
  private selectedColor = 0xddcc33;

  private _Disabled: boolean;
  private _Selected: boolean;

  private _Highlight: PIXI.Graphics;
  private _HighlightTween: JMTween;

  constructor(protected config: IButton) {
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
    let style = _.defaults(config.labelStyle, defaultLabelStyle);

    this.inner.addChild(this.background);
    this.buttonLabel = new PIXI.Text({text: config.buttonLabel, style, textureStyle: { scaleMode: 'nearest' }});
    this.addLabel();
    this.inner.addChild(this.buttonLabel);

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

  public addLabel(s?: string) {
    if (s) {
      this.buttonLabel.text = s;
    }
    this.buttonLabel.scale.set(1, 1);

    if (this.buttonLabel.width > this.background.width * 0.9) {
      this.buttonLabel.width = this.background.width * 0.9;
    }
    this.buttonLabel.scale.y = this.buttonLabel.scale.x;
    this.buttonLabel.x = (this.background.width - this.buttonLabel.width) / 2;
    this.buttonLabel.y = (this.background.height - this.buttonLabel.height) / 2;
  }

  public getLabel() { return this.buttonLabel.text; }

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
