import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  JwtPayload,
  LoginDto,
  LoginResponse,
  RegisterDto,
  RegisterResponse,
  User,
} from '@nx-chat/interfaces';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../core/prisma/prisma.service';
import { UsersService } from '../users/users.service'; // Assuming UsersService exists

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService // Inject UsersService
  ) {}

  async validateUser(
    email: string,
    pass: string
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return {
        ...result,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      };
    }
    return null;
  }

  async login(user: Omit<User, 'password'>): Promise<LoginResponse> {
    const payload: JwtPayload = { email: user.email, sub: user.id };
    return {
        accessToken: this.jwtService.sign(payload),
        user,
    };
}

  async register(registerDto: RegisterDto): Promise<RegisterResponse> {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        name: registerDto.name,
      },
    });

    const { password, ...userResult } = newUser;

    const payload: JwtPayload = { email: userResult.email, sub: userResult.id };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        ...userResult,
        createdAt: userResult.createdAt.toISOString(),
        updatedAt: userResult.updatedAt.toISOString(),
      },
    };
  }

  // Helper to verify token (used by WebSocket Gateway)
  async verifyToken(token: string): Promise<User | null> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token);
      const user = await this.usersService.findById(payload.sub);
      return user ? user : null;
    } catch (error) {
      return null;
    }
  }
}
