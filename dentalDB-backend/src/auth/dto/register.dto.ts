import {
  IsEmail, IsString, MinLength, MaxLength,
  IsOptional, IsEnum, Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

// ── Password rules ─────────────────────────────────────────────────────────
// Healthcare data warrants a meaningful password policy.
// Rules:
//   • 8–72 chars  (72 = bcrypt input cap)
//   • at least one uppercase letter
//   • at least one lowercase letter
//   • at least one digit
//   • at least one special character
//
// We intentionally avoid blocking specific patterns (e.g. "no spaces") so we
// don't accidentally prevent passphrases, which are often stronger.

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{8,72}$/;

const PASSWORD_MESSAGE =
  'Password must be 8–72 characters and include at least one uppercase letter, ' +
  'one lowercase letter, one number, and one special character (e.g. !@#$%).';

// Common passwords that pass the regex above but are trivially guessable.
// Expand this list as needed or replace with a proper HIBP/zxcvbn check.
const COMMON_PASSWORDS = new Set([
  'Password1!', 'Password1@', 'Password123!', 'Passw0rd!',
  'Admin123!', 'Welcome1!', 'Qwerty123!', 'Letmein1!',
  'Clinic123!', 'Doctor123!', 'Hospital1!',
]);

// Custom decorator for common-password check
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsNotCommonPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotCommonPassword',
      target: (object as any).constructor,
      propertyName,
      options: {
        message: 'This password is too common. Please choose a more unique password.',
        ...validationOptions,
      },
      validator: {
        validate(value: any, _args: ValidationArguments) {
          return typeof value === 'string' && !COMMON_PASSWORDS.has(value);
        },
      },
    });
  };
}

export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({
    description: PASSWORD_MESSAGE,
    example: 'MyClinic@2024',
  })
  @IsString()
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  @IsNotCommonPassword()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  clinicName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clinicId?: string;

  @ApiProperty({ required: false, enum: UserRole })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}