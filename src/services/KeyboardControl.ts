import _ from "lodash";

export class KeyboardControl {
  private hotkeys: IHotkey[] = [];

  private oneTimeCallback: () => void;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  public destroy() {

  }

  public addKey(hotkey: IHotkey) {
    this.hotkeys.push(hotkey);
  }

  public removeKey(hotkey: IHotkey) {
    _.pull(this.hotkeys, hotkey);
  }

  public onKeyDown = (e: KeyboardEvent) => {
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

    if (e.key === ' ') e.preventDefault();
  }

  public onKeyUp = (e: KeyboardEvent) => {
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