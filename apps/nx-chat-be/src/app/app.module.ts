import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthModule } from './auth/auth.module.js';
import { ChatModule } from './chat/chat.module.js';
import { ConversationsModule } from './conversations/conversations.module.js';
import { UsersModule } from './users/users.module.js';
import { ConfigModule } from './core/config/config.module.js';

@Module({
  imports: [
    ConfigModule, // Load .env and provide ConfigService globally
    PrismaModule, // Provide PrismaService globally
    AuthModule,
    UsersModule,
    ConversationsModule,
    ChatModule, // WebSocket Gateway
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}

