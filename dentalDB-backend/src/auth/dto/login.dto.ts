import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty() @IsEmail() email: string;
  @ApiProperty() @IsString() password: string;
}

export class RefreshTokenDto {
  @ApiProperty() @IsString() userId: string;
  @ApiProperty() @IsString() refreshToken: string;
}
