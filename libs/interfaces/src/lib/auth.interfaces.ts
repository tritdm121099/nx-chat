import { User } from './user.interfaces';

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterResponse {
  accessToken: string;
  user: User;
}

export interface JwtPayload {
  sub: number; // userId
  email: string;
}
