import {
  ForbiddenException,
  Injectable
} from '@nestjs/common';
import {
  Conversation,
  ConversationListItem,
  Message
} from '@nx-chat/interfaces';
import { PrismaService } from '../core/prisma/prisma.service';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createPrivateConversation(userId1: number, userId2: number) {
    // 1. Check if users exist (optional, assume they do from auth/user search)
    const includeOptions = {
      participants: {
        include: {
          user: {
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
        },
      },
      // Có thể include lastMessage nếu cần thiết
      // messages: { orderBy: { createdAt: 'desc' }, take: 1 }
    };

    // 2. Check if a private conversation between these two users already exists
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: userId1 } } },
          { participants: { some: { userId: userId2 } } },
          // { isGroup: false }, // Assuming you add isGroup field later
        ],
      },
      include: includeOptions,
    });

    if (existingConversation) {
      return existingConversation;
    }

    const newConversation = await this.prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: userId1 }, { userId: userId2 }],
        },
      },
      include: includeOptions,
    });

    return newConversation as unknown as Conversation; // Todo update
  }

  async getUserConversations(userId: number): Promise<ConversationListItem[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          some: { userId: userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              // Lấy thông tin của các thành viên khác
              select: { id: true, email: true, name: true, avatarUrl: true }, // Không lấy password
            },
          },
        },
        messages: {
          // Lấy tin nhắn cuối cùng
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            user: {
              // Lấy thông tin người gửi tin nhắn cuối
              select: { id: true, email: true, name: true, avatarUrl: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // Sắp xếp theo lần cập nhật cuối (tin nhắn mới nhất)
      },
    });

    // Map to ConversationListItem to add otherParticipant info for 1-1 chats
    return conversations.map((convo) => {
      const otherParticipant = convo.participants.find(
        (p) => p.userId !== userId
      )?.user;
      return {
        ...convo,
        lastMessage: convo.messages?.[0] || null,
        otherParticipant: otherParticipant || null, // Can be null for group chats if implemented
      };
    }) as unknown as ConversationListItem[]; // Todo update
  }

  async getConversationMessages(
    conversationId: number,
    userId: number,
    limit = 50,
    offset = 0
  ): Promise<Message[]> {
    // 1. Verify user is part of the conversation
    const participant = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participant) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // 2. Fetch messages
    const messages = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' }, // Oldest first usually for chat history
      take: limit,
      skip: offset,
      include: {
        user: {
          // Include sender info
          select: { id: true, email: true, name: true, avatarUrl: true },
        },
      },
    });
    return messages as unknown as Message[]; // TODO UPDATE
  }

  async createMessage(
    userId: number,
    conversationId: number,
    content: string
  ): Promise<Message> {
    // 1. Verify user is part of the conversation (important for security)
    const participant = await this.prisma.participant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });

    if (!participant) {
      throw new ForbiddenException(
        'You cannot send messages to this conversation'
      );
    }

    // 2. Create the message and update conversation timestamp in a transaction
    const newMessage = await this.prisma.$transaction(async (tx) => {
      const createdMsg = await tx.message.create({
        data: {
          content,
          userId,
          conversationId,
        },
        include: {
          user: {
            // Include sender info
            select: { id: true, email: true, name: true, avatarUrl: true },
          },
        },
      });

      // Update the conversation's updatedAt timestamp
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return createdMsg;
    });

    return newMessage as unknown as Message; // Todo update
  }

  // Helper function for ChatGateway to get conversation IDs for a user
  async getConversationIdsForUser(userId: number): Promise<number[]> {
    const participations = await this.prisma.participant.findMany({
      where: { userId },
      select: { conversationId: true },
    });
    return participations.map((p) => p.conversationId);
  }
}
