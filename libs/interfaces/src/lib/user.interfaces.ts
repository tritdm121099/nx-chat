export interface User {
  id: number;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}