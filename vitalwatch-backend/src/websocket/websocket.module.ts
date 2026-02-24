/**
 * VitalWatch WebSocket Module
 * Socket.io for real-time dashboard updates
 */

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebSocketGatewayService } from './websocket.gateway';
import { WebSocketService } from './websocket.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    UsersModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: { expiresIn: '15m' as const },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [WebSocketGatewayService, WebSocketService],
  exports: [WebSocketService],
})
export class WebSocketModule {}
