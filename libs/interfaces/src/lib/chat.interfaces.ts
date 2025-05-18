import { User } from './user.interfaces';

export interface Message {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  conversationId: number;
  user?: User;
}

export interface ReceiveMessagePayload extends Message {
  todo?: string;
}

export interface UserTypingPayload {
  userId: number;
  userName: string;
  conversationId: number;
  isTyping: boolean;
}
