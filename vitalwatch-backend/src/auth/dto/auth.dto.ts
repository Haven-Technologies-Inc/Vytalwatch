import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../users/entities/user.entity';

export class LoginDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ description: 'User password', example: 'secureP@ssw0rd' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    description: 'User password (min 8 characters)',
    example: 'secureP@ssw0rd',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1234567890' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ description: 'User role', enum: UserRole, default: UserRole.PATIENT })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({ description: 'Organization ID (UUID)' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ description: 'Invite code for non-patient roles' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  inviteCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @ApiProperty({ description: 'New password (min 8 characters)', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class RequestPasswordResetDto {
  @ApiProperty({ description: 'Email address to send the reset link', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'New password (min 8 characters)', minLength: 8 })
  @IsString()
  @MinLength(8)
  newPassword: string;
}

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}

export class VerifySmsDto {
  @ApiProperty({ description: 'Phone number to verify', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ description: 'SMS verification code', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

export class SendSmsCodeDto {
  @ApiProperty({ description: 'Phone number to send the code to', example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class SocialLoginDto {
  @ApiProperty({ description: 'OAuth token from the social provider' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ description: 'Social login provider', enum: ['google', 'microsoft', 'apple'] })
  @IsEnum(['google', 'microsoft', 'apple'])
  @IsNotEmpty()
  provider: 'google' | 'microsoft' | 'apple';
}

export class MagicLinkDto {
  @ApiProperty({ description: 'Email address to send the magic link', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class VerifyMagicLinkDto {
  @ApiProperty({ description: 'Magic link verification token' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
