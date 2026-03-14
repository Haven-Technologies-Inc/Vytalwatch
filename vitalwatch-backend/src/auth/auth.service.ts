import { Injectable, UnauthorizedException, BadRequestException, Logger, ForbiddenException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service';
import * as jwksRsa from 'jwks-rsa';
import * as jsonwebtoken from 'jsonwebtoken';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { InviteCode, InviteCodeStatus } from './entities/invite-code.entity';
import { AuditLog } from '../audit/entities/audit-log.entity';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuthSecurityService } from './services/auth-security.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  organizationId?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    organizationId?: string;
    avatar?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 12;

  constructor(
    @InjectRepository(InviteCode)
    private readonly inviteCodeRepository: Repository<InviteCode>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Optional() private readonly notificationsService: NotificationsService,
    private readonly authSecurityService: AuthSecurityService,
    private readonly dataSource: DataSource,
  ) {}

  async validateUser(email: string, password: string, ip?: string): Promise<User | null> {
    // Check rate limiting and account lockout
    const rateLimitCheck = await this.authSecurityService.checkRateLimit(email, ip || 'unknown');
    if (!rateLimitCheck.allowed) {
      throw new ForbiddenException(rateLimitCheck.message || 'Too many login attempts');
    }

    const user = await this.usersService.findByEmail(email);

    if (!user || !user.passwordHash) {
      // Record failed attempt even for non-existent users (prevents enumeration)
      await this.authSecurityService.recordLoginAttempt(email, ip || 'unknown', false);
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      await this.authSecurityService.recordLoginAttempt(email, ip || 'unknown', false);
      await this.auditService.log({
        action: 'LOGIN_FAILED',
        userId: user.id,
        details: { reason: 'Invalid password', remainingAttempts: rateLimitCheck.remainingAttempts - 1 },
      });
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // Record successful login
    await this.authSecurityService.recordLoginAttempt(email, ip || 'unknown', true);

    return user;
  }

  async login(user: User, ip?: string): Promise<LoginResponse> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const tokens = await this.generateTokens(payload);

    // Update last login
    await this.usersService.updateLastLogin(user.id, ip);

    // Audit log
    await this.auditService.log({
      action: 'LOGIN_SUCCESS',
      userId: user.id,
      details: { ip, role: user.role },
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: UserRole;
    phone?: string;
    organizationId?: string;
    inviteCode?: string;
  }): Promise<User> {
    // Check if user exists
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(registerDto.password, this.SALT_ROUNDS);

    // Determine role
    let role = UserRole.PATIENT;
    let organizationId = registerDto.organizationId;

    if (registerDto.role && registerDto.role !== UserRole.PATIENT) {
      // Validate invite code for non-patient roles
      if (!registerDto.inviteCode) {
        throw new BadRequestException('Invite code required for provider accounts');
      }

      // Validate invite code
      const inviteValidation = await this.validateInviteCode(registerDto.inviteCode, registerDto.role);
      if (!inviteValidation.valid) {
        throw new BadRequestException(inviteValidation.error || 'Invalid invite code');
      }

      role = registerDto.role;
      // Use organization from invite code if not provided
      if (inviteValidation.organizationId && !organizationId) {
        organizationId = inviteValidation.organizationId;
      }
    }

    // Wrap user creation + invite code usage + audit log in a single transaction
    const user = await this.dataSource.transaction(async (manager) => {
      // Create user within transaction
      const userRepo = manager.getRepository(User);
      const newUser = userRepo.create({
        email: registerDto.email,
        passwordHash,
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        phone: registerDto.phone,
        role,
        status: UserStatus.ACTIVE,
        organizationId: organizationId,
        verificationToken: this.generateVerificationToken(),
      });
      const savedUser = await userRepo.save(newUser);

      // Use invite code within same transaction
      if (registerDto.inviteCode && role !== UserRole.PATIENT) {
        const inviteRepo = manager.getRepository(InviteCode);
        const inviteCode = await inviteRepo.findOne({
          where: { code: registerDto.inviteCode },
        });

        if (inviteCode) {
          await inviteRepo.update(inviteCode.id, {
            usesCount: inviteCode.usesCount + 1,
            usedById: savedUser.id,
            usedAt: new Date(),
            status: inviteCode.usesCount + 1 >= inviteCode.maxUses
              ? InviteCodeStatus.USED
              : inviteCode.status,
          });
        }
      }

      // Audit log within same transaction
      const auditRepo = manager.getRepository(AuditLog);
      const auditEntry = auditRepo.create({
        action: 'USER_REGISTERED',
        userId: savedUser.id,
        metadata: { role, email: savedUser.email },
      });
      await auditRepo.save(auditEntry);

      return savedUser;
    });

    // Send verification email (non-blocking, outside transaction)
    this.notificationsService.sendEmailVerification(user).catch(err => {
      this.logger.warn(`Failed to send verification email: ${err.message}`);
    });

    return user;
  }

  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async validateOAuthLogin(profile: {
    provider: 'google' | 'microsoft' | 'apple';
    providerId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }): Promise<User> {
    // Check if user exists with this OAuth provider
    let user = await this.usersService.findByOAuthId(profile.provider, profile.providerId);

    if (!user) {
      // Check if user exists with this email
      user = await this.usersService.findByEmail(profile.email);

      if (user) {
        // Link OAuth account to existing user
        await this.usersService.linkOAuthAccount(user.id, profile.provider, profile.providerId);
      } else {
        // Create new user — default to PATIENT for OAuth signup (safest default;
        // providers/admins should be created via invite codes)
        user = await this.usersService.create({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatar: profile.avatar,
          role: UserRole.PATIENT,
          status: UserStatus.ACTIVE, // OAuth users are auto-verified
          emailVerified: true,
          [`${profile.provider}Id`]: profile.providerId,
        });

        await this.auditService.log({
          action: 'OAUTH_REGISTRATION',
          userId: user.id,
          details: { provider: profile.provider },
        });
      }
    }

    return user;
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('jwt.secret'),
      });

      const user = await this.usersService.findById(payload.sub);

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      };

      return this.generateTokens(newPayload);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, token?: string): Promise<void> {
    // Blacklist the token if provided
    if (token) {
      await this.authSecurityService.blacklistToken(token);
    }

    await this.auditService.log({
      action: 'LOGOUT',
      userId,
    });
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findById(userId);

    if (!user || !user.passwordHash) {
      throw new BadRequestException('Cannot change password for OAuth-only accounts');
    }

    const isOldPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);

    if (!isOldPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Check password history
    const historyCheck = await this.authSecurityService.validatePasswordNotReused(userId, newPassword);
    if (!historyCheck.valid) {
      throw new BadRequestException(historyCheck.message);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    
    // Add current password to history before updating
    await this.authSecurityService.addPasswordToHistory(userId, user.passwordHash);
    
    await this.usersService.updatePassword(userId, newPasswordHash);

    // Revoke all existing tokens for security
    await this.authSecurityService.revokeAllUserTokens(userId);

    await this.auditService.log({
      action: 'PASSWORD_CHANGED',
      userId,
    });
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = uuidv4();
    await this.usersService.setResetToken(user.id, resetToken);
    await this.notificationsService.sendPasswordResetEmail(user, resetToken);

    await this.auditService.log({
      action: 'PASSWORD_RESET_REQUESTED',
      userId: user.id,
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByResetToken(token);

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check password history
    const historyCheck = await this.authSecurityService.validatePasswordNotReused(user.id, newPassword);
    if (!historyCheck.valid) {
      throw new BadRequestException(historyCheck.message);
    }

    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    
    // Add current password to history if it exists
    if (user.passwordHash) {
      await this.authSecurityService.addPasswordToHistory(user.id, user.passwordHash);
    }
    
    await this.usersService.updatePassword(user.id, newPasswordHash);
    await this.usersService.clearResetToken(user.id);

    // Revoke all existing tokens for security
    await this.authSecurityService.revokeAllUserTokens(user.id);

    await this.auditService.log({
      action: 'PASSWORD_RESET_COMPLETED',
      userId: user.id,
    });
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.emailVerified) {
      // Don't reveal if user exists or is already verified
      return;
    }

    // Generate a new verification token
    const newToken = this.generateVerificationToken();
    await this.usersService.setVerificationToken(user.id, newToken);

    // Send verification email (non-blocking)
    const updatedUser = { ...user, verificationToken: newToken };
    this.notificationsService.sendEmailVerification(updatedUser as any).catch(err => {
      this.logger.warn(`Failed to resend verification email: ${err.message}`);
    });
  }

  async verifyEmail(token: string): Promise<void> {
    const user = await this.usersService.findByVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    await this.usersService.verifyEmail(user.id);

    await this.auditService.log({
      action: 'EMAIL_VERIFIED',
      userId: user.id,
    });

    // Send welcome email after successful verification (non-blocking)
    if (this.notificationsService) {
      this.notificationsService.sendWelcomeNotification(user).catch(err => {
        this.logger.warn(`Failed to send welcome email after verification: ${err.message}`);
      });
    }
  }

  private async generateTokens(payload: JwtPayload): Promise<TokenPair> {
    const accessTokenExpiry = this.configService.get('jwt.accessTokenExpiry');
    const refreshTokenExpiry = this.configService.get('jwt.refreshTokenExpiry');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: accessTokenExpiry,
      }),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          expiresIn: refreshTokenExpiry,
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseExpiry(accessTokenExpiry),
    };
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) return 900; // Default 15 minutes

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 900;
    }
  }

  async sendSmsVerificationCode(phone: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with expiry (5 minutes)
    await this.usersService.setSmsVerificationCode(phone, code);
    
    // Send via Twilio
    await this.notificationsService.sendSmsVerificationCode(phone, code);
  }

  async verifySmsCode(phone: string, code: string): Promise<void> {
    const isValid = await this.usersService.verifySmsCode(phone, code);
    
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    await this.usersService.markPhoneVerified(phone);
  }

  async validateSocialLogin(provider: 'google' | 'microsoft' | 'apple', token: string): Promise<User> {
    let profile: { providerId: string; email: string; firstName: string; lastName: string; avatar?: string };

    switch (provider) {
      case 'google':
        profile = await this.verifyGoogleToken(token);
        break;
      case 'microsoft':
        profile = await this.verifyMicrosoftToken(token);
        break;
      case 'apple':
        profile = await this.verifyAppleToken(token);
        break;
      default:
        throw new BadRequestException('Invalid provider');
    }

    return this.validateOAuthLogin({ provider, ...profile });
  }

  private async verifyGoogleToken(token: string): Promise<{ providerId: string; email: string; firstName: string; lastName: string; avatar?: string }> {
    // In production, verify with Google OAuth API
    // For now, decode the token (assuming it's a JWT from Google)
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
      const data = await response.json();
      
      if (!data.email) {
        throw new BadRequestException('Invalid Google token');
      }

      return {
        providerId: data.sub,
        email: data.email,
        firstName: data.given_name || '',
        lastName: data.family_name || '',
        avatar: data.picture,
      };
    } catch {
      throw new BadRequestException('Failed to verify Google token');
    }
  }

  private async verifyMicrosoftToken(token: string): Promise<{ providerId: string; email: string; firstName: string; lastName: string; avatar?: string }> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (!data.mail && !data.userPrincipalName) {
        throw new BadRequestException('Invalid Microsoft token');
      }

      return {
        providerId: data.id,
        email: data.mail || data.userPrincipalName,
        firstName: data.givenName || '',
        lastName: data.surname || '',
      };
    } catch {
      throw new BadRequestException('Failed to verify Microsoft token');
    }
  }

  private async verifyAppleToken(token: string): Promise<{ providerId: string; email: string; firstName: string; lastName: string }> {
    try {
      // Dynamic imports for optional Apple auth dependencies
      const jwksRsaModule = await import('jwks-rsa');
      const jwtModule = await import('jsonwebtoken');

      // Decode header to get the key ID (kid)
      const decodedHeader = jwtModule.decode(token, { complete: true });
      if (!decodedHeader || typeof decodedHeader === 'string' || !decodedHeader.header?.kid) {
        throw new BadRequestException('Invalid Apple token format');
      }

      // Fetch Apple's public keys and verify the signature
      const jwksClient = (jwksRsaModule as any).default || jwksRsaModule;
      const client = jwksClient({
        jwksUri: 'https://appleid.apple.com/auth/keys',
        cache: true,
        cacheMaxAge: 86400000, // 24 hours
      });

      const signingKey = await client.getSigningKey(decodedHeader.header.kid);
      const publicKey = signingKey.getPublicKey();

      // Verify the token with Apple's public key
      const verified = jwtModule.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: 'https://appleid.apple.com',
        audience: this.configService.get('oauth.apple.clientId'),
      });

      if (!verified || typeof verified === 'string' || !verified.sub) {
        throw new BadRequestException('Invalid Apple token');
      }

      return {
        providerId: verified.sub,
        email: (verified as any).email || '',
        firstName: (verified as any).firstName || '',
        lastName: (verified as any).lastName || '',
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Apple token verification failed: ${error.message}`);
      throw new BadRequestException('Failed to verify Apple token');
    }
  }

  async sendMagicLink(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const magicToken = uuidv4();
    await this.usersService.setMagicLinkToken(user.id, magicToken);
    await this.notificationsService.sendMagicLinkEmail(user, magicToken);

    await this.auditService.log({
      action: 'MAGIC_LINK_REQUESTED',
      userId: user.id,
    });
  }

  async verifyMagicLink(token: string): Promise<User> {
    const user = await this.usersService.findByMagicLinkToken(token);
    
    if (!user) {
      throw new BadRequestException('Invalid or expired magic link');
    }

    await this.usersService.clearMagicLinkToken(user.id);

    await this.auditService.log({
      action: 'MAGIC_LINK_LOGIN',
      userId: user.id,
    });

    return user;
  }

  async getCurrentUser(userId: string): Promise<Partial<User>> {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Return user without sensitive data
    const { passwordHash: _passwordHash, resetToken: _resetToken, verificationToken: _verificationToken, magicLinkToken: _magicLinkToken, ...safeUser } = user as any;
    return safeUser;
  }

  async getInviteInfo(code: string): Promise<{ valid: boolean; role?: string; email?: string; organizationId?: string; error?: string }> {
    const inviteCode = await this.inviteCodeRepository.findOne({ where: { code } });
    if (!inviteCode) {
      return { valid: false, error: 'Invalid invite code' };
    }
    if (!inviteCode.isValid()) {
      return { valid: false, error: 'Invite code is no longer valid' };
    }
    return {
      valid: true,
      role: inviteCode.allowedRole,
      organizationId: inviteCode.organizationId || undefined,
    };
  }

  async validateInviteCode(
    code: string,
    requestedRole: UserRole,
  ): Promise<{ valid: boolean; error?: string; organizationId?: string }> {
    try {
      const inviteCode = await this.inviteCodeRepository.findOne({
        where: { code },
      });

      if (!inviteCode) {
        return { valid: false, error: 'Invalid invite code' };
      }

      if (!inviteCode.isValid()) {
        if (inviteCode.status === InviteCodeStatus.USED) {
          return { valid: false, error: 'Invite code has already been used' };
        }
        if (inviteCode.status === InviteCodeStatus.EXPIRED) {
          return { valid: false, error: 'Invite code has expired' };
        }
        if (inviteCode.status === InviteCodeStatus.REVOKED) {
          return { valid: false, error: 'Invite code has been revoked' };
        }
        if (inviteCode.expiresAt && new Date() > inviteCode.expiresAt) {
          await this.inviteCodeRepository.update(inviteCode.id, {
            status: InviteCodeStatus.EXPIRED,
          });
          return { valid: false, error: 'Invite code has expired' };
        }
        if (inviteCode.usesCount >= inviteCode.maxUses) {
          return { valid: false, error: 'Invite code has reached maximum uses' };
        }
      }

      // Check if the invite code allows the requested role
      if (inviteCode.allowedRole !== requestedRole) {
        return {
          valid: false,
          error: `This invite code is for ${inviteCode.allowedRole} accounts only`,
        };
      }

      this.logger.log(`Invite code ${code} validated successfully`);
      return { valid: true, organizationId: inviteCode.organizationId };
    } catch (error) {
      this.logger.error(`Error validating invite code: ${error.message}`);
      return { valid: false, error: 'Error validating invite code' };
    }
  }

  async useInviteCode(code: string, userId: string): Promise<void> {
    const inviteCode = await this.inviteCodeRepository.findOne({
      where: { code },
    });

    if (inviteCode) {
      await this.inviteCodeRepository.update(inviteCode.id, {
        usesCount: inviteCode.usesCount + 1,
        usedById: userId,
        usedAt: new Date(),
        status: inviteCode.usesCount + 1 >= inviteCode.maxUses
          ? InviteCodeStatus.USED
          : inviteCode.status,
      });

      await this.auditService.log({
        action: 'INVITE_CODE_USED',
        userId,
        details: { inviteCodeId: inviteCode.id, code },
      });
    }
  }

  async createInviteCode(
    creatorId: string,
    options: {
      allowedRole: UserRole;
      organizationId?: string;
      maxUses?: number;
      expiresInDays?: number;
      description?: string;
    },
  ): Promise<InviteCode> {
    const code = this.generateInviteCode();
    
    const inviteCode = this.inviteCodeRepository.create({
      code,
      allowedRole: options.allowedRole,
      organizationId: options.organizationId,
      createdById: creatorId,
      maxUses: options.maxUses || 1,
      expiresAt: options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : null,
      description: options.description,
    });

    const saved = await this.inviteCodeRepository.save(inviteCode);

    await this.auditService.log({
      action: 'INVITE_CODE_CREATED',
      userId: creatorId,
      details: { inviteCodeId: saved.id, allowedRole: options.allowedRole },
    });

    return saved;
  }

  async revokeInviteCode(codeId: string, userId: string): Promise<void> {
    await this.inviteCodeRepository.update(codeId, {
      status: InviteCodeStatus.REVOKED,
    });

    await this.auditService.log({
      action: 'INVITE_CODE_REVOKED',
      userId,
      details: { inviteCodeId: codeId },
    });
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.randomBytes(8);
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(bytes[i] % chars.length);
    }
    return code;
  }
}
