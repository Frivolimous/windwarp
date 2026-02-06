import _ from "lodash";

export class KeyboardControl {
  private hotkeys: IHotkey[] = [];

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
}

export interface IHotkey {
  keys: string[];
  onDown: Function;
  onUp?: Function;
}