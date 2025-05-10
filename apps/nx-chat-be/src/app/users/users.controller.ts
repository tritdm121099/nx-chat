import { Controller, Get, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { User } from '@nx-chat/interfaces';

@UseGuards(JwtAuthGuard) 
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@Request() req): User {
    return req.user;
  }

  @Get('search')
  searchUsers(@Query('q') query: string, @Request() req): Promise<User[]> {
      const currentUserId = req.user.id;
      return this.usersService.searchUsers(query, currentUserId);
  }
}