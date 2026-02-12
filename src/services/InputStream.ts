import { PlayerKeys, PlayerSprite } from "../engine/Objects/PlayerSprite";
import _, { forEach } from 'lodash';

export class InputStream {
  recordingStep = 0;
  replayingStep = 0;
  changeRecord: ChangeRecord[] = [];
  previousState: Record<PlayerKeys, boolean>;

  replayIndex = 0;

  keys: PlayerKeys[] = ['down','up','left','right','jetpack','dash'];

  constructor(public mapId: number) {
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
      this.changeRecord.push({time: this.recordingStep, key, state: this.previousState[key]});
    }
  } else {
    for (let key of this.keys) {
      const current = player.keys[key];
      const previous = this.previousState[key];
  
      if (current !== previous) {
        this.changeRecord.push({
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

    while (this.replayIndex < this.changeRecord.length && this.changeRecord[this.replayIndex].time <= this.replayingStep) {
      player.keys[this.changeRecord[this.replayIndex].key] = this.changeRecord[this.replayIndex].state;
      this.replayIndex++;
    }
  }

  clone(): InputStream {
    let stream = new InputStream(this.mapId);
    stream.changeRecord = _.cloneDeep(this.changeRecord);
    return stream;
  }
}

interface ChangeRecord {
  time: number;
  key: PlayerKeys;
  state: boolean;
}