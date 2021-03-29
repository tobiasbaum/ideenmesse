import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DistributedDatabaseSystem } from './distributed-database';

interface IdeaDto {
  title: string;
  details: string;
}

interface DeveloperDto {
  name: string;
  date: Date;
  color: string;
  ideas: IdeaDto[];
}

  export interface MsgData {
      color: string;
      tc: string;
      tr: string;
  }

  class Developer {
    
    constructor(
      private readonly name: string,
      private readonly db: DistributedDatabaseSystem) {
    }

    private get dto(): DeveloperDto {
      return this.db.get('ideas', this.name) as DeveloperDto;
    }

    public get date(): Date {
      return this.dto.date;
    }

  }
  
  class Participant {
    private readonly name: string;
    private readonly color: string;
    private developers: string[] = [];
    private readonly db: DistributedDatabaseSystem;

    constructor(peer: any, ownId: string, ownName: string, clean: boolean) {
      this.name = ownName;
      this.db = new DistributedDatabaseSystem(ownName, peer, ownId, localStorage, clean);
      this.db.on('add', 'ideas', true, (name: string, data: any) => {
        this.developers.push(name);
        this.ensureDevelopersSorted();
      });

      if (clean) {
        let idea1 : IdeaDto = {
          title: "Eine tolle Idee",
          details: "Jawohl"
        }
        let idea2 : IdeaDto = {
          title: "Eine andere tolle Idee",
          details: "Jawohl 2"
        }
        let idea3 : IdeaDto = {
          title: "Eine vielleicht noch bessere Idee",
          details: "Jawohl 3"
        }
        let h = Math.floor(Math.random() * 72) * 5;
        let s = 85 + Math.floor(Math.random() * 10);
        let l = 35 + Math.floor(Math.random() * 10);
        this.color = 'hsl(' + h + ',' + s + '%,' + l + '%)';
        let me : DeveloperDto = {
          name: ownName,
          color: this.color,
          date: new Date(),
          ideas: [idea1, idea2, idea3]
        }
        this.db.put('ideas', ownName, me);
      } else {
        this.color = (this.db.get('ideas', ownName) as DeveloperDto).color;
      }
    }

    registerMessageHandler(handler: Function) {
        this.db.on('add', 'messages', true, handler);
    }
  
    registerPlayerChangeHandler(handler: Function) {
      this.db.on('add', 'currentPlayer', true, handler);
      this.db.on('update', 'currentPlayer', false, handler);
      this.db.on('add', 'playerData', true, handler);
    }

    connectToOtherPlayer(id: string) {
      this.db.connectToNode(id);
    }
  
    private ensureDevelopersSorted() {
      this.developers.sort((a, b) => this.getDev(a).date.getTime() - this.getDev(b).date.getTime());
    }

    private getDev(name: string): Developer {
      return new Developer(name, this.db);
    }

    public allDevelopers(): Developer[] {
      return this.developers.map(name => this.getDev(name));
    }

    sendMessage(msg: string) {
      this.sendMessageRaw(this.makeColored(curTime() + ' ' + this.name, msg));
    }

    makeColored(tc: string, tr: string): MsgData {
      return {
          color: this.color,
          tc: tc,
          tr: tr
      }
    }

    sendMessageRaw(msg: MsgData) {
      this.db.add('messages', msg);
    }
  
  }

function curTime(): string {
  return new Date().toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'});
}

export { Participant };
