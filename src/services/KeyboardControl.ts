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
    this.hotkeys.forEach(hotkey => {
      if (e.key === hotkey.key && hotkey.onDown) {
        hotkey.onDown();
      }
    });

    if (e.key === ' ') e.preventDefault();
  }

  public onKeyUp = (e: KeyboardEvent) => {
    this.hotkeys.forEach(hotkey => {
      if (e.key === hotkey.key && hotkey.onUp) {
        hotkey.onUp();
      }
    });

    // e.preventDefault();
  }
}

export interface IHotkey {
  key: string;
  onDown: Function;
  onUp?: Function;
}