import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule], // Add FormsModule
  templateUrl: './message-input.component.html',
  styleUrls: ['./message-input.component.scss']
})
export class MessageInputComponent {
  chatService = inject(ChatService);
  messageContent = '';

  sendMessage(): void {
    if (this.messageContent.trim()) {
      this.chatService.sendMessage(this.messageContent);
      this.messageContent = ''; // Clear input after sending
    }
  }

  onEnterPress(event: KeyboardEvent): void {
     if (event.key === 'Enter' && !event.shiftKey) { // Send on Enter, allow Shift+Enter for newline
        event.preventDefault(); // Prevent default newline insertion
        this.sendMessage();
     }
  }
}