import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { Participant } from './domain/participant';
import { ParticipantStoreService } from './participant-store.service';

declare var Peer: any;

interface GameSettings {
  name: string;
  idToJoin: string | undefined;
  clean: boolean;
  spectator: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'Ideenmesse';

  public state: string = 'initial';

  public formData = {
    ownName: this.getSettingValue('ideenmesseUserName', ''),
    meetingID: this.getSettingValue('ideenmesseMeetingID', ''),
  }

  getSettingValue(key: string, defaultValue: string) {
    let paramValue = new URL(location.href).searchParams.get(key);
    if (paramValue) {
      return paramValue;
    }
    let storedValue = localStorage.getItem(key);
    if (storedValue) {
      return storedValue;
    }
    return defaultValue;
  }

  private destroy = new Subject();

  constructor(
      public fieldService: ParticipantStoreService,
      private http: HttpClient, 
      private ngz: NgZone) {
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  gameExists(): boolean {
    let expected = 'ideenmesse.' + this.formData.ownName;
    for (let i = 0; i < localStorage.length; i++) {
      let key = localStorage.key(i);
      if (key?.startsWith(expected)) {
        return true;
      }
    }
    return false;
  }

  private start(idToJoin: string | undefined, clean: boolean, spectator: boolean) {
    let name = this.formData.ownName;
    if (name) {
      localStorage.setItem('ideenmesseUserName', name);
      this.createPeer({name, idToJoin, clean, spectator});
    } else {
      alert('Bitte Namen eingeben');
    }
  }
  
  createPeer(s: GameSettings) {
    //var peer = new Peer(undefined, {host: 'localhost', port: 9000, key: 'peerjs', debug: 2});
    var peer = new Peer(undefined, {});
    peer.on('error', (err: any) => {
        console.log(err);
        alert('' + err);
    });
    peer.on('open', (id: string) => {
        //alert('My peer ID is: ' + id);
        this.ngz.run(() => this.loadDeckAndInitGame(peer, s));
    });
  }

private loadDeckAndInitGame(peer: any, s: GameSettings) {
  // let deck: Card[] | undefined;
  // if (s.clean) {
  //   deck = this.mapDecksAndCards(data);
  //   console.log('loaded deck with ' + deck.length + ' cards');
  // } else {
  //   deck = undefined;
  // }
  this.fieldService.init(new Participant(peer, peer.id, this.formData.ownName as string, s.clean));
  // if (s.spectator) {
  //   this.fieldService.gameField.setEndedPlayer(this.fieldService.gameField.myself.name, true);
  // }
  if (s.idToJoin) {
    this.fieldService.participant.connectToOtherPlayer(s.idToJoin);
  }
  this.state = 'joined';
}

join() {
    var other = prompt('ID des Mitspielers');
    if (other) {
      this.start(other, true, false);
    }
}

joinAsSpectator() {
  var other = prompt('ID des Mitspielers');
  if (other) {
    this.start(other, true, true);
  }
}

waitForOthers() {
  this.start(undefined, true, false);
}

continueGame() {
  this.start(undefined, false, false);
}

}
