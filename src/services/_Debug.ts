import * as PIXI from 'pixi.js';
import { GameEvents } from './GameEvents';
import { Facade } from '../main';

export const DEBUG_MODE = true;
export const GOD_MODE = true;

export class Debug {
  private static states = {
    groundState: '',
    velocity: '',
  };

  public static initialize(app: PIXI.Application, debugDisplay: HTMLDivElement) {
    if (DEBUG_MODE) {
      GameEvents.ACTIVITY_LOG.addListener(e => {
        // console.log('ACTION:', e.slug, ' : ', e.text || ' ');
        switch (e.slug) {
          case 'PLAYER_STATE' : this.states.groundState = e.text; break;
          case 'VELOCITY' : this.states.velocity = e.text; break;
        }
        debugDisplay.innerHTML = `${this.states.groundState} / ${this.states.velocity}`;
        // console.log(debugDisplay.innerHTML);
      });
      GameEvents.APP_LOG.addListener(e => {
        console.log('APP:', e.type, ' : ', e.text);
      });
      // Facade.saveManager.saveEvent.addListener(e => {
      //   console.log('SAVE:', ':', e.text);
      // })
    }
  }
}
