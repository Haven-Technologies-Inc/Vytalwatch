import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DevicesService, TenoviWebhookPayload } from './devices.service';

@Controller('webhooks/tenovi')
export class TenoviWebhookController {
  private readonly logger = new Logger(TenoviWebhookController.name);

  constructor(
    private readonly devicesService: DevicesService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Body() payload: TenoviWebhookPayload,
    @Headers('x-tenovi-signature') signature?: string,
  ) {
    // Verify webhook signature if configured
    const webhookSecret = this.configService.get('tenovi.webhookSecret');

    if (webhookSecret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (signature !== expectedSignature) {
        this.logger.warn('Invalid Tenovi webhook signature');
        throw new UnauthorizedException('Invalid webhook signature');
      }
    }

    this.logger.log(`Received Tenovi webhook: ${payload.event} for device ${payload.device_id}`);

    try {
      await this.devicesService.processTenoviWebhook(payload);
      return { received: true };
    } catch (error) {
      this.logger.error('Error processing Tenovi webhook', error);
      // Still return 200 to prevent retries for processing errors
      return { received: true, error: 'Processing error' };
    }
  }
}
