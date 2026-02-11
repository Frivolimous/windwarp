import _ from "lodash";

export class KeyboardControl {
  public disabled = false;
  private hotkeys: IHotkey[] = [];

  private oneTimeCallback: () => void;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  public clear() {
    this.hotkeys = [];
  }

  public addKey(hotkey: IHotkey) {
    this.hotkeys.push(hotkey);
  }

  public removeKey(hotkey: IHotkey) {
    _.pull(this.hotkeys, hotkey);
  }

  public onKeyDown = (e: KeyboardEvent) => {
    if (this.disabled) return;

    let key = e.key.toLowerCase();
    this.hotkeys.forEach(hotkey => {
      if (hotkey.keys.includes(key) && hotkey.onDown) {
        hotkey.onDown();
      }
    });

    if (this.oneTimeCallback) {
      this.oneTimeCallback();
      this.oneTimeCallback = null;
    }
    e.preventDefault();
    // if (e.key === ' ' || e.key.toLowerCase() === 'arrowdown' || e.key.toLowerCase() === 'arrowup') e.preventDefault();
  }

  public onKeyUp = (e: KeyboardEvent) => {
    if (this.disabled) return;

    let key = e.key.toLowerCase();
    this.hotkeys.forEach(hotkey => {
      if (hotkey.keys.includes(key) && hotkey.onUp) {
        hotkey.onUp();
      }
    });

    // e.preventDefault();
  }

  public onAnyKey(callback: () => void) {
    this.oneTimeCallback = callback;
  }
}

export interface IHotkey {
  keys: string[];
  onDown: Function;
  onUp?: Function;
}