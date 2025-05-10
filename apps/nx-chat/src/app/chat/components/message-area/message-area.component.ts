import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, effect, ElementRef, inject, ViewChild } from '@angular/core';
import { User } from '@nx-chat/interfaces';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../services/chat.service';
import { MessageInputComponent } from '../message-input/message-input.component';

@Component({
  selector: 'app-message-area',
  standalone: true,
  imports: [CommonModule, MessageInputComponent],
  templateUrl: './message-area.component.html',
  styleUrls: ['./message-area.component.scss']
})
export class MessageAreaComponent implements AfterViewChecked {
  chatService = inject(ChatService);
  authService = inject(AuthService);
  currentUser = this.authService.currentUser;

  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  private shouldScrollToBottom = false;

  constructor() {
    // Effect to scroll down when messages change
    effect(() => {
      // Trigger scroll after messages signal updates
      this.chatService.messages(); // Depend on messages signal
      this.shouldScrollToBottom = true; // Mark that we need to scroll
    });

     // Effect to scroll down when conversation changes (after messages are loaded)
     effect(() => {
        this.chatService.selectedConversation(); // Depend on conversation signal
        this.shouldScrollToBottom = true; // Mark for scroll when new convo selected
     });
  }

   ngAfterViewChecked(): void {
      if (this.shouldScrollToBottom) {
         this.scrollToBottom();
         this.shouldScrollToBottom = false; // Reset flag after scrolling
      }
   }


  scrollToBottom(): void {
    try {
      if (this.messageContainer?.nativeElement) {
        this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Could not scroll to bottom:', err);
    }
  }

    getConversationDisplay(convo = this.chatService.selectedConversation()): string {
        if (!convo) return '';
        const currentUser = this.authService.currentUser();
        if (!currentUser) return 'Chat';

        const otherParticipant = convo.participants.find(p => p.userId !== currentUser.id)?.user;
        return otherParticipant?.name || otherParticipant?.email || 'Unknown User';
    }

     getInitials(user?: User | null): string {
        if (!user) return '?';
        if (user.name) {
             return user.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        }
        if (user.email) {
            return user.email[0].toUpperCase();
        }
        return '?';
    }
}