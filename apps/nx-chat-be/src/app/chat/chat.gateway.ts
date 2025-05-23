import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service';
import {
  SendMessageDto,
  ReceiveMessagePayload,
  User,
  UserTypingPayload,
} from '@nx-chat/interfaces';
import { AuthService } from '../auth/auth.service';
import { WsJwtAuthGuard } from '../auth/guards/ws-jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: '*', // Be more specific in production! e.g., 'http://localhost:4200'
  },
  // namespace: 'chat', // Optional: use namespaces if needed
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('ChatGateway');
  private connectedUsers = new Map<number, Socket>();

  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly authService: AuthService
  ) {}

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
    // Optional: Add middleware for authentication here
    // server.use(async (socket, next) => { /* Auth logic */ next(); });
  }

  async handleConnection(client: Socket, ...args: any[]) {
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];
    this.logger.log(
      `Client trying to connect: ${client.id}, Token: ${
        token ? 'Present' : 'Missing'
      }`
    );

    if (!token) {
      this.logger.warn(`Client ${client.id} disconnected - No token provided`);
      return client.disconnect(true); // Disconnect if no token
    }

    try {
      const user = await this.authService.verifyToken(token);
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }

      this.logger.log(`Client connected: ${client.id} - UserID: ${user.id}`);
      client.data.user = user; // Attach user data to the socket instance
      this.connectedUsers.set(user.id, client); // Store connected user

      // Join rooms for all conversations the user is part of
      const conversationIds =
        await this.conversationsService.getConversationIdsForUser(user.id);
      conversationIds.forEach((id) => client.join(this.getRoomName(id)));
      this.logger.log(
        `User ${
          user.id
        } joined rooms for conversations: [${conversationIds.join(', ')}]`
      );
    } catch (error) {
      this.logger.error(
        `Authentication failed for client ${client.id}: ${error.message}`
      );
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const user = client.data.user as User | undefined;
    if (user) {
      this.logger.log(`Client disconnected: ${client.id} - UserID: ${user.id}`);
      this.connectedUsers.delete(user.id);

      const conversationIds =
        await this.conversationsService.getConversationIdsForUser(user.id);
      conversationIds.forEach((convoId) => {
        const typingPayload: UserTypingPayload = {
          userId: user.id,
          userName: user.name || user.email,
          conversationId: convoId,
          isTyping: false,
        };

        const roomName = this.getRoomName(convoId);
        this.server.to(roomName).emit('userTypingUpdate', typingPayload);
      });
    } else {
      this.logger.log(
        `Client disconnected: ${client.id} - User not authenticated`
      );
    }
  }

  private getRoomName(conversationId: number): string {
    return `conversation_${conversationId}`;
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() payload: SendMessageDto,
    @ConnectedSocket() client: Socket
  ): Promise<void> {
    const user = client.data.user as User | undefined;

    if (!user) {
      this.logger.warn(
        `sendMessage attempt from unauthenticated socket: ${client.id}`
      );
      // Optionally emit an error back to the client
      client.emit('error', { message: 'Authentication required.' });
      return;
    }

    this.logger.log(
      `Received message from User ${user.id} for convo ${payload.conversationId}: ${payload.content}`
    );

    try {
      // 1. Validate payload (handled by ValidationPipe if configured for WS)

      // 2. Save message to DB (service already validates participation)
      const newMessage = await this.conversationsService.createMessage(
        user.id,
        payload.conversationId,
        payload.content
      );

      // 3. Broadcast the new message to the conversation room
      const roomName = this.getRoomName(payload.conversationId);
      const messagePayload: ReceiveMessagePayload = newMessage; // Already includes user info

      // Emit to all clients in the room *including* the sender
      this.server.to(roomName).emit('receiveMessage', messagePayload);

      // OR: Emit to all clients in the room *except* the sender
      // client.to(roomName).emit('receiveMessage', messagePayload);

      this.logger.log(
        `Broadcasted message ${newMessage.id} to room ${roomName}`
      );

      // Optional: Send acknowledgement back to sender
      // return { status: 'ok', messageId: newMessage.id };
    } catch (error) {
      this.logger.error(
        `Error handling message from User ${user.id}: ${error.message}`,
        error.stack
      );
      // Emit error back to the sender client
      client.emit('error', {
        event: 'sendMessage',
        message: error.message || 'Failed to send message',
      });
    }
  }

  @UseGuards(WsJwtAuthGuard)
  @SubscribeMessage('typingStateChange')
  handleTypingState(
    @MessageBody() data: { conversationId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket
  ): void {
    const user = client.data.user as User;

    const { conversationId, isTyping } = data;
    const roomName = this.getRoomName(conversationId);

    const typingPayload: UserTypingPayload = {
      userId: user.id,
      userName: user.name || user.email,
      conversationId,
      isTyping,
    };

    client.to(roomName).emit('userTypingUpdate', typingPayload);
    this.logger.verbose(
      `User ${user.email} is ${
        isTyping ? 'typing' : 'stopped typing'
      } in convo ${conversationId}`
    );
  }
}
