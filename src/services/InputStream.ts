import { PlayerKeys, PlayerSprite } from "../engine/Objects/PlayerSprite";
import _, { forEach } from 'lodash';

export class InputStream {
  currentStep = 0;
  state: 'recording' | 'playback' = 'recording';
  changeRecord: ChangeRecord[] = [];
  previousState: Record<PlayerKeys, boolean>;

  replayIndex = 0;

  constructor(public mapId: number) {

  }

  recordStep(player: PlayerSprite) {
    if (this.state !== 'recording') return;

    this.currentStep++;

    if (!this.previousState) {
      for (let key in player.keys) {
        this.changeRecord.push({time: this.currentStep, key: key as PlayerKeys, state:player.keys[key]});
      }
      this.previousState = _.clone(player.keys);
    } else {
      for (let key in player.keys) {
        let changeMade = false;
        if (player.keys[key] !== this.previousState[key]) {
          this.changeRecord.push({time: this.currentStep, key: key as PlayerKeys, state: player.keys[key]});
          changeMade = true;
        }
        if (changeMade) {
          this.previousState = _.clone(player.keys);
        }
      }
    }
  }

  resetPlayback() {
    this.replayIndex = 0;
    this.currentStep = 0;
  }

  playStep(player: PlayerSprite) {
    if (this.state !== 'playback') return;

    this.currentStep++;

    while (this.changeRecord[this.replayIndex].time === this.currentStep) {
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