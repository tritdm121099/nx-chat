import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@nx-chat/interfaces';
import { Socket } from 'socket.io';
import { UsersService } from '../../users/users.service';

@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient<Socket>();
    const token = this.extractTokenFromSocket(client);

    if (!token) {
      this.logger.warn(`Client ${client.id} - No token provided for WebSocket.`);
      this.disconnectClient(client, 'Authentication token not provided.');
      return false;
    }

    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.userService.findById(payload.sub);
      if (!user) {
        this.logger.warn(`Client ${client.id} - User not found for token sub: ${payload.sub}`);
        this.disconnectClient(client, 'User not found.');
        return false;
      }

      client.data.user = user;
      this.logger.verbose(`Client ${client.id} authenticated via WsJwtAuthGuard for user ${user.email}`);
      return true;
    } catch (error) {
      this.logger.warn(`Client ${client.id} - Token validation failed: ${error.message}`);
      this.disconnectClient(client, `Authentication error: ${error.message}`);
      return false;
    }
  }

  private extractTokenFromSocket(client: Socket): string | null {
    let token = client.handshake.auth?.token;

    if (!token && client.handshake.query && typeof client.handshake.query.token === 'string') {
      token = client.handshake.query.token;
    }

    if (!token && client.handshake.headers?.authorization) {
      const authHeader = client.handshake.headers.authorization;
      if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    return token || null;
  }

  private disconnectClient(client: Socket, message: string) {
    client.emit('error', { message });
    client.disconnect(true);
  }
}