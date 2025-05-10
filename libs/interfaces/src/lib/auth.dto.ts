import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; 

export class LoginDto {
  @ApiProperty({ example: 'test@example.com' })
  @IsEmail({}, { message: 'Email must be a valid email address' })
  @IsNotEmpty({ message: 'Email should not be empty' })
  email!: string;
 
  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty({ message: 'Password should not be empty' })
  password!: string;
}

export class RegisterDto extends LoginDto {
  @ApiProperty({ example: 'Your Name' })
  @IsString()
  @IsNotEmpty({ message: 'Name should not be empty' })
  name!: string;
}

