import { Component, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { ChatService } from '../../services/chat.service';
import { debounceTime, Subject, Subscription, tap } from 'rxjs';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss'],
})
export class MessageInputComponent implements OnDestroy {
  chatService = inject(ChatService);
  messageContent = '';

  private typingSubject = new Subject<string>();
  private typingSubscription?: Subscription;
  private lastTypingStateSent = false;

  constructor() {
    this.typingSubscription = this.typingSubject
      .pipe(
        tap((content) => {
          const conversationId = this.chatService.selectedConversation()?.id;
          if (
            conversationId &&
            content.trim().length > 0 &&
            !this.lastTypingStateSent
          ) {
            this.chatService.sendTypingState(conversationId, true);
            this.lastTypingStateSent = true;
          }
        }),
        debounceTime(2000)
      )
      .subscribe(() => {
        const conversationId = this.chatService.selectedConversation()?.id;
        if (conversationId && this.lastTypingStateSent) {
          this.chatService.sendTypingState(conversationId, false);
          this.lastTypingStateSent = false;
        }
      });
  }

  onInputChange(event: string): void {
    const value = event;
    this.messageContent = value;
    if (value.trim().length > 0) {
      this.typingSubject.next(value);
    } else {
      const conversationId = this.chatService.selectedConversation()?.id;
      if (conversationId && this.lastTypingStateSent) {
        this.chatService.sendTypingState(conversationId, false);
        this.lastTypingStateSent = false;
      }
      this.typingSubject.next('');
    }
  }

  sendMessage(): void {
    if (this.messageContent.trim()) {
      this.chatService.sendMessage(this.messageContent);
      const conversationId = this.chatService.selectedConversation()?.id;
      if (conversationId && this.lastTypingStateSent) {
        this.chatService.sendTypingState(conversationId, false);
        this.lastTypingStateSent = false;
      }
      this.messageContent = '';
      this.typingSubject.next('');
    }
  }

  onEnterPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  ngOnDestroy(): void {
    this.typingSubscription?.unsubscribe();
    const conversationId = this.chatService.selectedConversation()?.id;
    if (conversationId && this.lastTypingStateSent) {
      this.chatService.sendTypingState(conversationId, false);
    }
  }
}
