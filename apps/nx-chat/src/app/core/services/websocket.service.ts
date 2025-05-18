import { effect, inject, Injectable, OnDestroy, signal } from '@angular/core';
import { ReceiveMessagePayload, SendMessageDto } from '@nx-chat/interfaces';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private socket: Socket | undefined;
  private authService = inject(AuthService);

  isConnected = signal(false);
  private newMessageSource = new Subject<ReceiveMessagePayload>();
  newMessage$ = this.newMessageSource.asObservable();

  connectionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const token = this.authService.getToken();
      if (token && !this.socket?.connected) {
        this.connect(token);
      } else if (!token && this.socket?.connected) {
        this.disconnect();
      }
    });
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  private connect(token: string): void {
    if (this.socket?.connected) return;

    this.connectionError.set(null);
    this.socket = io('http://localhost:3000', {
      auth: { token },
      // Optional: configure transports, reconnection attempts etc.
      // transports: ['websocket'],
      // reconnectionAttempts: 5,
    });

    this.socket.on('connect', () => {
      console.log('WebSocket Connected:', this.socket?.id);
      this.isConnected.set(true);
      this.connectionError.set(null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket Disconnected:', reason);
      this.isConnected.set(false);
      if (reason === 'io server disconnect') {
        // Server disconnected us, likely auth error or kick
        this.connectionError.set(
          'Disconnected by server (check authentication).'
        );
        // Optionally attempt to reconnect or logout user
        // this.authService.logout(); // Force logout if needed
      } else {
        this.connectionError.set(`Disconnected: ${reason}`);
      }
      this.socket = undefined; // Clean up socket instance
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket Connection Error:', error);
      this.isConnected.set(false);
      this.connectionError.set(`Connection failed: ${error.message}`);
      this.socket?.disconnect(); // Ensure cleanup on connection error
      this.socket = undefined;
    });

    // --- Listen for custom events ---
    this.socket.on('receiveMessage', (message: ReceiveMessagePayload) => {
      console.log('Message received:', message);
      this.newMessageSource.next(message); // Push message to Subject/Observable
    });

    this.socket.on('error', (errorData: any) => {
      console.error('WebSocket Server Error:', errorData);
    });
  }

  private disconnect(): void {
    if (this.socket) {
      console.log('Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = undefined;
      this.isConnected.set(false);
    }
  }

  sendMessage(message: SendMessageDto): void {
    this.emit('sendMessage', message, (ack: any) => {
      if (ack?.status === 'ok') {
        console.log('Message sent successfully, ID:', ack.messageId);
      } else {
        console.error('Message sending failed:', ack);
      }
    });
  }

  on<T>(eventName: string): Observable<T> {
    if (!this.socket) {
      console.error(
        'Socket not initialized for listening to event:',
        eventName
      );
      return new Observable<T>((observer) => observer.complete());
    }

    return new Observable<T>((observer) => {
      this.socket?.on(eventName, (data: T) => {
        observer.next(data);
      });
      // Handle error or disconnect events
      return () => {
        this.socket?.off(eventName);
      };
    });
  }

  emit<T>(eventName: string, data: T, ack?: (response: any) => void): void {
    if (!this.socket?.connected) {
      console.error(
        `Cannot emit event ${eventName}, WebSocket is not connected.`
      );
      return;
    }
    if (ack) {
      this.socket.emit(eventName, data, ack);
    } else {
      this.socket.emit(eventName, data);
    }
  }

  // Add methods for other events if needed (e.g., joinRoom, leaveRoom, typing)
  // joinConversationRoom(conversationId: number) {
  //   this.socket?.emit('joinRoom', { conversationId });
  // }
}
