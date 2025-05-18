import { Message } from './chat.interfaces';
import { User } from './user.interfaces';

export interface Conversation {
  id: number;
  createdAt: string;
  updatedAt: string;
  participants: Participant[];
  messages?: Message[];
  // name?: string | null;
  // isGroup?: boolean;
}

export interface Participant {
  id: number;
  userId: number;
  conversationId: number;
  createdAt: string;
  user?: User;
}

export interface ConversationListItem extends Conversation {
  otherParticipant?: User;
  lastMessage?: Message | null;
  unreadCount?: number;
}
