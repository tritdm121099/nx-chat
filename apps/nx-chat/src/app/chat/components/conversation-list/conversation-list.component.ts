import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChatService } from '../../services/chat.service';
import { ConversationListItem } from '@nx-chat/interfaces';
import { AuthService } from '../../../core/services/auth.service'; // Import AuthService

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss']
})
export class ConversationListComponent implements OnInit {
  chatService = inject(ChatService);
  authService = inject(AuthService); 


  ngOnInit(): void {
    this.chatService.loadConversations();
  }

  selectConversation(conversation: ConversationListItem): void {
    this.chatService.selectConversation(conversation);
  }

   // Helper to display the correct name for a conversation
   getConversationDisplay(convo: ConversationListItem): string {
        const currentUser = this.authService.currentUser(); // Get current user
        if (!currentUser) return 'Conversation'; // Fallback

        // For 1-on-1 chats, show the other participant's name/email
        const otherParticipant = convo.participants.find(p => p.userId !== currentUser.id)?.user;
        return otherParticipant?.name || otherParticipant?.email || 'Unknown User';

        // For group chats (if implemented later):
        // return convo.name || 'Group Chat';
    }

    getInitials(name?: string | null, email?: string): string {
        if (name) {
             return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        }
        if (email) {
            return email[0].toUpperCase();
        }
        return '?';
    }
}