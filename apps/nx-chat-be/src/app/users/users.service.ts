import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../core/prisma/prisma.service';
import { User } from '@nx-chat/interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    const { password, ...result } = user;
    return {
      ...result,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    const { password, ...result } = user;
    return {
      ...result,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };
  }

  async searchUsers(query: string, currentUserId: number): Promise<User[]> {
    if (!query?.trim()) {
      return [];
    }
    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { email: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } },
            ],
          },
          {
            id: { not: currentUserId },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 10,
    });
    return users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));
  }
}
