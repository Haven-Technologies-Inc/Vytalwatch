import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { EmergencyAccessController } from './controllers/emergency-access.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SessionTimeoutGuard } from './guards/session-timeout.guard';
import { EmergencyAccessService } from './services/emergency-access.service';
import { AuthSecurityService } from './services/auth-security.service';
import { PasswordValidator } from './validators/password.validator';
import { InviteCode } from './entities/invite-code.entity';
import { UsersModule } from '../users/users.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InviteCode]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.accessTokenExpiry') || '15m',
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    UsersModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [AuthController, EmergencyAccessController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    SessionTimeoutGuard,
    EmergencyAccessService,
    AuthSecurityService,
    PasswordValidator,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    SessionTimeoutGuard,
    EmergencyAccessService,
    AuthSecurityService,
    PasswordValidator,
  ],
})
export class AuthModule {}
