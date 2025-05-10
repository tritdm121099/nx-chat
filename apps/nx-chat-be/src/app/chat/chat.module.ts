import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ConversationsModule } from '../conversations/conversations.module';
import { AuthModule } from '../auth/auth.module'; // Import AuthModule

@Module({
  imports: [ConversationsModule, AuthModule], // Import modules whose services are needed
  providers: [ChatGateway],
})
export class ChatModule {}