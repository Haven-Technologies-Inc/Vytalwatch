import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class PasswordValidator {
  private readonly policy: PasswordPolicy;

  constructor(private readonly configService: ConfigService) {
    this.policy = {
      minLength: this.configService.get('passwordPolicy.minLength') || 12,
      requireUppercase: this.configService.get('passwordPolicy.requireUppercase') ?? true,
      requireLowercase: this.configService.get('passwordPolicy.requireLowercase') ?? true,
      requireNumbers: this.configService.get('passwordPolicy.requireNumbers') ?? true,
      requireSpecialChars: this.configService.get('passwordPolicy.requireSpecialChars') ?? true,
    };
  }

  validate(password: string): PasswordValidationResult {
    const errors: string[] = [];

    if (!password || password.length < this.policy.minLength) {
      errors.push(`Password must be at least ${this.policy.minLength} characters long`);
    }

    if (this.policy.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (this.policy.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (this.policy.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (this.policy.requireSpecialChars && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    if (this.containsCommonPatterns(password)) {
      errors.push('Password contains common patterns that are not allowed');
    }

    return { valid: errors.length === 0, errors };
  }

  validateOrThrow(password: string): void {
    const result = this.validate(password);
    if (!result.valid) {
      throw new BadRequestException(result.errors.join('. '));
    }
  }

  private containsCommonPatterns(password: string): boolean {
    const commonPatterns = [
      /^123456/,
      /^password/i,
      /^qwerty/i,
      /^abc123/i,
      /(.)\1{3,}/, // Same char 4+ times
      /^(0123|1234|2345|3456|4567|5678|6789)/, // Sequential numbers
    ];

    return commonPatterns.some(pattern => pattern.test(password));
  }

  getPolicy(): PasswordPolicy {
    return { ...this.policy };
  }
}
