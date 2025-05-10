import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { LoginDto, LoginResponse, RegisterDto, RegisterResponse, User } from '@nx-chat/interfaces';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard.js';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<RegisterResponse> {
    return this.authService.register(registerDto);
  }

  // @UseGuards(LocalAuthGuard)
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Request() req, @Body() loginDto: LoginDto): Promise<LoginResponse> {
     return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req): User {
    return req.user;
  }
}