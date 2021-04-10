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
  public peer: any|undefined;

  public formData = {
    ownName: this.getSettingValue('ideenmesseUserName', ''),
    meetingID: this.getSettingValue('ideenmesseMeetingID', ''),
  }

  public ideaInput = {
    idea1Title: '',
    idea1Details: '',
    idea2Title: '',
    idea2Details: '',
    idea3Title: '',
    idea3Details: ''
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
      private cdr: ChangeDetectorRef,
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
    this.peer = new Peer(undefined, 
      {
        config: {
          iceServers: [
            {urls: 'stun:stun.l.google.com:19302' },
            {urls: 'turn:v2202012136631136755.bestsrv.de', username: 'ideenmesse', credential: 'clarifying-behind-anchoring-storyboard'}
          ]
        }
      }
    );
    this.peer.on('error', (err: any) => {
        console.log(err);
    });
    this.peer.once('open', (id: string) => {
        this.ngz.run(() => this.loadDeckAndInitGame(this.peer, s));
    });
  }

public askForIdeas() {
  this.state = 'ideas';
}

private loadDeckAndInitGame(peer: any, s: GameSettings) {
  // let deck: Card[] | undefined;
  // if (s.clean) {
  //   deck = this.mapDecksAndCards(data);
  //   console.log('loaded deck with ' + deck.length + ' cards');
  // } else {
  //   deck = undefined;
  // }
  let ideas;
  if (s.clean) {
    if (s.spectator) {
      ideas = [];
    } else {
      ideas = [
        { title: this.ideaInput.idea1Title, details: this.ideaInput.idea1Details },
        { title: this.ideaInput.idea2Title, details: this.ideaInput.idea2Details },
        { title: this.ideaInput.idea3Title, details: this.ideaInput.idea3Details }
      ];
    }
  } else {
    ideas = undefined;
  }
  let markCallback = () => this.ngz.run(() => this.cdr.markForCheck());
  this.fieldService.init(new Participant(peer, peer.id, this.formData.ownName as string, ideas, markCallback));
  // if (s.spectator) {
  //   this.fieldService.gameField.setEndedPlayer(this.fieldService.gameField.myself.name, true);
  // }
  if (s.idToJoin) {
    this.fieldService.participant.connectToOtherPlayer(s.idToJoin);
  }
  this.state = 'joined';
}

join() {
  if (!this.formData.meetingID) {
    this.waitForOthers();
  } else {
    this.doJoin(true, false);
  }
}

joinAsSpectator() {
  this.doJoin(true, true);
}

doJoin(clean: boolean, spectator: boolean) {
  let other = this.formData.meetingID;
  if (!other) {
    alert('Bitte Meeting-ID angeben');
    return;
  }
  this.start(other, clean, spectator);
}

waitForOthers() {
  this.start(undefined, true, false);
}

continueGame() {
  this.start(undefined, false, false);
}

getMeetingLink(): string {
  return window.location.href.split('?')[0] + "?ideenmesseMeetingID=" + this.fieldService.participant.getPeerID();
}

public reconnect(): void {
  let id = prompt('Ziel-Meeting-ID', this.formData.meetingID);
  if (id) {
    this.fieldService.participant.connectToOtherPlayer(id);
  }
}

}
