import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty({ message: 'Message content cannot be empty' })
  @MaxLength(1000, { message: 'Message content cannot exceed 1000 characters' }) // Example max length
  content!: string;

  @IsInt()
  @IsPositive({ message: 'Conversation ID must be a positive integer' })
  @IsNotEmpty({ message: 'Conversation ID should not be empty' })
  conversationId!: number;
}