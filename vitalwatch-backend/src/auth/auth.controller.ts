import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Ip,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser, CurrentUserPayload } from './decorators/current-user.decorator';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  VerifyEmailDto,
  VerifySmsDto,
  SendSmsCodeDto,
  SocialLoginDto,
  MagicLinkDto,
  VerifyMagicLinkDto,
} from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Ip() ip: string) {
    const user = await this.authService.validateUser(dto.email, dto.password, ip);

    if (!user) {
      throw new BadRequestException('Invalid email or password');
    }

    return this.authService.login(user, ip);
  }

  @Public()
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const user = await this.authService.register(dto);

    // Return user without sensitive data
    const { passwordHash, resetToken, verificationToken, ...safeUser } = user as any;
    return safeUser;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@CurrentUser() user: CurrentUserPayload) {
    await this.authService.logout(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(user.sub, dto.oldPassword, dto.newPassword);
  }

  @Public()
  @Post('request-password-reset')
  @HttpCode(HttpStatus.OK)
  async requestPasswordReset(@Body() dto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(dto.email);
    return { message: 'If an account exists with this email, a reset link has been sent.' };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
    return { message: 'Password reset successful' };
  }

  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto.token);
    return { message: 'Email verified successfully' };
  }

  @Public()
  @Post('send-sms-code')
  @HttpCode(HttpStatus.OK)
  async sendSmsCode(@Body() dto: SendSmsCodeDto) {
    await this.authService.sendSmsVerificationCode(dto.phone);
    return { message: 'Verification code sent' };
  }

  @Public()
  @Post('verify-sms')
  @HttpCode(HttpStatus.OK)
  async verifySms(@Body() dto: VerifySmsDto) {
    await this.authService.verifySmsCode(dto.phone, dto.code);
    return { message: 'Phone verified successfully' };
  }

  @Public()
  @Post('social/google')
  @HttpCode(HttpStatus.OK)
  async googleLogin(@Body() dto: SocialLoginDto, @Ip() ip: string) {
    const user = await this.authService.validateSocialLogin('google', dto.token);
    return this.authService.login(user, ip);
  }

  @Public()
  @Post('social/microsoft')
  @HttpCode(HttpStatus.OK)
  async microsoftLogin(@Body() dto: SocialLoginDto, @Ip() ip: string) {
    const user = await this.authService.validateSocialLogin('microsoft', dto.token);
    return this.authService.login(user, ip);
  }

  @Public()
  @Post('social/apple')
  @HttpCode(HttpStatus.OK)
  async appleLogin(@Body() dto: SocialLoginDto, @Ip() ip: string) {
    const user = await this.authService.validateSocialLogin('apple', dto.token);
    return this.authService.login(user, ip);
  }

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body() dto: MagicLinkDto) {
    await this.authService.sendMagicLink(dto.email);
    return { message: 'If an account exists, a magic link has been sent' };
  }

  @Public()
  @Post('magic-link/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMagicLink(@Body() dto: VerifyMagicLinkDto, @Ip() ip: string) {
    const user = await this.authService.verifyMagicLink(dto.token);
    return this.authService.login(user, ip);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getCurrentUser(user.sub);
  }
}
