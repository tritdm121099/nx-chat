import { HttpClient, HttpParams } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  Conversation,
  ConversationListItem,
  Message,
  ReceiveMessagePayload,
  User,
  UserTypingPayload,
} from '@nx-chat/interfaces';
import { EMPTY, Subscription, throwError } from 'rxjs';
import { catchError, finalize, tap } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private wsService = inject(WebSocketService);
  private authService = inject(AuthService);

  conversations = signal<ConversationListItem[]>([]);
  selectedConversation = signal<ConversationListItem | null>(null);
  messages = signal<Message[]>([]);

  isLoadingConversations = signal(false);
  isLoadingMessages = signal(false);
  error = signal<string | null>(null);

  isSearchingUsers = signal(false);
  searchedUsers = signal<User[]>([]);
  searchError = signal<string | null>(null);
  isStartingConversation = signal(false);
  typingUsers = signal<
    Record<number, Omit<UserTypingPayload, 'conversationId'>[]>
  >({});

  unreadMessageCountTotal = computed(() => {
    return this.conversations().reduce(
      (total, convo) => total + (convo.unreadCount || 0),
      0
    );
  });

  private newMessageSubscription: Subscription | null = null;
  private typingStateSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      const selectedConvo = this.selectedConversation();
      if (selectedConvo) {
        this.loadMessages(selectedConvo.id);
      } else {
        this.messages.set([]);
      }
    });

    effect(
      () => {
        const currentUser = this.authService.currentUser();
        if (currentUser && this.authService.isLoggedIn()) {
          this.loadConversations();
          this.subscribeToUserTypingUpdates();
          this.subscribeToNewMessages();
        } else {
          this.cleanup();
        }
      },
      { allowSignalWrites: true }
    );
  }

  loadConversations() {
    this.isLoadingConversations.set(true);
    this.error.set(null);
    this.http
      .get<ConversationListItem[]>('/api/conversations')
      .pipe(
        tap((convos) => {
          this.conversations.set(convos);
        }),
        catchError((err) => {
          console.error('Error loading conversations:', err);
          this.error.set('Failed to load conversations.');
          return EMPTY;
        }),
        finalize(() => this.isLoadingConversations.set(false))
      )
      .subscribe();
  }

  private handleExternalNotification(message: ReceiveMessagePayload) {
    // 1. Thay đổi Title của Tab
    if (document.hidden) {
      const senderName =
        message.user?.name || message.user?.email || 'New Message';
      document.title = `(${this.unreadMessageCountTotal()}) ${senderName} - NxChat`; // unreadMessageCountTotal() cần được tạo
    }
    // Listener để reset title khi tab active trở lại
    document.addEventListener(
      'visibilitychange',
      () => {
        if (!document.hidden) {
          document.title = 'NxChat'; // Reset title gốc
        }
      },
      { once: true }
    );

    // 2. Thông báo trình duyệt (Browser Notification)
    if (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      (document.hidden ||
        this.selectedConversation()?.id !== message.conversationId)
    ) {
      const notification = new Notification('New Message on NxChat', {
        body: `${message.user?.name || message.user?.email}: ${
          message.content
        }`,
        icon: '/favicon.ico', // Đường dẫn tới icon của bạn
        // tag: `conversation-${message.conversationId}` // Để gom nhóm thông báo
      });
      notification.onclick = () => {
        window.focus(); // Focus vào tab ứng dụng
        // Có thể thêm logic để navigate tới đúng conversation đó
        // this.router.navigate(['/chat']); // Ví dụ
        // this.selectConversationById(message.conversationId); // Cần tạo hàm này
      };
    } else if (
      'Notification' in window &&
      Notification.permission !== 'denied'
    ) {
      // Chưa có quyền, xin quyền (có thể đặt ở chỗ khác, ví dụ khi user settings)
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          this.handleExternalNotification(message); // Thử lại nếu đã được cấp quyền
        }
      });
    }
  }

  selectConversation(conversation: ConversationListItem | null) {
    this.selectedConversation.set(conversation);
    if (conversation) {
      this.markConversationAsRead(conversation.id);
    }
    this.clearSearchResults();
  }

  markConversationAsRead(conversationId: number): void {
    this.conversations.update((convos) =>
      convos.map((c) =>
        c.id === conversationId ? { ...c, unreadCount: 0 } : c
      )
    );
    // TODO: Gửi sự kiện "messagesRead" lên server nếu cần đồng bộ trạng thái đã đọc
  }

  loadMessages(conversationId: number) {
    this.isLoadingMessages.set(true);
    this.error.set(null);
    // TODO: Implement pagination later if needed
    this.http
      .get<Message[]>(`/api/conversations/${conversationId}/messages`)
      .pipe(
        tap((msgs) => this.messages.set(msgs)),
        catchError((err) => {
          console.error('Error loading messages:', err);
          this.error.set('Failed to load messages.');
          this.messages.set([]);
          return EMPTY;
        }),
        finalize(() => this.isLoadingMessages.set(false))
      )
      .subscribe();
  }

  sendMessage(content: string) {
    const selectedConvoId = this.selectedConversation()?.id;
    if (!selectedConvoId || !content.trim()) {
      console.error(
        'Cannot send message: No conversation selected or message empty.'
      );
      return;
    }

    this.wsService.sendMessage({
      conversationId: selectedConvoId,
      content: content.trim(),
    });
    // Optimistic update (optional): Add message immediately to UI
    // const optimisticMessage: Message = { ... };
    // this.messages.update(currentMessages => [...currentMessages, optimisticMessage]);
  }

  private subscribeToNewMessages() {
    this.unsubscribeFromNewMessages(); // Ensure no duplicate subscriptions
    this.newMessageSubscription = this.wsService.newMessage$.subscribe(
      (newMessage: ReceiveMessagePayload) => {
        const selectedConvo = this.selectedConversation();
        const isChattingInThisConvo =
          selectedConvo && newMessage.conversationId === selectedConvo.id;

        if (isChattingInThisConvo) {
          this.messages.update((currentMessages) => [
            ...currentMessages,
            newMessage,
          ]);
          this.markConversationAsRead(newMessage.conversationId);
        }

        // Update the conversation list item (last message, timestamp)
        this.conversations.update((convos) => {
          const convoIndex = convos.findIndex(
            (c) => c.id === newMessage.conversationId
          );
          if (convoIndex > -1) {
            const existingConvo = convos[convoIndex];
            const updatedConvo: ConversationListItem = {
              ...existingConvo,
              lastMessage: newMessage,
              updatedAt: newMessage.createdAt,
              // Tăng unreadCount nếu không phải là conversation đang active
              unreadCount: !isChattingInThisConvo
                ? (existingConvo.unreadCount || 0) + 1
                : 0,
            };
            const currentList = [...convos];
            currentList.splice(convoIndex, 1);
            return [updatedConvo, ...currentList];
          }
          return convos;
        });

        if (!isChattingInThisConvo || document.hidden) {
          this.handleExternalNotification(newMessage);
        }
      }
    );
  }

  private unsubscribeFromNewMessages() {
    this.newMessageSubscription?.unsubscribe();
    this.newMessageSubscription = null;
  }

  private subscribeToUserTypingUpdates() {
    this.typingStateSubscription?.unsubscribe();
    this.typingStateSubscription = this.wsService
      .on<UserTypingPayload>('userTypingUpdate')
      .subscribe((payload) => {
        this.typingUsers.update((currentTypingUsers) => {
          const usersInConvo = currentTypingUsers[payload.conversationId] || [];
          let updatedUsersInConvo;

          if (payload.isTyping) {
            if (!usersInConvo.some((u) => u.userId === payload.userId)) {
              updatedUsersInConvo = [
                ...usersInConvo,
                {
                  userId: payload.userId,
                  userName: payload.userName,
                  isTyping: true,
                },
              ];
            } else {
              updatedUsersInConvo = usersInConvo.map((u) =>
                u.userId === payload.userId
                  ? { ...u, userName: payload.userName, isTyping: true }
                  : u
              );
            }
          } else {
            // Xóa user khỏi danh sách đang gõ
            updatedUsersInConvo = usersInConvo.filter(
              (u) => u.userId !== payload.userId
            );
          }
          return {
            ...currentTypingUsers,
            [payload.conversationId]: updatedUsersInConvo,
          };
        });
      });
  }

  sendTypingState(conversationId: number, isTyping: boolean): void {
    if (!this.wsService.isConnected()) return;
    this.wsService.emit('typingStateChange', { conversationId, isTyping });
  }

  // Call this when the component/service is destroyed or user logs out
  cleanup() {
    this.unsubscribeFromNewMessages();
    this.conversations.set([]);
    this.selectedConversation.set(null);
    this.messages.set([]);
    this.error.set(null);
    this.clearSearchResults();
    this.typingStateSubscription?.unsubscribe();
    this.typingUsers.set({});
  }

  // --- Phương thức cho User Search ---
  searchUsers(query: string) {
    if (!query.trim()) {
      this.searchedUsers.set([]);
      this.searchError.set(null);
      return;
    }
    this.isSearchingUsers.set(true);
    this.searchError.set(null);
    const params = new HttpParams().set('q', query);
    this.http
      .get<User[]>('/api/users/search', { params })
      .pipe(
        tap((users) => {
          this.searchedUsers.set(users);
        }),
        catchError((err) => {
          console.error('Error searching users:', err);
          this.searchError.set('Failed to search users.');
          this.searchedUsers.set([]);
          return EMPTY;
        }),
        finalize(() => this.isSearchingUsers.set(false))
      )
      .subscribe();
  }

  clearSearchResults() {
    this.searchedUsers.set([]);
    this.searchError.set(null);
  }

  startOrSelectPrivateConversation(targetUserId: number) {
    this.isStartingConversation.set(true);
    this.error.set(null); // Clear main error

    const currentUser = this.authService.currentUser();
    if (!currentUser) {
      this.error.set('Current user not found. Please re-login.');
      this.isStartingConversation.set(false);
      return;
    }
    const existingConvo = this.conversations().find(
      (c) =>
        // !c.isGroup && // Giả sử có isGroup cho chat 1-1
        c.participants.some((p) => p.userId === targetUserId) &&
        c.participants.some((p) => p.userId === currentUser.id)
    );

    if (existingConvo) {
      this.selectConversation(existingConvo);
      this.clearSearchResults();
      this.isStartingConversation.set(false);
      return;
    }

    this.http
      .post<Conversation>('/api/conversations/private', {
        userId: targetUserId,
      })
      .pipe(
        tap((newOrExistingConvoData: Conversation) => {
          this.loadConversations();
          this.clearSearchResults();

          const findAndSelectNewConvo = () => {
            const updatedConversations = this.conversations();
            const foundConvo = updatedConversations.find(
              (c) =>
                c.participants.some((p) => p.userId === targetUserId) &&
                c.participants.some((p) => p.userId === currentUser.id)
            );
            if (foundConvo) {
              this.selectConversation(foundConvo);
            } else {
              console.warn(
                'New conversation not immediately found in list after creation.'
              );
            }
          };
          setTimeout(findAndSelectNewConvo, 500);
        }),
        catchError((err) => {
          console.error('Error starting private conversation:', err);
          this.error.set(
            err?.error?.message || 'Failed to start conversation.'
          );
          return throwError(() => err);
        }),
        finalize(() => this.isStartingConversation.set(false))
      )
      .subscribe();
  }

  // Helper để map Conversation từ API (nếu cần) thành ConversationListItem
  // (Backend nên trả về ConversationListItem trực tiếp để giảm tải cho FE)
  // private mapToConversationListItem(convoData: Conversation): ConversationListItem {
  //   const currentUser = this.authService.currentUser();
  //   const otherParticipant = convoData.participants.find(p => p.userId !== currentUser?.id)?.user;
  //   return {
  //     ...convoData,
  //     lastMessage: convoData.messages?.[0] || null,
  //     otherParticipant: otherParticipant || null
  //   };
  // }
}
