import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { BillingService } from './billing.service';

@Controller('webhooks')
export class WebhooksController {
  private stripe: Stripe;

  constructor(
    private readonly billingService: BillingService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get('stripe.secretKey');
    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2023-10-16',
      });
    }
  }

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleStripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!this.stripe) {
      throw new BadRequestException('Stripe is not configured');
    }

    const webhookSecret = this.configService.get('stripe.webhookSecret');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(
        req.rawBody as Buffer,
        signature,
        webhookSecret,
      );
    } catch (err) {
      throw new BadRequestException(`Webhook signature verification failed: ${err.message}`);
    }

    await this.billingService.handleStripeWebhook(event);

    return { received: true };
  }
}
