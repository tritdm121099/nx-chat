import { User } from './user.interfaces';

export interface Message {
  id: number;
  content: string;
  createdAt: Date;
  userId: number;
  conversationId: number;
  user?: User;
}

export interface ReceiveMessagePayload extends Message {
  todo?: string;
}
