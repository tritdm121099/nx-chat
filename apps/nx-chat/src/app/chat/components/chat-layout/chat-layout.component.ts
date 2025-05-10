import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ChatService } from '../../services/chat.service';
import { ConversationListComponent } from '../conversation-list/conversation-list.component';
import { MessageAreaComponent } from '../message-area/message-area.component';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { User } from '@nx-chat/interfaces';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-layout',
  standalone: true,
  imports: [CommonModule, ConversationListComponent, MessageAreaComponent, FormsModule],
  templateUrl: './chat-layout.component.html',
  styleUrls: ['./chat-layout.component.scss'],
})
export class ChatLayoutComponent {
  authService = inject(AuthService);
  chatService = inject(ChatService);

  showSearch = signal(false);
  searchQuery = signal('');

  // Signals từ ChatService để hiển thị
  searchedUsers = this.chatService.searchedUsers;
  isSearchingUsers = this.chatService.isSearchingUsers;
  searchError = this.chatService.searchError;
  isStartingConversation = this.chatService.isStartingConversation; // Thêm signal này

  searchSubject = new Subject<string>();
  private searchSubscription?: Subscription;

  constructor() {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(300), // Chờ 300ms sau khi người dùng ngừng gõ
        distinctUntilChanged() // Chỉ emit nếu giá trị thay đổi
      )
      .subscribe((query) => {
        this.chatService.searchUsers(query);
      });
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  onSearchQueryChange(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.searchSubject.next(query);
  }

  toggleSearch(): void {
    this.showSearch.update((v) => !v);
    if (!this.showSearch()) {
      this.chatService.clearSearchResults();
      this.searchQuery.set('');
    }
  }

  startChatWithUser(user: User): void {
    console.log('Starting chat with:', user);
    this.chatService.startOrSelectPrivateConversation(user.id);
    // Sau khi gọi, chatService sẽ handle việc load lại convos và chọn.
    // Có thể ẩn UI search ở đây
    this.showSearch.set(false);
    this.searchQuery.set('');
    this.chatService.clearSearchResults();
  }

  logout() {
    this.authService.logout();
    // ChatService cleanup sẽ được gọi qua effect dựa trên authService.isLoggedIn()
  }

  getInitials(name?: string | null, email?: string): string {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return '?';
  }
}
