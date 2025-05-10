import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // Optional

export class CreatePrivateConversationDto {
  @ApiProperty({ example: 2, description: 'ID of the user to start a conversation with' }) // Optional
  @IsInt()
  @IsPositive({ message: 'User ID must be a positive integer' })
  @IsNotEmpty({ message: 'User ID should not be empty' })
  userId!: number;
}