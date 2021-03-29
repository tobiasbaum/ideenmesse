import { AfterViewChecked, ChangeDetectorRef, Component, Input, NgZone, OnInit } from '@angular/core';
import { Subject } from 'rxjs';
import { MsgData } from '../domain/participant';
import { ParticipantStoreService } from '../participant-store.service';

@Component({
  selector: 'ideenmesse-chat-box',
  templateUrl: './chat-box.component.html',
  styleUrls: ['./chat-box.component.scss']
})
export class ChatBoxComponent implements OnInit, AfterViewChecked {

  @Input()
  public devName!: string;

  public messages: MsgData[] = [];

  private destroy = new Subject();
  private scrollDirty: boolean = false;
  public msg: string = "";

  constructor(private field: ParticipantStoreService, private cdr: ChangeDetectorRef, private ngz: NgZone) { 
  }

  public large: boolean = false;
  public changeIcon: boolean = false;

  toggleHeight ()
  {
    this.large = !this.large;
    this.changeIcon = !this.changeIcon;
  } 

  ngOnInit(): void {
    this.field.subscribe(
      gf => gf.registerMessageHandler((id: undefined, msg: any) => this.handleAddedMessage(msg)),
      this.destroy);
  }

  ngOnDestroy(): void {
    this.destroy.next();
  }

  handleAddedMessage(msg: MsgData) {
    if (msg.to != this.devName) {
      return;
    }
    this.ngz.run(() => {
      NgZone.assertInAngularZone();
      this.messages.push(msg);
      this.cdr.markForCheck();
      this.scrollDirty = true;
      this.scrollToBottom();  
    });
  }

  ngAfterViewChecked() {
    if (this.scrollDirty) {
      this.scrollDirty = false;
      setTimeout(() => this.scrollToBottom());
    }
  }

  scrollToBottom() {
    let elem = document.getElementById('chatbox');
    if (elem) {
      elem.scrollTop = elem.scrollHeight;
    }
  }

sendMessage(): void {
      if (this.msg) {
        this.field.participant.sendMessage(this.msg, this.devName);
      }
      this.msg = "";
  }

}
