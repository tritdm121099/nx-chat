import { HttpClient, HttpParams } from '@angular/common/http';
import { effect, inject, Injectable, signal } from '@angular/core';
import {
  Conversation,
  ConversationListItem,
  Message,
  ReceiveMessagePayload,
  User,
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

  private newMessageSubscription: Subscription | null = null;

  constructor() {
    effect(() => {
      const selectedConvo = this.selectedConversation();
      if (selectedConvo) {
        this.loadMessages(selectedConvo.id);
      } else {
        this.messages.set([]);
      }
    });

    this.subscribeToNewMessages();

    effect(
      () => {
        const currentUser = this.authService.currentUser();
        if (currentUser && this.authService.isLoggedIn()) {
          this.loadConversations();
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

  selectConversation(conversation: ConversationListItem | null) {
    this.selectedConversation.set(conversation);
    this.clearSearchResults();
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

  // Subscribe to new messages coming from WebSocket
  private subscribeToNewMessages() {
    this.unsubscribeFromNewMessages(); // Ensure no duplicate subscriptions
    this.newMessageSubscription = this.wsService.newMessage$.subscribe(
      (newMessage: ReceiveMessagePayload) => {
        const selectedConvo = this.selectedConversation();
        // Add message to the list if it belongs to the currently selected conversation
        if (selectedConvo && newMessage.conversationId === selectedConvo.id) {
          this.messages.update((currentMessages) => [
            ...currentMessages,
            newMessage,
          ]);
          // TODO: Add scroll-to-bottom logic here or in the component
        }

        // Update the conversation list item (last message, timestamp)
        this.conversations.update((convos) => {
          const convoIndex = convos.findIndex(
            (c) => c.id === newMessage.conversationId
          );
          if (convoIndex > -1) {
            const updatedConvo = {
              ...convos[convoIndex],
              lastMessage: newMessage,
              updatedAt: new Date().toISOString(),
            }; // Use newMessage directly or adjust if needed
            // Move updated conversation to the top (optional)
            const updatedList = [
              updatedConvo,
              ...convos.slice(0, convoIndex),
              ...convos.slice(convoIndex + 1),
            ];
            return updatedList;
            // Or just update in place:
            // convos[convoIndex] = updatedConvo;
            // return [...convos];
          }
          return convos; // Return unchanged list if conversation not found
        });
      }
    );
  }

  private unsubscribeFromNewMessages() {
    this.newMessageSubscription?.unsubscribe();
    this.newMessageSubscription = null;
  }

  // Call this when the component/service is destroyed or user logs out
  cleanup() {
    this.unsubscribeFromNewMessages();
    this.conversations.set([]);
    this.selectedConversation.set(null);
    this.messages.set([]);
    this.error.set(null);
    this.clearSearchResults();
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
      .post<Conversation>('/api/conversations/private', { userId: targetUserId })
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
