import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AIService } from './ai.service';
import { AIEnhancedService } from './ai-enhanced.service';
import { AIController } from './ai.controller';
import { AIEnhancedController } from './ai-enhanced.controller';
import { AIStreamingGateway } from './ai-streaming.gateway';
import { AIConversation } from './entities/ai-conversation.entity';
import { AIMessage } from './entities/ai-message.entity';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([AIConversation, AIMessage]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'vitalwatch-secret-key-change-in-production',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AIController, AIEnhancedController],
  providers: [
    AIService,
    AIEnhancedService,
    AIStreamingGateway,
    WsJwtGuard,
  ],
  exports: [AIService, AIEnhancedService],
})
export class AIModule {}
