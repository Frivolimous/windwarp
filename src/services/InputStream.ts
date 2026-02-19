import { PlayerKeys, PlayerSprite } from "../engine/Objects/PlayerSprite";
import _, { forEach } from 'lodash';

export class InputStream {
  recordingStep = 0;
  replayingStep = 0;
  previousState: Record<PlayerKeys, boolean>;

  replayIndex = 0;

  keys: PlayerKeys[] = ['down','up','left','right','jetpack','dash'];

  constructor(public data: InputStreamData) {
  }

  resetPlayback() {
    this.replayIndex = 0;
    this.recordingStep = 0;
    this.replayingStep = 0;
    this.previousState = null;
  }

recordStep(player: PlayerSprite) {
  this.recordingStep++;

  if (!this.previousState) {
    this.previousState = { ...player.keys };

    for (let key of this.keys) {
      this.data.record.push({time: this.recordingStep, key, state: this.previousState[key]});
    }
  } else {
    for (let key of this.keys) {
      const current = player.keys[key];
      const previous = this.previousState[key];
  
      if (current !== previous) {
        this.data.record.push({
          time: this.recordingStep,
          key,
          state: current
        });
  
        this.previousState[key] = current;
      }
    }
  }

}

  playStep(player: PlayerSprite) {
    this.replayingStep++;

    while (this.replayIndex < this.data.record.length && this.data.record[this.replayIndex].time <= this.replayingStep) {
      player.keys[this.data.record[this.replayIndex].key] = this.data.record[this.replayIndex].state;
      this.replayIndex++;
    }
  }

  clone(): InputStream {
    let stream = new InputStream(_.cloneDeep(this.data));
    return stream;
  }
}

interface ChangeRecord {
  time: number;
  key: PlayerKeys;
  state: boolean;
};

export interface InputStreamData {
  mapId: number;
  time: number;
  record: ChangeRecord[];
};