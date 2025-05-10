import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import {
  Conversation,
  Message,
  ConversationListItem,
  CreatePrivateConversationDto,
} from '@nx-chat/interfaces';

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('private')
  createPrivateConversation(
    @Request() req,
    @Body() createDto: CreatePrivateConversationDto
  ) {
    const currentUserId = req.user.id;
    return this.conversationsService.createPrivateConversation(
      currentUserId,
      createDto.userId
    );
  }

  @Get()
  getUserConversations(@Request() req): Promise<ConversationListItem[]> {
    const currentUserId = req.user.id;
    return this.conversationsService.getUserConversations(currentUserId);
  }

  @Get(':id/messages')
  getConversationMessages(
    @Request() req,
    @Param('id', ParseIntPipe) conversationId: number,
    @Query('limit') limit?: number, // Optional query params for pagination
    @Query('offset') offset?: number
  ): Promise<Message[]> {
    const currentUserId = req.user.id;
    return this.conversationsService.getConversationMessages(
      conversationId,
      currentUserId,
      isNaN(limit) ? undefined : limit,
      isNaN(offset) ? undefined : offset,
    );
  }
}
